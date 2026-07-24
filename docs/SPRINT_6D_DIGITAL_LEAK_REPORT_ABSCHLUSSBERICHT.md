# Sprint 6D — Digital Leak & Exposure Enterprise Security Report

**Branch:** `cursor/sprint-6d-digital-leak-report-7c12`  
**Basis:** Sprint 6C OSINT Quality (`cursor/sprint-6c-osint-quality-7c12`)  
**Status:** Darstellung + KI-Qualität upgraded — API/Credits/DB-Schema unverändert

## Ergebnis

Der Digital Leak & Exposure Scan liefert einen Enterprise Security Report
im Layout der Google-Analyse: Management Summary, Leak-Detailkarten,
Digital-Forensics-KI, Maßnahmenplan und rechte SOC-Gauges.

Die bestehende Scan-Animation (Canvas, Entity Graph, Terminal, Schritte)
bleibt unverändert. Nur der Fortschrittsbalken entspricht jetzt dem
Landingpage-Mission-Progress (Glow, Marker, Energy-Flow, Puls).

## Geänderte / neue Dateien

### Neu

- `src/components/analysis/intelligence/MissionProgressBar.tsx`
- `src/lib/analysis/digital-exposure/report-metrics.ts`
- `docs/SPRINT_6D_DIGITAL_LEAK_REPORT_ABSCHLUSSBERICHT.md`

### Erweitert

- `src/lib/analysis/digital-exposure/types.ts` — Overview, Actions, ThreatMatrix, Attributes
- `src/lib/analysis/digital-exposure/dehashed-client.ts` — alle verfügbaren DeHashed-Felder (Presence/Masked)
- `src/lib/analysis/digital-exposure/run-analysis.ts` — Gemini-Anbindung, Overview/Actions
- `src/lib/analysis/digital-exposure/gemini-prep.ts` — live Digital Forensics Analyst Prompt + API
- `src/lib/analysis/digital-exposure/repository.ts` — v2 JSON-Meta in `data_classes_json`, AI-Persistenz
- `src/components/analysis/digital-exposure/DigitalExposureReportView.tsx` — Google-Parity UI
- `src/components/analysis/intelligence/IntelligenceScanSequence.tsx` — nur Progress-Bar ersetzt
- `src/app/globals.css` — Mission-Bar Energy/Pulse
- `src/lib/content/guidance.ts` — `leakGuidance` Info-Texte
- `tests/unit/analysis/digital-exposure.test.ts`

## Neue Komponenten / Services

| Baustein                             | Rolle                                                |
| ------------------------------------ | ---------------------------------------------------- |
| `MissionProgressBar`                 | Landingpage-identischer Ladebalken                   |
| `report-metrics`                     | Management Overview, Threat Matrix, Maßnahmenplan    |
| `DigitalExposureReportView`          | Enterprise Report (Rail, Gauges, Cards, KI, Actions) |
| `summarizeDigitalExposureWithGemini` | Live Gemini Forensics Summary                        |

## KI-Logik

Persona: **DIGITAL FORENSICS ANALYST**  
Abschnitte: Kurzlage · Sicherheitsanalyse · Leak-Quellen · Maßnahmenplan · Quellen  
Nur gelieferte DeHashed-Metadaten. Keine Halluzinationen, keine Beschönigung.
Kompromittierende Plattformen werden genannt, wenn in den Daten vorhanden.
Gemini-Calls werden wie bisher über `api_usage_events` verbucht.

## Verarbeitete DeHashed-Felder

Presence und ggf. maskierte Samples (nie Passwort-/Hash-Werte):

E-Mail · Telefon · Benutzername · Alias · Name · Vorname · Nachname · Straße ·
PLZ · Ort · Land · Geburtsdatum (Presence) · IP · Unternehmen · Domain ·
Passwort vorhanden · Hash vorhanden · Hashtyp · Collection · Obtained-from ·
Leak-Datum · Datensatzanzahl · Erst-/Letztfund · Confidence

Persistenz über bestehendes JSON-Feld `data_classes_json` (v2-Objekt) —
**kein Schema-Migration**.

## Nicht geändert (Absicht)

DeHashed-/Gemini-API-Anbindung, SynCredits, Kostenformel, Dashboard,
AnalyseCenter, ErgebnisCenter-Reiter, DB-Tabellenstruktur, Scan-Theater
(Canvas/Nodes/Terminal/Ablauf).

## Performance / Sicherheit

- Keine zusätzlichen DeHashed-Calls (gleiche Query-Strategie)
- +1 Gemini-Call pro Scan (wie Google-Modul) — faktisch und gebucht
- Passwortwerte weiterhin nie persistiert/angezeigt
- Maskierung für E-Mail/Telefon/Handles

## Tests

- TypeScript ✓
- ESLint (touched) ✓
- Vitest digital-exposure + insert-id + osint-sprint6c ✓

## Offen für Sprint 6E+

- Persistente Timeline/Diff zwischen Leak-Scans
- Logo-CDN für bekannte Breach-Marken
- Operator-Chat nur über Leak-Fakten
- Heatmap-Canvas statt vereinfachter Timeline-Liste
- Optional: Username-Queries auch im Digital-Leak-Modul (aktuell E-Mail+Telefon)
