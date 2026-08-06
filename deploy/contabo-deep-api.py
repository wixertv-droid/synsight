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
  - public username correlation
  - telephone metadata

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
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int, minimum: int = 1, maximum: int = 1_000_000) -> int:
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
MAIGRET_TIMEOUT = env_int("MAIGRET_TIMEOUT", 55, 5, 180)
PHONE_TIMEOUT = env_int("PHONEINFOGA_TIMEOUT", 35, 5, 180)

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


def parse_allowed_networks(raw: str) -> list[ipaddress._BaseNetwork]:
    networks: list[ipaddress._BaseNetwork] = []
    for entry in raw.split(","):
        value = entry.strip()
        if not value:
            continue
        try:
            networks.append(ipaddress.ip_network(value, strict=False))
        except ValueError as exc:
            raise RuntimeError(f"Ungültiger Eintrag in ALLOWED_CLIENT_IPS: {value}") from exc
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


def tool_readiness() -> dict[str, bool]:
    return {
        "email": bool(resolve_bin("holehe", "HOLEHE_BIN")),
        "username": bool(resolve_bin("maigret", "MAIGRET_BIN")),
        "phone": bool(resolve_bin("phoneinfoga", "PHONEINFOGA_BIN")),
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


def run_holehe(email: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("holehe", "HOLEHE_BIN")
    if not bin_cmd:
        return missing_tool("holehe")
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
                {
                    "source": "holehe",
                    "category": "ERROR",
                    "error": "Prüfschritt konnte nicht abgeschlossen werden.",
                }
            )
    except Exception:
        findings.append(
            {
                "source": "holehe",
                "category": "ERROR",
                "error": "Prüfschritt konnte nicht abgeschlossen werden.",
            }
        )
    return findings


def run_maigret(username: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("maigret", "MAIGRET_BIN")
    if not bin_cmd:
        return missing_tool("maigret")
    try:
        result = subprocess.run(
            [*bin_cmd, username, "--timeout", "15", "--no-color"],
            capture_output=True,
            text=True,
            timeout=MAIGRET_TIMEOUT,
            check=False,
        )
        for line in result.stdout.splitlines():
            line = clean_line(line)
            for url in re.findall(r"https?://\S+", line):
                clean_url = url.rstrip(",.;)")
                findings.append(
                    {
                        "source": "maigret",
                        "category": "USERNAME",
                        "platform": "Social/Web",
                        "url": clean_url,
                        "title": "Username-Treffer",
                        "description": clean_url,
                        "risk": "medium",
                        "confidence": 75,
                    }
                )
        if not findings and result.returncode != 0:
            findings.append(
                {
                    "source": "maigret",
                    "category": "ERROR",
                    "error": "Prüfschritt konnte nicht abgeschlossen werden.",
                }
            )
    except Exception:
        findings.append(
            {
                "source": "maigret",
                "category": "ERROR",
                "error": "Prüfschritt konnte nicht abgeschlossen werden.",
            }
        )
    return findings[:40]


def run_phoneinfoga(number: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("phoneinfoga", "PHONEINFOGA_BIN")
    if not bin_cmd:
        return missing_tool("phoneinfoga")
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
            findings.append(
                {
                    "source": "phoneinfoga",
                    "category": "PHONE",
                    "title": "Telefon-Analyse",
                    "description": output[:500],
                    "raw": output[:2000],
                    "risk": "medium",
                    "confidence": 60,
                }
            )
        elif result.returncode != 0:
            findings.append(
                {
                    "source": "phoneinfoga",
                    "category": "ERROR",
                    "error": "Prüfschritt konnte nicht abgeschlossen werden.",
                }
            )
    except Exception:
        findings.append(
            {
                "source": "phoneinfoga",
                "category": "ERROR",
                "error": "Prüfschritt konnte nicht abgeschlossen werden.",
            }
        )
    return findings


def run_single_module(module: str, query: str) -> list[dict[str, Any]]:
    if module == "holehe":
        return run_holehe(query)
    if module == "maigret":
        return run_maigret(query)
    if module == "phoneinfoga":
        return run_phoneinfoga(query)
    return [
        {
            "source": "unknown",
            "category": "ERROR",
            "error": "Prüfschritt nicht freigegeben.",
        }
    ]


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


def scan_response(module: str, query: str, findings: list[dict[str, Any]]):
    result = {
        "status": "success",
        "scan_id": str(uuid.uuid4()),
        "target": query,
        "module": module,
        "queries": detect_legacy_query(query),
        "timestamp": utc_now(),
        "total_findings": len(findings),
        "findings": findings,
        "partial": False,
        "source": "contabo-free",
        "api_version": "contabo-free-2",
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
        findings: list[dict[str, Any]] = []
        if email := targets.get("email"):
            findings += run_holehe(email)
        if username := targets.get("username"):
            findings += run_maigret(username)
        if phone := targets.get("phone"):
            findings += run_phoneinfoga(phone)

        result = {
            "status": "success",
            "scan_id": str(uuid.uuid4()),
            "target": " · ".join(targets.values()),
            "queries": targets,
            "timestamp": utc_now(),
            "total_findings": len(findings),
            "findings": findings,
            "partial": False,
            "source": "contabo-free",
            "api_version": "contabo-free-2",
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
        "api_version": "contabo-free-2",
        "timestamp": utc_now(),
    }
    if HEALTH_VERBOSE:
        payload["checks"] = readiness
    return jsonify(payload), 200 if ready else 503


def validate_startup() -> None:
    if not API_KEY:
        raise RuntimeError("API_KEY fehlt. Scanner wird aus Sicherheitsgründen nicht gestartet.")
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
            "[synsight-free] WARNUNG: Keine App-Allowlist gesetzt; Firewall-Regeln müssen Port 5002 schützen.",
            flush=True,
        )


validate_startup()

if __name__ == "__main__":
    print(
        f"[synsight-free] listening {API_BIND}:{API_PORT} · auth=yes · allowlist={'yes' if ALLOWED_CLIENT_NETWORKS else 'firewall-only'}",
        flush=True,
    )
    app.run(
        host=API_BIND,
        port=API_PORT,
        threaded=True,
        use_reloader=False,
        debug=False,
    )
