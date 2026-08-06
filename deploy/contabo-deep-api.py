#!/usr/bin/env python3
"""
SynSight Contabo Free DemoScanner API — secured server-to-server edge service.

Public SynSight visitors never call this service directly. The SynSight web
server calls it with a private API key. Recommended production protection:

1. Contabo firewall/UFW permits port 5002 only from the SynSight server IP.
2. ALLOWED_CLIENT_IPS contains the SynSight server IP (defence in depth).
3. Every /api/scan and /api/health request requires the API key.
4. CORS is intentionally disabled.
5. Result persistence is disabled by default.

Free scan checks:
  - email account correlation
  - prioritised public username correlation
  - public telephone exposure plus secondary technical metadata

Internal provider names remain implementation details and are not displayed by
the SynSight public frontend.
"""

from __future__ import annotations

import hmac
import ipaddress
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(
    name: str,
    default: int,
    minimum: int = 1,
    maximum: int = 1_000_000,
) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


API_KEY = os.environ.get("API_KEY", "").strip()
API_BIND = os.environ.get("API_BIND", "0.0.0.0").strip() or "0.0.0.0"
API_PORT = env_int("API_PORT", 5002, 1, 65535)
MAX_BODY_BYTES = env_int("MAX_BODY_BYTES", 16 * 1024, 1024, 256 * 1024)
MAX_QUERY_LENGTH = env_int("MAX_QUERY_LENGTH", 160, 20, 500)
MAX_CONCURRENT_SCANS = env_int("MAX_CONCURRENT_SCANS", 2, 1, 16)
REQUIRE_CLIENT_ALLOWLIST = env_bool("REQUIRE_CLIENT_ALLOWLIST", False)
HEALTH_VERBOSE = env_bool("HEALTH_VERBOSE", False)
PERSIST_RESULTS = env_bool("PERSIST_RESULTS", False)
RESULT_PATH = Path(os.environ.get("RESULT_PATH", "/tmp/synsight_results"))

HOLEHE_TIMEOUT = env_int("HOLEHE_TIMEOUT", 45, 5, 180)

MAIGRET_TIMEOUT = env_int("MAIGRET_TIMEOUT", 45, 10, 180)
MAIGRET_TOP_SITES = env_int("MAIGRET_TOP_SITES", 100, 20, 500)
MAIGRET_SITE_TIMEOUT = env_int("MAIGRET_SITE_TIMEOUT", 6, 2, 20)
MAIGRET_MAX_CONNECTIONS = env_int("MAIGRET_MAX_CONNECTIONS", 20, 2, 100)
MAIGRET_RETRIES = env_int("MAIGRET_RETRIES", 0, 0, 3)
MAIGRET_MAX_RESULTS = env_int("MAIGRET_MAX_RESULTS", 12, 1, 40)

PHONE_TIMEOUT = env_int("PHONEINFOGA_TIMEOUT", 25, 5, 120)
SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8080").strip().rstrip("/")
SEARXNG_TIMEOUT = env_int("SEARXNG_TIMEOUT", 12, 3, 30)
PHONE_SEARCH_MAX_QUERIES = env_int("PHONE_SEARCH_MAX_QUERIES", 2, 1, 2)
PHONE_SEARCH_MAX_RESULTS = env_int("PHONE_SEARCH_MAX_RESULTS", 8, 1, 20)
PHONE_SEARCH_CACHE_TTL = env_int("PHONE_SEARCH_CACHE_TTL", 21600, 60, 86400)
PHONE_SEARCH_SECOND_QUERY_THRESHOLD = env_int(
    "PHONE_SEARCH_SECOND_QUERY_THRESHOLD", 3, 0, 10
)

EXTRA_BIN_DIRS = [
    p
    for p in os.environ.get(
        "TOOL_PATH",
        "/usr/local/bin:/usr/bin:/root/.local/bin:/opt/bin:/app",
    ).split(":")
    if p
]

ALLOWED_MODULES = {"holehe", "maigret", "phoneinfoga"}
SCAN_SLOTS = threading.BoundedSemaphore(MAX_CONCURRENT_SCANS)
PHONE_CACHE_LOCK = threading.Lock()
PHONE_SEARCH_CACHE: dict[str, dict[str, Any]] = {}


def parse_allowed_networks(raw: str) -> list[ipaddress._BaseNetwork]:
    networks: list[ipaddress._BaseNetwork] = []
    for entry in raw.split(","):
        value = entry.strip()
        if not value:
            continue
        try:
            networks.append(ipaddress.ip_network(value, strict=False))
        except ValueError as exc:
            raise RuntimeError(
                f"Ungültiger Eintrag in ALLOWED_CLIENT_IPS: {value}"
            ) from exc
    return networks


ALLOWED_CLIENT_NETWORKS = parse_allowed_networks(
    os.environ.get("ALLOWED_CLIENT_IPS", "")
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES
app.config["JSON_SORT_KEYS"] = False


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalized_remote_ip() -> ipaddress._BaseAddress | None:
    raw = (request.remote_addr or "").strip()
    if raw.startswith("::ffff:"):
        raw = raw[7:]
    try:
        return ipaddress.ip_address(raw)
    except ValueError:
        return None


def client_allowed() -> bool:
    if not ALLOWED_CLIENT_NETWORKS:
        return not REQUIRE_CLIENT_ALLOWLIST
    remote = normalized_remote_ip()
    return bool(remote and any(remote in network for network in ALLOWED_CLIENT_NETWORKS))


def supplied_api_key() -> str:
    auth = (request.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    header_key = (request.headers.get("X-API-Key") or "").strip()
    return header_key or auth


def check_auth() -> bool:
    candidate = supplied_api_key()
    return bool(API_KEY and candidate and hmac.compare_digest(candidate, API_KEY))


@app.before_request
def enforce_edge_access():
    if not client_allowed():
        return jsonify({"status": "error", "error": "Forbidden"}), 403
    return None


@app.after_request
def secure_response(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers.pop("Access-Control-Allow-Origin", None)
    return response


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"status": "error", "error": "Request too large"}), 413


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"status": "error", "error": "Not found"}), 404


def resolve_bin(name: str, env_key: str = "") -> list[str] | None:
    if env_key and os.environ.get(env_key):
        path = os.environ[env_key].strip()
        if Path(path).exists():
            return ["python3", path] if path.endswith(".py") else [path]

    found = shutil.which(name)
    if found:
        return [found]

    for directory in EXTRA_BIN_DIRS:
        candidate = Path(directory) / name
        if candidate.exists() and os.access(candidate, os.X_OK):
            return [str(candidate)]
        py = Path(directory) / f"{name}.py"
        if py.exists():
            return ["python3", str(py)]

    try:
        probe = subprocess.run(
            ["python3", "-c", f"import {name}"],
            capture_output=True,
            timeout=5,
            check=False,
        )
        if probe.returncode == 0:
            return ["python3", "-m", name]
    except Exception:
        pass

    return None


def searxng_configured() -> bool:
    parsed = urlparse(SEARXNG_URL)
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname)


def tool_readiness() -> dict[str, bool]:
    return {
        "email": bool(resolve_bin("holehe", "HOLEHE_BIN")),
        "username": bool(resolve_bin("maigret", "MAIGRET_BIN")),
        "phone_metadata": bool(resolve_bin("phoneinfoga", "PHONEINFOGA_BIN")),
        "phone_public_search": searxng_configured(),
    }


def missing_tool(source: str) -> list[dict[str, Any]]:
    return [
        {
            "source": source,
            "category": "ERROR",
            "title": "Prüfschritt nicht verfügbar",
            "description": "Der angeforderte Prüfschritt ist serverseitig nicht bereit.",
            "risk": "low",
            "confidence": 0,
        }
    ]


def clean_line(text: str) -> str:
    ansi = re.compile(r"\x1b\[[0-9;]*m")
    return ansi.sub("", text).strip()


def clean_query(value: Any) -> str:
    query = re.sub(r"\s+", " ", str(value or "")).strip()
    return query if 2 <= len(query) <= MAX_QUERY_LENGTH else ""


def detect_legacy_query(target: str) -> dict[str, str]:
    value = clean_query(target)
    if not value:
        return {}
    if value.startswith("+") or re.match(r"^\d[\d\s()-]{6,}$", value):
        return {"phone": value}
    if "@" in value:
        return {"email": value}
    return {"username": value}


def collect_targets(data: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key in ("email", "username", "phone"):
        value = clean_query(data.get(key))
        if value:
            out[key] = value
    if not out and data.get("query"):
        out.update(detect_legacy_query(str(data["query"])))
    return out


def normalize_module(raw: str) -> str:
    key = (raw or "").strip().lower().replace("_", "").replace("-", "")
    aliases = {
        "holehe": "holehe",
        "email": "holehe",
        "maigret": "maigret",
        "username": "maigret",
        "user": "maigret",
        "phoneinfoga": "phoneinfoga",
        "phone": "phoneinfoga",
        "tel": "phoneinfoga",
        "telefon": "phoneinfoga",
    }
    return aliases.get(key, "")


def success_outcome(
    findings: list[dict[str, Any]],
    *,
    partial: bool = False,
    notices: list[str] | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "findings": findings,
        "partial": partial,
        "notices": notices or [],
        "meta": meta or {},
    }


def error_finding(source: str, message: str) -> dict[str, Any]:
    return {
        "source": source,
        "category": "ERROR",
        "error": message,
        "risk": "low",
        "confidence": 0,
    }


def run_holehe(email: str) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("holehe", "HOLEHE_BIN")
    if not bin_cmd:
        return success_outcome(missing_tool("holehe"), partial=True)
    try:
        result = subprocess.run(
            [*bin_cmd, email, "--only-used"],
            capture_output=True,
            text=True,
            timeout=HOLEHE_TIMEOUT,
            check=False,
        )
        for line in result.stdout.splitlines():
            line = clean_line(line)
            if "[+]" in line:
                platform = line.replace("[+]", "").strip()
                if platform and "Rate limit" not in platform:
                    findings.append(
                        {
                            "source": "holehe",
                            "category": "EMAIL",
                            "type": "ACCOUNT",
                            "platform": platform,
                            "title": f"Account · {platform}",
                            "description": f"Öffentliches Kontosignal auf {platform}.",
                            "risk": "medium",
                            "confidence": 80,
                        }
                    )
        if not findings and result.returncode != 0:
            findings.append(
                error_finding(
                    "holehe", "Prüfschritt konnte nicht abgeschlossen werden."
                )
            )
            return success_outcome(findings, partial=True)
        return success_outcome(findings)
    except subprocess.TimeoutExpired:
        return success_outcome(
            [error_finding("holehe", "Prüfschritt hat das Zeitlimit erreicht.")],
            partial=True,
        )
    except Exception:
        return success_outcome(
            [error_finding("holehe", "Prüfschritt konnte nicht abgeschlossen werden.")],
            partial=True,
        )


def parse_maigret_report(report_path: Path) -> list[dict[str, Any]]:
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(payload, dict):
        return []

    findings: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for site_name, raw in payload.items():
        if not isinstance(raw, dict):
            continue
        url = str(raw.get("url_user") or raw.get("url") or "").strip()
        if not url.startswith(("http://", "https://")) or url in seen_urls:
            continue
        seen_urls.add(url)
        site = str(site_name or "Öffentliche Plattform").strip()
        findings.append(
            {
                "source": "maigret",
                "category": "USERNAME",
                "type": "PUBLIC_PROFILE",
                "platform": site,
                "url": url,
                "title": f"Profilspur · {site}",
                "description": (
                    "Dieser Benutzername wurde unter anderem auf dieser "
                    "öffentlich erreichbaren Plattform gefunden."
                ),
                "risk": "medium",
                "confidence": 78,
            }
        )
    return findings


def parse_maigret_stdout(stdout: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for line in stdout.splitlines():
        line = clean_line(line)
        for url in re.findall(r"https?://[^\s\]\)>]+", line):
            clean_url = url.rstrip(",.;)")
            if clean_url in seen_urls:
                continue
            seen_urls.add(clean_url)
            domain = urlparse(clean_url).hostname or "Öffentliche Plattform"
            findings.append(
                {
                    "source": "maigret",
                    "category": "USERNAME",
                    "type": "PUBLIC_PROFILE",
                    "platform": domain,
                    "url": clean_url,
                    "title": f"Profilspur · {domain}",
                    "description": (
                        "Dieser Benutzername wurde unter anderem auf dieser "
                        "öffentlich erreichbaren Plattform gefunden."
                    ),
                    "risk": "medium",
                    "confidence": 65,
                }
            )
    return findings


def run_maigret(username: str) -> dict[str, Any]:
    bin_cmd = resolve_bin("maigret", "MAIGRET_BIN")
    if not bin_cmd:
        return success_outcome(missing_tool("maigret"), partial=True)

    try:
        with tempfile.TemporaryDirectory(prefix="synsight-maigret-") as temp_dir:
            command = [
                *bin_cmd,
                username,
                "--top-sites",
                str(MAIGRET_TOP_SITES),
                "--timeout",
                str(MAIGRET_SITE_TIMEOUT),
                "--retries",
                str(MAIGRET_RETRIES),
                "--max-connections",
                str(MAIGRET_MAX_CONNECTIONS),
                "--no-recursion",
                "--no-extracting",
                "--no-autoupdate",
                "--no-color",
                "--no-progressbar",
                "--json",
                "simple",
                "--folderoutput",
                temp_dir,
            ]
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=MAIGRET_TIMEOUT,
                check=False,
            )

            findings: list[dict[str, Any]] = []
            for report in sorted(Path(temp_dir).glob("*_simple.json")):
                findings.extend(parse_maigret_report(report))

            if not findings:
                findings = parse_maigret_stdout(result.stdout or "")

            unique: list[dict[str, Any]] = []
            seen_urls: set[str] = set()
            for finding in findings:
                url = str(finding.get("url") or "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                unique.append(finding)

            partial = result.returncode != 0 and not unique
            notices = []
            if partial:
                notices.append("Die Username-Prüfung konnte nur teilweise abgeschlossen werden.")
            return success_outcome(
                unique[:MAIGRET_MAX_RESULTS],
                partial=partial,
                notices=notices,
                meta={
                    "scope": "prioritised",
                    "sites_requested": MAIGRET_TOP_SITES,
                    "result_limit": MAIGRET_MAX_RESULTS,
                },
            )
    except subprocess.TimeoutExpired:
        return success_outcome(
            [error_finding("maigret", "Username-Prüfung hat das Zeitlimit erreicht.")],
            partial=True,
            notices=["Die Username-Prüfung wurde wegen des Zeitlimits verkürzt."],
        )
    except Exception:
        return success_outcome(
            [error_finding("maigret", "Username-Prüfung konnte nicht abgeschlossen werden.")],
            partial=True,
        )


def run_phoneinfoga_metadata(number: str) -> dict[str, Any]:
    bin_cmd = resolve_bin("phoneinfoga", "PHONEINFOGA_BIN")
    if not bin_cmd:
        return success_outcome(missing_tool("phoneinfoga"), partial=True)
    try:
        result = subprocess.run(
            [*bin_cmd, "scan", "-n", number],
            capture_output=True,
            text=True,
            timeout=PHONE_TIMEOUT,
            check=False,
        )
        output = clean_line((result.stdout or "").strip())
        if output:
            return success_outcome(
                [
                    {
                        "source": "phoneinfoga",
                        "category": "PHONE_METADATA",
                        "type": "TECHNICAL_CONTEXT",
                        "title": "Technischer Rufnummernkontext",
                        "description": (
                            "Sekundäre technische Hinweise zur Schreibweise, "
                            "Länderzuordnung oder Netzstruktur der Rufnummer."
                        ),
                        "raw": output[:2000],
                        "risk": "low",
                        "confidence": 55,
                    }
                ]
            )
        if result.returncode != 0:
            return success_outcome(
                [
                    error_finding(
                        "phoneinfoga",
                        "Technische Zusatzprüfung konnte nicht abgeschlossen werden.",
                    )
                ],
                partial=True,
            )
        return success_outcome([])
    except subprocess.TimeoutExpired:
        return success_outcome(
            [
                error_finding(
                    "phoneinfoga", "Technische Zusatzprüfung hat das Zeitlimit erreicht."
                )
            ],
            partial=True,
        )
    except Exception:
        return success_outcome(
            [
                error_finding(
                    "phoneinfoga",
                    "Technische Zusatzprüfung konnte nicht abgeschlossen werden.",
                )
            ],
            partial=True,
        )


def normalize_phone_variants(number: str) -> list[str]:
    raw = number.strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 7:
        return []

    e164 = ""
    national = ""

    if raw.startswith("+"):
        e164 = f"+{digits}"
    elif digits.startswith("00") and len(digits) > 4:
        e164 = f"+{digits[2:]}"
    elif digits.startswith("0"):
        national = digits
        e164 = f"+49{digits[1:]}"
    else:
        e164 = f"+{digits}"

    e164_digits = re.sub(r"\D", "", e164)
    if e164_digits.startswith("49") and len(e164_digits) > 4:
        national = f"0{e164_digits[2:]}"

    variants: list[str] = []
    for value in (e164, national):
        if value and value not in variants:
            variants.append(value)
    return variants[:PHONE_SEARCH_MAX_QUERIES]


def canonical_public_url(value: str) -> str:
    try:
        parsed = urlparse(value.strip())
    except Exception:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return ""
    clean_query = [
        (key, val)
        for key, val in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith(("utm_", "ref", "source"))
    ]
    return urlunparse(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or "/",
            "",
            urlencode(clean_query),
            "",
        )
    )


def classify_public_phone_result(url: str, title: str, content: str) -> str:
    text = f"{url} {title} {content}".lower()
    if re.search(r"\.pdf(?:$|\?)|filetype\s*pdf|pdf\b", text):
        return "DOCUMENT"
    if re.search(r"facebook|instagram|linkedin|xing|tiktok|twitter|x\.com", text):
        return "SOCIAL_PROFILE"
    if re.search(r"kleinanzeigen|classified|marketplace|quoka|markt\.de", text):
        return "CLASSIFIED"
    if re.search(r"spam|betrug|scam|anrufer|wemgeh[oö]rt|tellows", text):
        return "SPAM_WARNING"
    if re.search(r"directory|verzeichnis|telefonbuch|locatefamily|people|address", text):
        return "DIRECTORY"
    return "PUBLIC_LISTING"


def searxng_search(query: str) -> dict[str, Any]:
    params = urlencode(
        {
            "q": query,
            "format": "json",
            "language": "de",
            "safesearch": "0",
        }
    )
    req = Request(
        f"{SEARXNG_URL}/search?{params}",
        headers={
            "Accept": "application/json",
            "User-Agent": "SynSight-Internal-Exposure-Scanner/1.0",
        },
        method="GET",
    )
    with urlopen(req, timeout=SEARXNG_TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError(f"SearXNG status {response.status}")
        payload = json.loads(response.read().decode("utf-8", errors="replace"))
        if not isinstance(payload, dict):
            raise RuntimeError("Invalid SearXNG response")
        return payload


def phone_cache_key(number: str) -> str:
    variants = normalize_phone_variants(number)
    return variants[0] if variants else re.sub(r"\D", "", number)


def phone_cache_get(number: str) -> dict[str, Any] | None:
    key = phone_cache_key(number)
    now = time.time()
    with PHONE_CACHE_LOCK:
        entry = PHONE_SEARCH_CACHE.get(key)
        if not entry:
            return None
        if now - float(entry.get("created_at", 0)) > PHONE_SEARCH_CACHE_TTL:
            PHONE_SEARCH_CACHE.pop(key, None)
            return None
        cached = deepcopy(entry["outcome"])
        cached.setdefault("meta", {})["cache"] = "hit"
        return cached


def phone_cache_put(number: str, outcome: dict[str, Any]) -> None:
    key = phone_cache_key(number)
    with PHONE_CACHE_LOCK:
        PHONE_SEARCH_CACHE[key] = {
            "created_at": time.time(),
            "outcome": deepcopy(outcome),
        }
        if len(PHONE_SEARCH_CACHE) > 500:
            oldest = min(
                PHONE_SEARCH_CACHE,
                key=lambda item: PHONE_SEARCH_CACHE[item]["created_at"],
            )
            PHONE_SEARCH_CACHE.pop(oldest, None)


def run_phone_public_search(number: str) -> dict[str, Any]:
    cached = phone_cache_get(number)
    if cached is not None:
        return cached

    variants = normalize_phone_variants(number)
    if not variants:
        return success_outcome(
            [error_finding("phone-exposure", "Ungültige Rufnummer für die Websuche.")],
            partial=True,
        )

    findings: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    partial = False
    successful_queries = 0
    attempted_queries = 0

    for index, variant in enumerate(variants):
        if index > 0 and len(findings) >= PHONE_SEARCH_SECOND_QUERY_THRESHOLD:
            break
        attempted_queries += 1
        try:
            payload = searxng_search(variant)
            successful_queries += 1
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError, OSError):
            partial = True
            continue

        if payload.get("unresponsive_engines"):
            partial = True

        raw_results = payload.get("results")
        if not isinstance(raw_results, list):
            partial = True
            continue

        for raw in raw_results:
            if not isinstance(raw, dict):
                continue
            url = canonical_public_url(str(raw.get("url") or ""))
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            title = clean_line(str(raw.get("title") or "Öffentliche Fundstelle"))[:180]
            content = clean_line(str(raw.get("content") or ""))[:360]
            domain = urlparse(url).hostname or "Öffentliche Webseite"
            evidence_type = classify_public_phone_result(url, title, content)

            findings.append(
                {
                    "source": "phone-exposure",
                    "category": "PHONE_PUBLIC",
                    "type": evidence_type,
                    "platform": domain,
                    "domain": domain,
                    "url": url,
                    "title": title or f"Öffentliche Fundstelle · {domain}",
                    "description": (
                        "Diese Rufnummer wurde unter anderem auf dieser "
                        "öffentlich indexierten Seite gefunden."
                    ),
                    "snippet": content,
                    "risk": "medium",
                    "confidence": 70,
                }
            )
            if len(findings) >= PHONE_SEARCH_MAX_RESULTS:
                break
        if len(findings) >= PHONE_SEARCH_MAX_RESULTS:
            break

    if successful_queries == 0:
        partial = True

    notices: list[str] = []
    if partial:
        notices.append(
            "Die öffentliche Websuche war teilweise eingeschränkt; "
            "weitere Fundstellen können vorhanden sein."
        )

    outcome = success_outcome(
        findings[:PHONE_SEARCH_MAX_RESULTS],
        partial=partial,
        notices=notices,
        meta={
            "scope": "prioritised_public_web",
            "attempted_queries": attempted_queries,
            "successful_queries": successful_queries,
            "result_limit": PHONE_SEARCH_MAX_RESULTS,
            "cache": "miss",
            "search_status": (
                "unavailable"
                if successful_queries == 0
                else "partial"
                if partial
                else "complete"
            ),
        },
    )
    phone_cache_put(number, outcome)
    return outcome


def merge_outcomes(*outcomes: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    notices: list[str] = []
    meta: dict[str, Any] = {}
    partial = False
    for outcome in outcomes:
        findings.extend(outcome.get("findings") or [])
        partial = partial or bool(outcome.get("partial"))
        for notice in outcome.get("notices") or []:
            if notice not in notices:
                notices.append(notice)
        meta.update(outcome.get("meta") or {})
    return success_outcome(findings, partial=partial, notices=notices, meta=meta)


def run_phone_scan(number: str) -> dict[str, Any]:
    return merge_outcomes(
        run_phone_public_search(number),
        run_phoneinfoga_metadata(number),
    )


def run_single_module(module: str, query: str) -> dict[str, Any]:
    if module == "holehe":
        return run_holehe(query)
    if module == "maigret":
        return run_maigret(query)
    if module == "phoneinfoga":
        return run_phone_scan(query)
    return success_outcome(
        [error_finding("unknown", "Prüfschritt nicht freigegeben.")],
        partial=True,
    )


def persist_result(result: dict[str, Any]) -> None:
    if not PERSIST_RESULTS:
        return
    try:
        RESULT_PATH.mkdir(parents=True, exist_ok=True, mode=0o700)
        scan_id = str(result.get("scan_id") or uuid.uuid4())
        path = RESULT_PATH / f"{scan_id}.json"
        path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        path.chmod(0o600)
    except Exception:
        pass


def public_finding_count(findings: list[dict[str, Any]]) -> int:
    return sum(
        1
        for finding in findings
        if str(finding.get("category") or "").upper() != "ERROR"
    )


def scan_response(module: str, query: str, outcome: dict[str, Any]):
    findings = list(outcome.get("findings") or [])
    result = {
        "status": "success",
        "scan_id": str(uuid.uuid4()),
        "target": query,
        "module": module,
        "queries": detect_legacy_query(query),
        "timestamp": utc_now(),
        "total_findings": public_finding_count(findings),
        "findings": findings,
        "partial": bool(outcome.get("partial")),
        "notices": outcome.get("notices") or [],
        "scan_meta": outcome.get("meta") or {},
        "source": "contabo-free",
        "api_version": "contabo-free-3",
    }
    persist_result(result)
    return jsonify(result)


@app.route("/api/scan", methods=["POST"])
def scan():
    if not check_auth():
        return jsonify({"status": "error", "error": "Unauthorized"}), 401
    if not request.is_json:
        return jsonify({"status": "error", "error": "JSON required"}), 415

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"status": "error", "error": "Invalid JSON"}), 400

    targets = collect_targets(data)
    module = normalize_module(str(data.get("module") or ""))

    if module:
        if module not in ALLOWED_MODULES:
            return jsonify({"status": "error", "error": "Module not allowed"}), 400
        query = clean_query(data.get("query"))
        if not query and targets:
            query = next(iter(targets.values()))
        if not query:
            return jsonify({"status": "error", "error": "Missing query"}), 400

        if not SCAN_SLOTS.acquire(blocking=False):
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": "Scanner busy",
                        "retry_after_seconds": 15,
                    }
                ),
                503,
                {"Retry-After": "15"},
            )
        try:
            return scan_response(module, query, run_single_module(module, query))
        finally:
            SCAN_SLOTS.release()

    if not targets:
        return jsonify({"status": "error", "error": "Missing query"}), 400

    if not SCAN_SLOTS.acquire(blocking=False):
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "Scanner busy",
                    "retry_after_seconds": 15,
                }
            ),
            503,
            {"Retry-After": "15"},
        )

    try:
        outcomes: list[dict[str, Any]] = []
        if email := targets.get("email"):
            outcomes.append(run_holehe(email))
        if username := targets.get("username"):
            outcomes.append(run_maigret(username))
        if phone := targets.get("phone"):
            outcomes.append(run_phone_scan(phone))

        outcome = merge_outcomes(*outcomes)
        findings = list(outcome.get("findings") or [])
        result = {
            "status": "success",
            "scan_id": str(uuid.uuid4()),
            "target": " · ".join(targets.values()),
            "queries": targets,
            "timestamp": utc_now(),
            "total_findings": public_finding_count(findings),
            "findings": findings,
            "partial": bool(outcome.get("partial")),
            "notices": outcome.get("notices") or [],
            "scan_meta": outcome.get("meta") or {},
            "source": "contabo-free",
            "api_version": "contabo-free-3",
        }
        persist_result(result)
        return jsonify(result)
    finally:
        SCAN_SLOTS.release()


@app.route("/api/health", methods=["GET"])
def health():
    if not check_auth():
        return jsonify({"status": "error", "error": "Unauthorized"}), 401

    readiness = tool_readiness()
    ready = all(readiness.values())
    payload: dict[str, Any] = {
        "ok": True,
        "ready": ready,
        "service": "synsight-demo-scan",
        "api_version": "contabo-free-3",
        "timestamp": utc_now(),
    }
    if HEALTH_VERBOSE:
        payload["checks"] = readiness
    return jsonify(payload), 200 if ready else 503


def validate_startup() -> None:
    if not API_KEY:
        raise RuntimeError(
            "API_KEY fehlt. Scanner wird aus Sicherheitsgründen nicht gestartet."
        )
    if len(API_KEY) < 24:
        print(
            "[synsight-free] WARNUNG: API_KEY ist kürzer als 24 Zeichen; Rotation empfohlen.",
            flush=True,
        )
    if REQUIRE_CLIENT_ALLOWLIST and not ALLOWED_CLIENT_NETWORKS:
        raise RuntimeError(
            "REQUIRE_CLIENT_ALLOWLIST=true, aber ALLOWED_CLIENT_IPS ist leer."
        )
    if not ALLOWED_CLIENT_NETWORKS:
        print(
            "[synsight-free] WARNUNG: Keine App-Allowlist gesetzt; "
            "Firewall-Regeln müssen Port 5002 schützen.",
            flush=True,
        )
    if not searxng_configured():
        raise RuntimeError("SEARXNG_URL ist ungültig.")


validate_startup()

if __name__ == "__main__":
    print(
        f"[synsight-free] listening {API_BIND}:{API_PORT} · auth=yes · "
        f"allowlist={'yes' if ALLOWED_CLIENT_NETWORKS else 'firewall-only'} · "
        f"public-search={SEARXNG_URL}",
        flush=True,
    )
    app.run(
        host=API_BIND,
        port=API_PORT,
        threaded=True,
        use_reloader=False,
        debug=False,
    )
