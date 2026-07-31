#!/usr/bin/env python3
"""
SynSight public demo scan API (Contabo) — REAL SpiderFoot results.

This replaces the previous simulated findings. Flow:
  1. Normalize query
  2. Return disk-cached result for the same target (stable re-scans)
  3. Start a SpiderFoot passive/footprint scan
  4. Poll for up to SCAN_WAIT_SECONDS and map real events → findings
  5. Cache and return

Deploy:
  sudo cp deploy/demo-scan-api.py /opt/api.py
  # SpiderFoot must listen on SPIDERFOOT_URL (default http://127.0.0.1:5001)
  pkill -f '/opt/api.py' || true
  nohup python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SPIDERFOOT_URL = os.environ.get("SPIDERFOOT_URL", "http://127.0.0.1:5001").rstrip(
    "/"
)
SCAN_WAIT_SECONDS = int(os.environ.get("DEMO_SCAN_WAIT_SECONDS", "18"))
POLL_INTERVAL = float(os.environ.get("DEMO_SCAN_POLL_INTERVAL", "1.5"))
CACHE_PATH = Path(
    os.environ.get(
        "DEMO_SCAN_CACHE_PATH", "/tmp/synsight-demo-scan-cache.json"
    )
)
CACHE_TTL_SECONDS = int(os.environ.get("DEMO_SCAN_CACHE_TTL", str(6 * 3600)))

# Prefer faster, public-source modules for the free landing check.
# "passive" usecase avoids active probing that can take many minutes.
USECASE = os.environ.get("DEMO_SCAN_USECASE", "passive")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_target(target: str) -> str:
    return re.sub(r"\s+", " ", (target or "").strip()).lower()


def detect_target_type(target: str) -> str:
    if re.match(r"[^@]+@[^@]+\.[^@]+", target, re.I):
        return "EMAIL"
    if re.match(r"^\+?[0-9\s\-()]{7,}$", target):
        return "PHONE"
    if "." in target and " " not in target and "@" not in target:
        # domain-like usernames stay USERNAME unless clearly a host
        if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", target, re.I):
            return "DOMAIN"
        return "USERNAME"
    if " " in target:
        return "NAME"
    return "USERNAME"


def http_json(
    method: str,
    path: str,
    data: dict[str, str] | None = None,
    timeout: float = 20.0,
) -> Any:
    url = f"{SPIDERFOOT_URL}{path}"
    body = None
    headers = {"Accept": "application/json"}
    if data is not None:
        body = urlencode(data).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = Request(url, data=body, headers=headers, method=method)
    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace").strip()
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # SpiderFoot often returns a bare scan id string
            return raw.strip().strip('"')


def load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text("utf-8"))
    except Exception:
        return {}


def save_cache(cache: dict[str, Any]) -> None:
    try:
        CACHE_PATH.write_text(json.dumps(cache), encoding="utf-8")
    except Exception:
        pass


def cache_get(key: str) -> dict[str, Any] | None:
    cache = load_cache()
    entry = cache.get(key)
    if not entry:
        return None
    if time.time() - float(entry.get("saved_at", 0)) > CACHE_TTL_SECONDS:
        return None
    return entry.get("payload")


def cache_set(key: str, payload: dict[str, Any]) -> None:
    cache = load_cache()
    cache[key] = {"saved_at": time.time(), "payload": payload}
    save_cache(cache)


def start_scan(target: str, target_type: str) -> str:
    scan_name = f"SynSight Demo · {target_type} · {normalize_target(target)[:40]}"
    # usecase=passive: public sources, suitable for a short landing-page wait
    result = http_json(
        "POST",
        "/startscan",
        {
            "scanname": scan_name,
            "scantarget": target,
            "usecase": USECASE,
        },
        timeout=30.0,
    )
    if isinstance(result, dict):
        scan_id = result.get("id") or result.get("scanid") or result.get("scanId")
        if scan_id:
            return str(scan_id)
    if isinstance(result, str) and result:
        return result
    raise RuntimeError(f"SpiderFoot startscan returned unexpected payload: {result!r}")


def get_status(scan_id: str) -> dict[str, Any]:
    data = http_json("GET", f"/scanstatus?id={scan_id}", timeout=15.0)
    # [name, target, created, started, ended, status, correlations]
    if isinstance(data, list) and len(data) >= 6:
        return {
            "name": data[0],
            "target": data[1],
            "status": str(data[5]),
            "correlations": data[6] if len(data) > 6 else {},
        }
    return {"status": "UNKNOWN", "correlations": {}}


def get_results(scan_id: str) -> list[list[Any]]:
    data = http_json("GET", f"/scaneventresults?id={scan_id}", timeout=30.0)
    if isinstance(data, list):
        return data
    return []


# Map SpiderFoot event types → SynSight finding presentation
EVENT_MAP: list[tuple[re.Pattern[str], str, str, str]] = [
    (re.compile(r"EMAILADDR_COMPROMISED|PASSWORD|BREACH|LEAK|DARKWEB|PASTEBIN", re.I), "BREACH", "Datenleck / Exposure", "high"),
    (re.compile(r"ACCOUNT_EXTERNAL|SOCIAL_MEDIA|TWITTER|LINKEDIN|FACEBOOK|INSTAGRAM|USERNAME", re.I), "SOCIAL", "Öffentliche Profile", "medium"),
    (re.compile(r"EMAILADDR|EMAIL_ADDRESS", re.I), "IDENTITY", "E-Mail Identifiziert", "low"),
    (re.compile(r"PHONE|TELEPHONE", re.I), "LOOKUP", "Telefon-Spur", "medium"),
    (re.compile(r"HUMAN_NAME|PERSON", re.I), "IDENTITY", "Namenszuordnung", "low"),
    (re.compile(r"INTERNET_NAME|DOMAIN|DNS|WHOIS|SSL|CERTIFICATE", re.I), "INFRA", "Domain / Infrastruktur", "low"),
    (re.compile(r"IP_ADDRESS|NETBLOCK|GEOINFO|COUNTRY", re.I), "GEO", "Netzwerk / Geo", "low"),
    (re.compile(r"VULNERABILITY|MALICIOUS|BLACKLIST|THREAT", re.I), "THREAT", "Bedrohungssignal", "high"),
    (re.compile(r"RAW_|CO_HOSTED|TCP|UDP|PORT", re.I), "TECH", "Technische Spur", "low"),
]


def classify_event(event_type: str) -> tuple[str, str, str]:
    for pattern, category, title, risk in EVENT_MAP:
        if pattern.search(event_type or ""):
            return category, title, risk
    return "OSINT", "Öffentliche Spur", "low"


def risk_rank(risk: str) -> int:
    return {"high": 3, "medium": 2, "low": 1}.get(risk, 0)


def map_results_to_findings(rows: list[list[Any]], target: str) -> tuple[list[dict], list[str]]:
    """
    SpiderFoot row layout (typical):
      [0] generated, [1] data, [2] source module/event, [3] module,
      ... [10] type (varies by SF version — we probe multiple indexes)
    """
    grouped: dict[str, dict[str, Any]] = {}
    platforms: set[str] = set()

    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) < 2:
            continue
        data = str(row[1] if len(row) > 1 else "")
        module = str(row[3] if len(row) > 3 else row[2] if len(row) > 2 else "spiderfoot")
        event_type = ""
        for idx in (10, 4, 8, 9):
            if len(row) > idx and row[idx]:
                event_type = str(row[idx])
                break
        if not data or data.lower() in {"none", "null", "-"}:
            continue
        # Skip pure RAW noise blobs that are huge
        if len(data) > 500:
            data = data[:500] + "…"

        category, title, risk = classify_event(event_type or module)
        key = f"{category}|{title}"
        platforms.add(module.replace("sfp_", "").replace("_", " ").title()[:40])

        bucket = grouped.get(key)
        if not bucket:
            grouped[key] = {
                "category": category,
                "title": title,
                "risk": risk,
                "platform": module.replace("sfp_", ""),
                "samples": [data],
                "types": {event_type or module},
                "count": 1,
            }
        else:
            bucket["count"] += 1
            if len(bucket["samples"]) < 4 and data not in bucket["samples"]:
                bucket["samples"].append(data)
            if risk_rank(risk) > risk_rank(bucket["risk"]):
                bucket["risk"] = risk
            bucket["types"].add(event_type or module)

    findings: list[dict] = []
    for bucket in grouped.values():
        samples = "; ".join(bucket["samples"][:3])
        count = bucket["count"]
        description = (
            f"SpiderFoot hat für '{target}' {count} öffentliche Signal(e) "
            f"der Kategorie {bucket['title']} gefunden. "
            f"Beispielwerte: {samples}"
        )
        confidence = min(99, 55 + min(40, count * 4))
        findings.append(
            {
                "category": bucket["category"],
                "title": bucket["title"],
                "description": description,
                "platform": str(bucket["platform"])[:48] or "SpiderFoot",
                "risk": bucket["risk"],
                "confidence": confidence,
                "timestamp": utc_now_iso(),
                "detail": samples,
            }
        )

    # Highest risk / most signals first
    findings.sort(
        key=lambda f: (risk_rank(str(f["risk"])), int(f["confidence"])),
        reverse=True,
    )
    return findings[:12], sorted(platforms)[:12]


def score_from_findings(findings: list[dict], correlations: Any) -> tuple[int, str]:
    high = sum(1 for f in findings if f.get("risk") == "high")
    medium = sum(1 for f in findings if f.get("risk") == "medium")
    low = sum(1 for f in findings if f.get("risk") == "low")

    # Prefer SpiderFoot correlation counts when present
    if isinstance(correlations, dict):
        high = max(high, int(correlations.get("HIGH") or 0))
        medium = max(medium, int(correlations.get("MEDIUM") or 0))
        low = max(low, int(correlations.get("LOW") or 0) + int(correlations.get("INFO") or 0))

    score = min(98, 18 + high * 18 + medium * 8 + low * 2)
    if high >= 2 or score >= 75:
        risk = "Kritisch"
    elif high >= 1 or score >= 55:
        risk = "Erhöht"
    elif score >= 35:
        risk = "Mittel"
    else:
        risk = "Niedrig"
    return score, risk


def build_summary(target: str, findings: list[dict], score: int, risk: str, status: str) -> str:
    n = len(findings)
    if n == 0:
        return (
            f"Die öffentliche SpiderFoot-Analyse für '{target}' wurde ausgeführt "
            f"(Status: {status}). In der kurzen Vorprüfung wurden noch keine "
            "klaren öffentlichen Treffer korreliert. Eine vollständige Deep-Analyse "
            "kann zusätzliche Quellen erschließen."
        )
    top = findings[0]["title"]
    return (
        f"Öffentliche SpiderFoot-Analyse für '{target}' abgeschlossen. "
        f"{n} korrelierte Datenpunkt-Gruppe(n), Exposure-Score {score}/100, "
        f"Risiko: {risk}. Stärkstes Signal: {top}. "
        "Die Treffer stammen aus öffentlichen OSINT-Quellen — keine Simulation."
    )


def run_spiderfoot_scan(target: str, target_type: str) -> dict[str, Any]:
    scan_id = start_scan(target, target_type)
    deadline = time.time() + SCAN_WAIT_SECONDS
    status = "RUNNING"
    correlations: Any = {}
    rows: list[list[Any]] = []

    while time.time() < deadline:
        time.sleep(POLL_INTERVAL)
        try:
            st = get_status(scan_id)
            status = str(st.get("status") or status)
            correlations = st.get("correlations") or correlations
        except Exception:
            pass
        try:
            rows = get_results(scan_id)
        except Exception:
            pass
        # Finished / aborted / error → stop early
        if re.search(r"FINISHED|ABORT|ERROR|FAILED", status, re.I):
            break

    findings, platforms = map_results_to_findings(rows, target)
    score, risk = score_from_findings(findings, correlations)

    return {
        "status": "success",
        "query": target,
        "query_type": target_type.lower(),
        "findings": findings,
        "platforms": platforms or ["SpiderFoot"],
        "exposure_score": score,
        "risk_level": risk,
        "summary": build_summary(target, findings, score, risk, status),
        "source": "spiderfoot",
        "scan_id": scan_id,
        "scan_status": status,
        "result_count": len(rows),
        "timestamp": utc_now_iso(),
    }


@app.route("/api/scan", methods=["POST"])
def scan_target():
    data = request.json or {}
    target = (data.get("query") or "").strip()

    if not target:
        return jsonify({"status": "error", "message": "Kein Ziel angegeben"}), 400

    try:
        target_type = detect_target_type(target)
        cache_key = f"{target_type}|{normalize_target(target)}"

        cached = cache_get(cache_key)
        if cached:
            # Stable re-scan: same target → same real snapshot
            out = dict(cached)
            out["cached"] = True
            return jsonify(out)

        payload = run_spiderfoot_scan(target, target_type)
        cache_set(cache_key, payload)
        payload = dict(payload)
        payload["cached"] = False
        return jsonify(payload)

    except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": (
                        "SpiderFoot konnte nicht erreicht oder der Scan nicht "
                        f"gestartet werden: {exc}"
                    ),
                    "risk_level": "Fehler",
                }
            ),
            502,
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    sf_ok = False
    try:
        http_json("GET", "/ping", timeout=3.0)
        sf_ok = True
    except Exception:
        try:
            # some builds have no /ping — try scanlist
            http_json("GET", "/scanlist", timeout=3.0)
            sf_ok = True
        except Exception:
            sf_ok = False
    return jsonify(
        {
            "ok": True,
            "spiderfoot": sf_ok,
            "spiderfoot_url": SPIDERFOOT_URL,
            "usecase": USECASE,
            "wait_seconds": SCAN_WAIT_SECONDS,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
