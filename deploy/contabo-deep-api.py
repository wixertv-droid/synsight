#!/usr/bin/env python3
"""
SynSight Contabo Free DemoScanner API — fast public modules only.

Free/logged-out scan modules:
  - holehe      (email)
  - maigret     (username)
  - phoneinfoga (phone)

SpiderFoot, theHarvester and Photon are intentionally not part of this free
landing-page API. They are too slow/heavy for the public guest scan and belong
to paid/deep analysis flows.

Auth:
  Authorization: Bearer $API_KEY
  or X-API-Key: $API_KEY

Preferred body:
  {"query":"name@example.com", "module":"holehe"}
  {"query":"username", "module":"maigret"}
  {"query":"+4915112345678", "module":"phoneinfoga"}

Legacy body:
  {"email":"…", "username":"…", "phone":"…"}
  or {"query":"…"} with auto-detection.

Default port is 5002. Override with API_PORT=5002.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("API_KEY", "").strip()
API_PORT = int(os.environ.get("API_PORT", "5002"))
RESULT_PATH = Path(os.environ.get("RESULT_PATH", "/tmp/synsight_results"))
RESULT_PATH.mkdir(parents=True, exist_ok=True)

HOLEHE_TIMEOUT = int(os.environ.get("HOLEHE_TIMEOUT", "45"))
MAIGRET_TIMEOUT = int(os.environ.get("MAIGRET_TIMEOUT", "55"))
PHONE_TIMEOUT = int(os.environ.get("PHONEINFOGA_TIMEOUT", "35"))

EXTRA_BIN_DIRS = [
    p
    for p in os.environ.get(
        "TOOL_PATH",
        "/usr/local/bin:/usr/bin:/root/.local/bin:/opt/bin:/app",
    ).split(":")
    if p
]

ALLOWED_MODULES = {"holehe", "maigret", "phoneinfoga"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def check_auth(req) -> bool:
    expected = API_KEY
    if not expected:
        return False
    auth = (req.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer ") and auth[7:].strip() == expected:
        return True
    if auth == expected:
        return True
    if (req.headers.get("X-API-Key") or "").strip() == expected:
        return True
    return False


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
        )
        if probe.returncode == 0:
            return ["python3", "-m", name]
    except Exception:
        pass

    return None


def tool_status() -> dict[str, str]:
    mapping = {
        "holehe": resolve_bin("holehe", "HOLEHE_BIN"),
        "maigret": resolve_bin("maigret", "MAIGRET_BIN"),
        "phoneinfoga": resolve_bin("phoneinfoga", "PHONEINFOGA_BIN"),
    }
    return {name: " ".join(cmd) if cmd else "MISSING" for name, cmd in mapping.items()}


def missing_tool(source: str, name: str) -> list[dict[str, Any]]:
    return [
        {
            "source": source,
            "category": "ERROR",
            "title": f"{name} nicht gefunden",
            "description": (
                f"{name} wurde auf dem Scanner-Server nicht gefunden. "
                f"Prüfe `which {name}` oder setze {name.upper()}_BIN=/pfad."
            ),
            "risk": "low",
            "confidence": 0,
        }
    ]


def clean_line(text: str) -> str:
    ansi = re.compile(r"\x1b\[[0-9;]*m")
    return ansi.sub("", text).strip()


def detect_legacy_query(target: str) -> dict[str, str]:
    t = target.strip()
    if t.startswith("+") or re.match(r"^\d[\d\s()-]{6,}$", t):
        return {"phone": t}
    if "@" in t:
        return {"email": t}
    return {"username": t}


def collect_targets(data: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key in ("email", "username", "phone"):
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
        return missing_tool("holehe", "holehe")
    try:
        result = subprocess.run(
            [*bin_cmd, email, "--only-used"],
            capture_output=True,
            text=True,
            timeout=HOLEHE_TIMEOUT,
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
                            "description": f"Holehe meldet genutzten Account auf {platform}.",
                            "risk": "medium",
                            "confidence": 80,
                        }
                    )
        if not findings and result.returncode != 0:
            err = (result.stderr or result.stdout or "holehe exit non-zero")[:300]
            findings.append({"source": "holehe", "category": "ERROR", "error": err})
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "holehe", "category": "ERROR", "error": str(exc)})
    return findings


def run_maigret(username: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("maigret", "MAIGRET_BIN")
    if not bin_cmd:
        return missing_tool("maigret", "maigret")
    try:
        result = subprocess.run(
            [*bin_cmd, username, "--timeout", "15", "--no-color"],
            capture_output=True,
            text=True,
            timeout=MAIGRET_TIMEOUT,
        )
        for line in result.stdout.splitlines():
            line = clean_line(line)
            urls = re.findall(r"https?://\S+", line)
            for url in urls:
                findings.append(
                    {
                        "source": "maigret",
                        "category": "USERNAME",
                        "platform": "Social/Web",
                        "url": url.rstrip(",.;)"),
                        "title": "Username-Treffer",
                        "description": url.rstrip(",.;)"),
                        "risk": "medium",
                        "confidence": 75,
                    }
                )
        if not findings and result.returncode != 0:
            err = (result.stderr or result.stdout or "maigret exit non-zero")[:300]
            findings.append({"source": "maigret", "category": "ERROR", "error": err})
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "maigret", "category": "ERROR", "error": str(exc)})
    return findings[:40]


def run_phoneinfoga(number: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    bin_cmd = resolve_bin("phoneinfoga", "PHONEINFOGA_BIN")
    if not bin_cmd:
        return missing_tool("phoneinfoga", "phoneinfoga")
    try:
        result = subprocess.run(
            [*bin_cmd, "scan", "-n", number],
            capture_output=True,
            text=True,
            timeout=PHONE_TIMEOUT,
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
            err = clean_line((result.stderr or "phoneinfoga exit non-zero")[:300])
            findings.append({"source": "phoneinfoga", "category": "ERROR", "error": err})
    except Exception as exc:  # noqa: BLE001
        findings.append({"source": "phoneinfoga", "category": "ERROR", "error": str(exc)})
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
            "source": module or "unknown",
            "category": "ERROR",
            "error": f"Unknown module: {module}",
        }
    ]


def persist_result(result: dict[str, Any]) -> None:
    try:
        scan_id = str(result.get("scan_id") or uuid.uuid4())
        (RESULT_PATH / f"{scan_id}.json").write_text(
            json.dumps(result, indent=2), encoding="utf-8"
        )
    except Exception:
        pass


@app.route("/api/scan", methods=["POST"])
def scan():
    if not check_auth(request):
        return jsonify({"status": "error", "error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    targets = collect_targets(data)
    module = normalize_module(str(data.get("module") or ""))

    if module:
        if module not in ALLOWED_MODULES:
            return jsonify({"status": "error", "error": f"module not allowed: {module}"}), 400
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
            "source": "contabo-free",
            "api_version": "contabo-free-1",
        }
        persist_result(result)
        return jsonify(result)

    if not targets:
        return jsonify({"status": "error", "error": "missing query"}), 400

    scan_id = str(uuid.uuid4())
    findings: list[dict[str, Any]] = []
    if email := targets.get("email"):
        findings += run_holehe(email)
    if username := targets.get("username"):
        findings += run_maigret(username)
    if phone := targets.get("phone"):
        findings += run_phoneinfoga(phone)

    result = {
        "status": "success",
        "scan_id": scan_id,
        "target": " · ".join(targets.values()),
        "queries": targets,
        "timestamp": utc_now(),
        "total_findings": len(findings),
        "findings": findings,
        "partial": False,
        "source": "contabo-free",
        "api_version": "contabo-free-1",
    }
    persist_result(result)
    return jsonify(result)


@app.route("/api/health", methods=["GET"])
def health():
    tools = tool_status()
    missing = [name for name, path in tools.items() if path == "MISSING"]
    return jsonify(
        {
            "ok": True,
            "api_version": "contabo-free-1",
            "mode": "sequential-free-modules",
            "modules": ["holehe", "maigret", "phoneinfoga"],
            "auth_required": True,
            "api_key_configured": bool(API_KEY),
            "port": API_PORT,
            "tools": tools,
            "tools_missing": missing,
        }
    )


if __name__ == "__main__":
    print(
        f"[synsight-free] listening :{API_PORT} · modules=holehe,maigret,phoneinfoga · auth={'yes' if API_KEY else 'missing'}",
        flush=True,
    )
    app.run(host="0.0.0.0", port=API_PORT)
