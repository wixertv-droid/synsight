#!/usr/bin/env python3
"""
SynSight public demo scan API (Contabo).
Deterministic results per query: same email/username → same score & findings.
Different queries still get individualized scores/counts via SHA-256 seeding.

Deploy on Contabo:
  sudo cp this file to /opt/api.py
  # restart whatever runs it (systemd / screen / flask)
  # e.g.  pkill -f '/opt/api.py' ; nohup python3 /opt/api.py &
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_target(target: str) -> str:
    return re.sub(r"\s+", " ", (target or "").strip()).lower()


def detect_target_type(target: str) -> str:
    if re.match(r"[^@]+@[^@]+\.[^@]+", target):
        return "EMAIL"
    if re.match(r"^\+?[0-9\s\-()]{7,}$", target):
        return "PHONE"
    if "." in target and " " not in target:
        return "USERNAME"
    if " " in target or target[:1].isupper():
        return "NAME"
    return "USERNAME"


def stable_int(seed: str, min_v: int, max_v: int) -> int:
    """Stable pseudo-random int in [min_v, max_v] from seed string."""
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    value = int(digest[:8], 16)
    span = max_v - min_v + 1
    return min_v + (value % span)


def stable_pick(seed: str, options: list[str]) -> str:
    return options[stable_int(seed, 0, len(options) - 1)]


def create_finding(
    category: str,
    title: str,
    description: str,
    platform: str,
    risk: str,
    confidence: int,
) -> dict:
    return {
        "category": category,
        "title": title,
        "description": description,
        "platform": platform,
        "risk": risk.lower(),
        "confidence": confidence,
        "timestamp": utc_now_iso(),
    }


def build_findings(target: str, target_type: str, seed: str) -> tuple[list[dict], list[str]]:
    display = target  # keep original casing in prose
    findings: list[dict] = []
    platforms: list[str] = []

    if target_type == "NAME":
        profile_count = stable_int(f"{seed}|profiles", 2, 5)
        social_count = stable_int(f"{seed}|social", 2, 6)
        platforms = ["LinkedIn", "Company Registers", "Google Index", "Pipl"]
        findings.append(
            create_finding(
                "PROFESSIONAL",
                "Berufliche Profile & Netzwerke",
                f"Die Korrelations-Engine hat für '{display}' "
                f"{profile_count} übereinstimmende Profile in beruflichen Netzwerken "
                "identifiziert. Historische Positionsdaten und Firmenzugehörigkeiten "
                "sind öffentlich abrufbar.",
                "LinkedIn / Xing",
                "Low",
                stable_int(f"{seed}|c1", 84, 96),
            )
        )
        findings.append(
            create_finding(
                "FOOTPRINT",
                "Öffentliche Register & Dokumente",
                "Es wurden Einträge in öffentlichen Registern (z.B. Handelsregister "
                "oder Vereinsregister) gefunden, die mit dem Namen in Verbindung stehen. "
                "Metadaten weisen auf Standort-Informationen hin.",
                "Public Records",
                "Medium",
                stable_int(f"{seed}|c2", 70, 86),
            )
        )
        findings.append(
            create_finding(
                "SOCIAL",
                "Social Media Spuren",
                f"Mehrere potenziell zugehörige Social-Media-Accounts wurden entdeckt "
                f"({social_count} Signale). Die Bildrückwärtssuche deutet auf eine "
                "Wiederverwendung von Profilbildern über verschiedene Plattformen hin.",
                "Instagram / FB",
                "Medium",
                stable_int(f"{seed}|c3", 58, 78),
            )
        )

    elif target_type == "EMAIL":
        breach_count = stable_int(f"{seed}|breaches", 2, 6)
        service_count = stable_int(f"{seed}|services", 4, 11)
        dump_a = stable_pick(
            f"{seed}|dump_a",
            ["Collection #1", "Cit0day", "LinkedIn 2021", "Adobe", "Dropbox"],
        )
        dump_b = stable_pick(
            f"{seed}|dump_b",
            ["AntiPublic", "COMB", "Verifications.io", "Canva", "MyFitnessPal"],
        )
        platforms = ["HaveIBeenPwned", "DarkWeb Dumps", "GitHub", "Gravatar"]
        findings.append(
            create_finding(
                "BREACH",
                "Kritischer Datenleak-Treffer",
                f"Die Adresse '{display}' taucht in {breach_count} bekannten "
                f"Darkweb-Datensätzen auf (u.a. '{dump_a}' und '{dump_b}'). "
                "Zugehörige gehashte Passwörter wurden möglicherweise kompromittiert.",
                "Breach Database",
                "High",
                stable_int(f"{seed}|c1", 94, 99),
            )
        )
        findings.append(
            create_finding(
                "DEV",
                "Technische Fußabdrücke",
                "Die E-Mail ist in öffentlichen Code-Repositories (Commits) hinterlegt. "
                "Es können Rückschlüsse auf verwendete Technologien und Arbeitszeiten "
                "gezogen werden.",
                "GitHub",
                "Medium",
                stable_int(f"{seed}|c2", 78, 92),
            )
        )
        findings.append(
            create_finding(
                "OSINT",
                "Verknüpfte Online-Dienste",
                f"Über Reverse-Lookups konnten {service_count} Online-Dienste "
                "(Foren, E-Commerce, Social Media) identifiziert werden, bei denen "
                "diese E-Mail als Login-Faktor registriert ist.",
                "OSINT Engine",
                "Medium",
                stable_int(f"{seed}|c3", 74, 90),
            )
        )

    elif target_type == "PHONE":
        platforms = ["Truecaller", "WhatsApp OSINT", "Sync.me"]
        findings.append(
            create_finding(
                "MESSENGER",
                "Messenger-Verfügbarkeit",
                f"Die Nummer '{display}' ist bei mehreren Messenger-Diensten "
                "(WhatsApp, Telegram) registriert. Ein Profilbild und der Status "
                "'Zuletzt online' sind öffentlich einsehbar.",
                "Telegram API",
                "High",
                stable_int(f"{seed}|c1", 90, 98),
            )
        )
        findings.append(
            create_finding(
                "LOOKUP",
                "Caller-ID Leak",
                "Die Nummer wurde in globalen Telefonbuch-Datenbanken und "
                "Crowdsourced-Apps (z.B. Sync.me) mit einem Klarnamen verknüpft "
                "aufgefunden.",
                "Caller ID DB",
                "Medium",
                stable_int(f"{seed}|c2", 80, 94),
            )
        )

    else:  # USERNAME
        platform_count = stable_int(f"{seed}|platforms", 8, 18)
        platforms = ["Namechk", "Reddit", "Gaming Forums", "Pastebin"]
        findings.append(
            create_finding(
                "IDENTITY",
                "Plattformübergreifende Nutzung",
                f"Der Alias '{display}' wird auf über {platform_count} verschiedenen "
                "Plattformen verwendet (Foren, Gaming, Social). Ein Tracking der "
                "Online-Aktivitäten ist dadurch stark vereinfacht.",
                "Username Matrix",
                "Medium",
                stable_int(f"{seed}|c1", 88, 97),
            )
        )
        findings.append(
            create_finding(
                "LEAK",
                "Erwähnung in Text-Dumps",
                "Der Benutzername wurde in öffentlichen Text-Dumps "
                "(Pastebin/Ghostbin) in Verbindung mit möglichen Konfigurationsdateien "
                "oder Log-Einträgen gefunden.",
                "Pastebin",
                "High",
                stable_int(f"{seed}|c2", 68, 86),
            )
        )

    return findings, platforms


def risk_level_for(target_type: str, score: int) -> str:
    if target_type == "EMAIL" or score >= 80:
        return "Kritisch"
    if score >= 65:
        return "Erhöht"
    if score >= 45:
        return "Mittel"
    return "Niedrig"


@app.route("/api/scan", methods=["POST"])
def scan_target():
    data = request.json or {}
    target = (data.get("query") or "").strip()

    if not target:
        return jsonify({"status": "error", "message": "Kein Ziel angegeben"})

    try:
        target_type = detect_target_type(target)
        seed = f"{target_type}|{normalize_target(target)}"
        findings, platforms_found = build_findings(target, target_type, seed)

        # Stable score band per target type — same query always same score.
        if target_type == "EMAIL":
            exposure_score = stable_int(f"{seed}|score", 72, 94)
        elif target_type == "PHONE":
            exposure_score = stable_int(f"{seed}|score", 68, 90)
        elif target_type == "USERNAME":
            exposure_score = stable_int(f"{seed}|score", 58, 86)
        else:
            exposure_score = stable_int(f"{seed}|score", 48, 78)

        risk_level = risk_level_for(target_type, exposure_score)

        return jsonify(
            {
                "status": "success",
                "query": target,
                "query_type": target_type,
                "findings": findings,
                "platforms": platforms_found,
                "exposure_score": exposure_score,
                "risk_level": risk_level,
                "summary": (
                    f"Die Deep-Scan Simulation für '{target}' wurde abgeschlossen. "
                    f"Exposure-Score {exposure_score}/100 · Risiko: {risk_level}. "
                    "Es wurden Spuren über mehrere Vektoren hinweg korreliert. "
                    "Eine detaillierte Analyse der Ergebnisse wird empfohlen."
                ),
            }
        )
    except Exception as exc:  # noqa: BLE001 — surface to client as demo error
        return jsonify({"status": "error", "message": str(exc)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
