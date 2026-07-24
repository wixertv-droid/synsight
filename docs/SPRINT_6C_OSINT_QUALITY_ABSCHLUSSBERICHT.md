# Sprint 6C — OSINT Quality Upgrade (Enterprise)

**Branch:** `cursor/sprint-6c-osint-quality-7c12`  
**Basis:** Digital Leak Exposure / Google OSINT Stack (`main`-Linie)  
**Status:** Qualitäts-Upgrade abgeschlossen — Architektur unverändert

## Ziel

SynSight liefert präzisere, nachvollziehbare Google-OSINT-Ergebnisse
(Digital Identity / Cyber Security), ohne Dashboard, AnalyseCenter,
ErgebnisCenter, Design, SynCredits, Finanzbuchungen oder Provider-Anbindungen
zu ändern.

## Architektur (unverändert, Qualitätsschichten geschärft)

| Phase | Service                      | Sprint-6C-Qualität                                |
| ----- | ---------------------------- | ------------------------------------------------- |
| 1     | `IdentityFingerprintBuilder` | Vollständige Identitätsmatrix                     |
| 2     | `SearchPlanner`              | Prioritäts-Queries, max. **15**, keine Duplikate  |
| 3–4   | SerpAPI + Confidence Engine  | Entity-Checks + Bänder Bestätigt / Hoch / Möglich |
| 5     | `ProfileAggregator`          | Host-Aggregation (z. B. NexusMods → 1 Profil)     |
| 6     | `ResultVerifier`             | &lt;50 % verworfen                                |
| 7     | `ThreatEvaluator`            | Multi-Dimension Threat Matrix                     |
| 8     | `GeminiSummaryBuilder`       | Senior Digital Forensics Analyst, Fakten only     |

## Suchstrategie (neu priorisiert)

1. Vorname + Nachname + Wohnort
2. Vorname + Nachname + Firma
3. Vorname + Nachname
4. E-Mail (bis 3)
5. Telefon (bis 3)
6. Alias
7. Benutzername (Plattform-Dorks)
8. Domain

Zusatz nur bei vorhandenen Merkmalen und Restbudget: Business, Public Records,
Foren, max. 2 Adult/Niche (Bing). Adult-Queries dürfen Core-Identität **nicht**
verdrängen.

## Trefferqualität

- Confidence-Checks: Vorname, Nachname, Wohnort (inkl. frühere), Firma, Telefon,
  E-Mail, Alias, Benutzername, Domain, Social/Bild
- Bänder: **90–100 Bestätigt** · **70–89 Hohe Übereinstimmung** ·
  **50–69 Möglicher Treffer** · **&lt;50 nicht anzeigen**
- Namensvetter-Penalty bei fremden Großstädten
- Management Summary: Profile/Foren/Dokumente/Bilder/Firmen/Erwähnungen +
  öffentliche Telefon/Mail/Anschrift Ja/Nein + Confidence + Gesamtrisiko

## KI

Gemini ausschließlich zur Zusammenfassung. Persona:
**Senior Digital Forensics Analyst**.

Verboten: erfinden, ergänzen, interpretieren, beschönigen, verschweigen.
Abschnitte inkl. **Digitales Identitätsprofil** und klickbare Quellenlinks.
Aggregierte Profile werden an den Prompt übergeben.

## UI (keine Layout-Regression)

- Management Summary inhaltlich an Enterprise-OSINT angepasst
- Ergebnis-Karten: Confidence/Risiko/Identity-Match Info-Buttons
- Scan-Sequence: SOC-Logs (Fingerprint, Entity Graph, Threat Matrix, …)
- Administration bleibt im AnalyseCenter ausgeblendet (nur Dashboard)

## Kostenvergleich vorher / nachher

| Metrik                  | Vorher (Combinatorial / Adult-first)              | Nachher (Priority Planner)      |
| ----------------------- | ------------------------------------------------- | ------------------------------- |
| SerpAPI Calls / Analyse | oft bis 15, Budget teils durch Adult-Alias belegt | ≤ **15**, Core-Identität zuerst |
| DeHashed                | 1 Call (unverändert)                              | 1 Call (unverändert)            |
| Gemini                  | 1 Summary                                         | 1 Summary, Profiles im Payload  |
| SynCredits Google       | 2 (unverändert)                                   | 2 (unverändert)                 |

Erwartung: weniger unnötige Requests bei gleichen Caps, höhere Trefferpräzision
durch Priorität Name+Ort/Firma vor Niche-Queries.

## Performance

- Query-Cap und Dedup unverändert hart
- Host-Aggregation reduziert UI-/Gemini-Payload
- Canvas-Scan ohne Videos; nur leichte Counter-Animation

## Geänderte Dateien

- `src/lib/analysis/osint/search-planner.ts`
- `src/lib/analysis/osint/score-engine.ts`
- `src/lib/analysis/osint/gemini-summary-builder.ts`
- `src/lib/analysis/osint/index.ts`
- `src/lib/analysis/gemini-summary.ts`
- `src/lib/analysis/google/run-analysis.ts`
- `src/lib/analysis/hit-intel.ts`
- `src/lib/content/guidance.ts` (`osintGuidance`)
- `src/components/analysis/intelligence/ManagementOverviewPanel.tsx`
- `src/components/analysis/intelligence/IntelligenceHitCard.tsx`
- `src/components/analysis/intelligence/IntelligenceScanSequence.tsx`
- `tests/unit/analysis/osint-sprint6c.test.ts`
- `tests/unit/analysis/osint-sprint6b.test.ts`
- `docs/SPRINT_6C_OSINT_QUALITY_ABSCHLUSSBERICHT.md`

## Nicht geändert (Absicht)

Dashboard-Shell, AnalyseCenter-Struktur, ErgebnisCenter-Reiter, Design/Farben,
API-Architektur, SynCredits/Kosten, Finanzbuchungen, SerpAPI-/DeHashed-/Gemini-
Credentials, Datenbankschema.

## Offen für Sprint 6D

- Persistenter SERP-/Fingerprint-Cache (Redis) mit TTL
- Historical Diff / Timeline zwischen Analysen
- Automatisierte Entfernungs-Workflows mit Quellen-Templates
- Operator-Chat nur über verified Hits (RAG)
- Entity-Graph Persistenz im Ergebnis-Center
- Feinere Domain-/Handle-Disambiguierung bei Kurz-Aliases
