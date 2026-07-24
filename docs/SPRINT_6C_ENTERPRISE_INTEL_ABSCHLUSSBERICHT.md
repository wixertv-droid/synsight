# Sprint 6C — Enterprise Google Intelligence Engine

**Branch:** `cursor/sprint-6c-enterprise-intel-7c12`  
**Basis:** Sprint 6B (`cursor/sprint-6b-osint-quality-7c12`)  
**Status:** Implementiert

## Ergebnis

SynSight führt die Google-Analyse als **8-Phasen Enterprise OSINT Pipeline**.
Layout, Ergebnis-Center, Reiter und Dark Theme bleiben unverändert.

## Neue Analysearchitektur

| Phase | Service                                   | Inhalt                                  |
| ----- | ----------------------------------------- | --------------------------------------- |
| 1     | `IdentityFingerprintBuilder`              | Identitätsmatrix + Hash                 |
| 2     | `SearchPlanner`                           | max. 5 Queries mit Search Score         |
| 3–4   | SerpAPI + Entity/Confidence               | Collect + Match                         |
| 5     | `DuplicateResolver` / `ProfileAggregator` | Domain-Profile (z. B. 20 NexusMods → 1) |
| 6     | `ConfidenceEngine`                        | nachvollziehbare ✓/✗ Checks             |
| 7     | `ThreatEvaluator`                         | 7 Risikodimensionen                     |
| 8     | `GeminiSummaryBuilder`                    | Fakten-only Intelligence Report         |

Zusätzlich: `RecommendationEngine`, `SourceCollector`/`SourceLinkBuilder`, Query-Cache.

## Suchstrategie

Search Scores: Telefon **100** · Mail **95** · Name+Ort **90** · Name+Firma **80** · Alias **70** · Domain **65**.  
Nur vorhandene Profildaten. Parallelität **2**. Max. **5** SerpAPI-Requests.

## Trefferqualität

- Confidence mit Checkliste (Vorname, Nachname, Ort, Firma, Telefon, Mail, Alias)
- &lt;50 % verworfen · 50–69 % einklappbar · ≥70 % Standard + Gemini
- Host-Aggregation statt Seiten-Spam
- Sensitive Kategorien (Adult, Dating, Leak, Betrug …) werden klar benannt

## KI (Fakten statt Meinungen)

Neuer Prompt: Senior OSINT Analyst. Keine Vermutungen, keine Schönfärberei.
Abschnitte: Digitales Kurzprofil · Management-Summary · Profile · Erwähnungen · Risiken · Maßnahmen · Quellen.
Quellen als klickbare Markdown-Links.

## Analyseanimation

`IntelligenceScanSequence` ersetzt: modernes Enterprise-SOC UI (Canvas Entity Graph,
Live-Counter, 8-Phasen-Log). Keine Retro-/SciFi-Spielerei.

## Admin

Administration-Links in der Sidebar sind auf `/dashboard/analysis` **ausgeblendet**.
Analyse-Center-Texte ohne Admin-Menü-Hinweis.

## API-Kosten

Wie 6B: typisch ~50–60 % weniger SerpAPI-Calls vs. Altlast (≥8–15 → ≤5).
Zusätzlich: Host-Aggregation und verified-only Gemini senken Token-Last.

## Erwartete Genauigkeit

- Weniger False Positives durch Confidence ≥70 % Filter
- Bessere Profilwahrnehmung durch Aggregation
- Nachvollziehbare Checks statt undurchsichtiger Prozentwerte

## Geänderte / neue Dateien (Auswahl)

- `src/lib/analysis/osint/*` (Fingerprint, Aggregator, Threat, Recommendations, Prompt)
- `src/lib/analysis/google/run-analysis.ts`, `module.ts`
- `src/components/analysis/intelligence/IntelligenceScanSequence.tsx`
- `src/components/dashboard/DashboardSidebar.tsx`, `AnalysisCenter.tsx`
- `src/components/analysis/intelligence/IntelligenceHitCard.tsx`, `RiskOverviewPanel.tsx`
- `tests/unit/analysis/osint-sprint6c.test.ts`

## Testergebnisse

- Vitest analysis: grün
- TypeScript: grün
- ESLint (geänderte Pfade): ohne Warnings

## Offen für Sprint 6D

- Persistenter SERP-/Fingerprint-Cache (Redis)
- Timeline / Historical Diff zwischen Analysen
- Automatisierte Entfernungs-Workflows
- Operator-Chat auf Report-Fakten (RAG nur über verified hits)
- Erweiterte Entity Graph Persistenz im Ergebnis-Center
