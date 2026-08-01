#!/usr/bin/env python3
"""
SynSight Contabo Deep-Scan API — multi-module, real results.

Modules (only run when matching target type is provided):
  - holehe        (email)
  - maigret       (username)
  - phoneinfoga   (phone)
  - theHarvester  (domain)
  - photon        (url)
  - SpiderFoot    (always, real events polled)

Auth:
  Authorization: Bearer $API_KEY

Body (any subset; empty fields ignored):
  {"email":"…","username":"…","phone":"…","domain":"…","url":"…"}
  or legacy: {"query":"…"}

Deploy on Contabo:
  sudo cp deploy/contabo-deep-api.py /opt/api.py
  export API_KEY='…'
  export SPIDERFOOT_URL='http://127.0.0.1:5001'   # or http://172.17.0.1:5001
  pkill -f '/opt/api.py' || true
  nohup python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("API_KEY", "demoscanner23061980!!")
SPIDERFOOT_URL = os.environ.get("SPIDERFOOT_URL", "http://127.0.0.1:5001").rstrip(
    "/"
)
# Keep landing-page scans under typical nginx proxy timeouts.
# Per-module HTTP calls stay short; SynSight runs modules sequentially.
SCAN_WAIT_SECONDS = int(os.environ.get("DEMO_SCAN_WAIT_SECONDS", "18"))
POLL_INTERVAL = float(os.environ.get("DEMO_SCAN_POLL_INTERVAL", "1.2"))
HOLEHE_TIMEOUT = int(os.environ.get("HOLEHE_TIMEOUT", "50"))
MAIGRET_TIMEOUT = int(os.environ.get("MAIGRET_TIMEOUT", "55"))
PHONE_TIMEOUT = int(os.environ.get("PHONEINFOGA_TIMEOUT", "35"))
HARVEST_TIMEOUT = int(os.environ.get("HARVESTER_TIMEOUT", "45"))
PHOTON_TIMEOUT = int(os.environ.get("PHOTON_TIMEOUT", "45"))
OVERALL_DEADLINE_SECONDS = int(os.environ.get("DEMO_SCAN_OVERALL_SECONDS", "70"))
RESULT_PATH = Path(os.environ.get("RESULT_PATH", "/tmp/synsight_results"))
RESULT_PATH.mkdir(parents=True, exist_ok=True)

THEHARVESTER_BIN = os.environ.get(
    "THEHARVESTER_BIN", "/app/theHarvester/theHarvester.py"
)
PHOTON_BIN = os.environ.get("PHOTON_BIN", "/app/photon/photon.py")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def check_auth(req) -> bool:
    """Accept Authorization: Bearer <key> or X-API-Key: <key>."""
    expected = (API_KEY or "").strip()
    if not expected:
        return False
    auth = (req.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token == expected:
            return True
    xkey = (req.headers.get("X-API-Key") or "").strip()
    if xkey == expected:
        return True
    # Also accept raw Authorization equal to the key (no Bearer prefix).
    if auth == expected:
        return True
    return False


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
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace").strip()
    except HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(
            f"SpiderFoot HTTP {exc.code} on {path}: {err[:240] or exc.reason}"
        ) from exc
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw.strip().strip('"')


# -------------------------
# Tools
# -------------------------


def run_holehe(email: str) -> list[dict]:
    findings: list[dict] = []
    try:
        result = subprocess.run(
            ["holehe", email, "--only-used"],
            capture_output=True,
            text=True,
            timeout=HOLEHE_TIMEOUT,
        )
        for line in result.stdout.splitlines():
            if "[+]" in line:
                platform = line.replace("[+]", "").strip()
                findings.append(
                    {
                        "source": "holehe",
                        "category": "EMAIL",
                        "type": "ACCOUNT",
                        "platform": platform,
                        "title": f"Account · {platform}",
                        "description": f"Holehe meldet genutzten Account auf {platform}.",
                        "risk": "medium",
                        "confidence": 80,
                    }
                )
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "holehe", "error": str(exc)})
    return findings


def run_maigret(username: str) -> list[dict]:
    findings: list[dict] = []
    try:
        result = subprocess.run(
            ["maigret", username, "--timeout", "15", "--no-color"],
            capture_output=True,
            text=True,
            timeout=MAIGRET_TIMEOUT,
        )
        for line in result.stdout.splitlines():
            urls = re.findall(r"https?://\S+", line)
            if urls:
                findings.append(
                    {
                        "source": "maigret",
                        "category": "USERNAME",
                        "platform": "Social/Web",
                        "url": urls[0],
                        "title": "Username-Treffer",
                        "description": urls[0],
                        "risk": "medium",
                        "confidence": 75,
                    }
                )
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "maigret", "error": str(exc)})
    return findings[:40]


def run_phoneinfoga(number: str) -> list[dict]:
    findings: list[dict] = []
    try:
        result = subprocess.run(
            ["phoneinfoga", "scan", "-n", number],
            capture_output=True,
            text=True,
            timeout=PHONE_TIMEOUT,
        )
        output = (result.stdout or "").strip()
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
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "phoneinfoga", "error": str(exc)})
    return findings


def run_theharvester(domain: str) -> list[dict]:
    findings: list[dict] = []
    outfile = f"/tmp/{uuid.uuid4()}.json"
    try:
        cmd = ["theHarvester", "-d", domain, "-b", "bing,duckduckgo", "-f", outfile]
        if Path(THEHARVESTER_BIN).exists():
            cmd = [
                "python3",
                THEHARVESTER_BIN,
                "-d",
                domain,
                "-b",
                "bing,duckduckgo",
                "-f",
                outfile,
            ]
        subprocess.run(cmd, timeout=HARVEST_TIMEOUT, capture_output=True)
        if Path(outfile).exists():
            data = json.loads(Path(outfile).read_text("utf-8"))
            findings.append(
                {
                    "source": "theHarvester",
                    "category": "DOMAIN",
                    "title": "Domain Harvest",
                    "emails": data.get("emails", [])[:30],
                    "hosts": data.get("hosts", [])[:30],
                    "description": (
                        f"E-Mails: {len(data.get('emails', []))} · "
                        f"Hosts: {len(data.get('hosts', []))}"
                    ),
                    "risk": "medium",
                    "confidence": 85,
                }
            )
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "theHarvester", "error": str(exc)})
    return findings


def run_photon(url: str) -> list[dict]:
    findings: list[dict] = []
    try:
        cmd = ["photon", "-u", url, "-l", "2", "--keys"]
        if Path(PHOTON_BIN).exists():
            cmd = ["python3", PHOTON_BIN, "-u", url, "-l", "2", "--keys"]
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=PHOTON_TIMEOUT
        )
        output = (result.stdout or "").strip()
        findings.append(
            {
                "source": "photon",
                "category": "WEB",
                "title": "Web-Crawl",
                "description": (output[:500] if output else "Photon-Scan ausgeführt."),
                "raw": output[:2000],
                "risk": "low",
                "confidence": 70,
            }
        )
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "photon", "error": str(exc)})
    return findings


def start_spiderfoot(target: str) -> str:
    form = {
        "scanname": f"SynSight Deep {target[:48]}",
        "scantarget": target,
        "modulelist": "",
        "typelist": "",
        "usecase": "passive",
    }
    # HUMAN_NAME / USERNAME need quotes for SF type detection
    if " " in target and "@" not in target and not target.startswith("http"):
        form["scantarget"] = f'"{target.strip()}"'
    result = http_json("POST", "/startscan", form, timeout=45.0)
    if isinstance(result, list) and len(result) >= 2:
        if str(result[0]).upper() == "ERROR":
            raise RuntimeError(str(result[1]))
        if str(result[0]).upper() == "SUCCESS":
            payload = result[1]
            if isinstance(payload, list) and payload:
                return str(payload[0])
            return str(payload)
    if isinstance(result, str) and result:
        return result
    raise RuntimeError(f"Unexpected startscan payload: {result!r}")


def poll_spiderfoot(scan_id: str) -> list[dict]:
    findings: list[dict] = []
    deadline = time.time() + SCAN_WAIT_SECONDS
    rows: list[Any] = []
    while time.time() < deadline:
        time.sleep(POLL_INTERVAL)
        try:
            status = http_json("GET", f"/scanstatus?id={scan_id}", timeout=15.0)
            st = (
                str(status[5])
                if isinstance(status, list) and len(status) > 5
                else "RUNNING"
            )
        except Exception:
            st = "RUNNING"
        try:
            data = http_json(
                "GET", f"/scaneventresults?id={scan_id}", timeout=30.0
            )
            if isinstance(data, list):
                rows = data
        except Exception:
            pass
        if re.search(r"FINISHED|ABORT|ERROR|FAILED", st, re.I):
            break

    for row in rows[:80]:
        if not isinstance(row, (list, tuple)) or len(row) < 2:
            continue
        value = str(row[1] or "")
        module = str(row[3] if len(row) > 3 else "spiderfoot")
        event_type = ""
        for idx in (10, 4, 8, 9):
            if len(row) > idx and row[idx]:
                event_type = str(row[idx])
                break
        if not value or value.lower() in {"none", "null", "-"}:
            continue
        if len(value) > 400:
            value = value[:400] + "…"
        findings.append(
            {
                "source": "SpiderFoot",
                "category": "OSINT",
                "type": event_type or module,
                "platform": module.replace("sfp_", ""),
                "title": event_type or module,
                "description": value,
                "detail": value,
                "risk": "medium"
                if re.search(r"BREACH|PASSWORD|LEAK|MALICIOUS", event_type, re.I)
                else "low",
                "confidence": 85,
            }
        )
    if not findings:
        findings.append(
            {
                "source": "SpiderFoot",
                "category": "OSINT",
                "title": "SpiderFoot Scan",
                "description": (
                    f"Scan {scan_id} abgeschlossen — in der Kurzwartezeit "
                    "keine korrelierten Events."
                ),
                "status": "finished",
                "risk": "low",
                "confidence": 50,
            }
        )
    return findings


def run_spiderfoot(target: str) -> list[dict]:
    try:
        scan_id = start_spiderfoot(target)
        return poll_spiderfoot(scan_id)
    except Exception as exc:  # noqa: BLE001
        return [{"source": "SpiderFoot", "error": str(exc)}]


def detect_legacy_query(target: str) -> dict[str, str]:
    t = target.strip()
    if t.startswith("+") or re.match(r"^\d[\d\s()-]{6,}$", t):
        return {"phone": t}
    if "@" in t:
        return {"email": t}
    if t.startswith("http"):
        return {"url": t}
    if "." in t and " " not in t:
        return {"domain": t}
    return {"username": t}


def collect_targets(data: dict) -> dict[str, str]:
    keys = ("email", "username", "phone", "domain", "url", "name")
    out: dict[str, str] = {}
    for key in keys:
        value = str(data.get(key) or "").strip()
        if value:
            out[key] = value
    if not out and data.get("query"):
        out.update(detect_legacy_query(str(data["query"])))
    return out


def normalize_module(raw: str) -> str:
    key = (raw or "").strip().lower().replace("_", "").replace("-", "")
    aliases = {
        "holehe": "holehe",
        "maigret": "maigret",
        "phoneinfoga": "phoneinfoga",
        "phone": "phoneinfoga",
        "theharvester": "theHarvester",
        "harvester": "theHarvester",
        "photon": "photon",
        "spiderfoot": "spiderfoot",
        "sf": "spiderfoot",
    }
    return aliases.get(key, "")


def run_single_module(module: str, query: str) -> list[dict]:
    if module == "holehe":
        return run_holehe(query)
    if module == "maigret":
        return run_maigret(query)
    if module == "phoneinfoga":
        return run_phoneinfoga(query)
    if module == "theHarvester":
        return run_theharvester(query)
    if module == "photon":
        return run_photon(query)
    if module == "spiderfoot":
        return run_spiderfoot(query)
    return [{"source": module or "unknown", "error": f"Unknown module: {module}"}]


@app.route("/api/scan", methods=["POST"])
def scan():
    if not check_auth(request):
        return jsonify({"status": "error", "error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    targets = collect_targets(data)
    module = normalize_module(str(data.get("module") or ""))

    # Single-module mode (preferred by SynSight sequential UI)
    if module:
        query = str(data.get("query") or "").strip()
        if not query and targets:
            query = next(iter(targets.values()))
        if not query:
            return jsonify({"status": "error", "error": "missing query"}), 400

        scan_id = str(uuid.uuid4())
        findings = run_single_module(module, query)
        result = {
            "status": "success",
            "scan_id": scan_id,
            "target": query,
            "module": module,
            "queries": targets or detect_legacy_query(query),
            "timestamp": utc_now(),
            "total_findings": len(findings),
            "findings": findings,
            "partial": False,
            "source": "contabo-deep",
            "api_version": "contabo-deep-4",
        }
        try:
            (RESULT_PATH / f"{scan_id}.json").write_text(
                json.dumps(result, indent=2), encoding="utf-8"
            )
        except Exception:
            pass
        return jsonify(result)

    if not targets:
        return jsonify({"status": "error", "error": "missing query"}), 400

    # Legacy full scan (all matching modules in one request — may be slow)
    scan_id = str(uuid.uuid4())
    findings: list[dict] = []
    deadline = time.time() + OVERALL_DEADLINE_SECONDS
    partial = False

    def within_budget() -> bool:
        return time.time() < deadline - 2

    if email := targets.get("email"):
        if within_budget():
            findings += run_holehe(email)
        else:
            partial = True
        if within_budget():
            findings += run_spiderfoot(email)
        else:
            partial = True
    if username := targets.get("username") or targets.get("name"):
        if within_budget():
            findings += run_maigret(username)
        else:
            partial = True
        if "email" not in targets:
            if within_budget():
                findings += run_spiderfoot(username)
            else:
                partial = True
    if phone := targets.get("phone"):
        if within_budget():
            findings += run_phoneinfoga(phone)
        else:
            partial = True
        if not any(k in targets for k in ("email", "username", "name")):
            if within_budget():
                findings += run_spiderfoot(phone)
            else:
                partial = True
    if domain := targets.get("domain"):
        if within_budget():
            findings += run_theharvester(domain)
        else:
            partial = True
        if not any(k in targets for k in ("email", "username", "name", "phone")):
            if within_budget():
                findings += run_spiderfoot(domain)
            else:
                partial = True
    if url := targets.get("url"):
        if within_budget():
            findings += run_photon(url)
        else:
            partial = True
        if len(targets) == 1 and within_budget():
            findings += run_spiderfoot(url)

    result = {
        "status": "success",
        "scan_id": scan_id,
        "target": " · ".join(targets.values()),
        "queries": targets,
        "timestamp": utc_now(),
        "total_findings": len(findings),
        "findings": findings,
        "partial": partial,
        "source": "contabo-deep",
        "api_version": "contabo-deep-4",
    }

    try:
        (RESULT_PATH / f"{scan_id}.json").write_text(
            json.dumps(result, indent=2), encoding="utf-8"
        )
    except Exception:
        pass

    return jsonify(result)


@app.route("/api/health", methods=["GET"])
def health():
    sf_ok = False
    try:
        http_json("GET", "/ping", timeout=3.0)
        sf_ok = True
    except Exception:
        try:
            http_json("GET", "/scanlist", timeout=3.0)
            sf_ok = True
        except Exception:
            sf_ok = False
    key = (API_KEY or "").strip()
    key_hint = (
        f"{key[:2]}…{key[-2:]} (len={len(key)})" if len(key) >= 4 else f"(len={len(key)})"
    )
    return jsonify(
        {
            "ok": True,
            "spiderfoot": sf_ok,
            "spiderfoot_url": SPIDERFOOT_URL,
            "api_version": "contabo-deep-4",
            "modules": [
                "holehe",
                "maigret",
                "phoneinfoga",
                "theHarvester",
                "photon",
                "spiderfoot",
            ],
            "mode": "sequential-module",
            "api_key_len": len(key),
            "api_key_hint": key_hint,
        }
    )


if __name__ == "__main__":
    masked = (API_KEY[:3] + "…" + API_KEY[-2:]) if len(API_KEY) > 6 else "(short)"
    print(
        f"[synsight-deep] listening :5000 · SF={SPIDERFOOT_URL} · API_KEY={masked}",
        flush=True,
    )
    if "!" in API_KEY:
        print(
            "[synsight-deep] HINT: start with API_KEY='…' (single quotes). "
            "Bash expands !! in double quotes / unquoted.",
            flush=True,
        )
    app.run(host="0.0.0.0", port=5000)
