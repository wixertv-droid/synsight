# Sprint 6B — Google-Analyse auf professionelles OSINT-Niveau

**Branch:** `cursor/sprint-6b-osint-quality-7c12`  
**Basis:** `cursor/gemini-token-billing-7c12`  
**Status:** Implementiert

## Ergebnis

Die Google-Analyse sucht gezielter, bewertet Treffer per Confidence Score und
zeigt nur hochwertige Ergebnisse. Das bestehende Premium-UI (Layout, Tabs,
Karten, Scan-Animation, Farben) bleibt erhalten — nur Logik, Filter und
Textinhalte wurden angehoben.

## Suchanfragen reduziert

| Vorher (typisch)                                                                     | Nachher (fest)                  |
| ------------------------------------------------------------------------------------ | ------------------------------- |
| oft 8–15+ SerpAPI-Calls (Name, Ort, Firma, E-Mails×3, Telefone×2, Aliase×3, Sites×3) | **max. 5** priorisierte Queries |

**Priorität (SearchPlanner):**

1. `"Vorname Nachname" Wohnort` (sonst nur Name)
2. `"Vorname Nachname" "Firma"`
3. E-Mail
4. Telefon
5. Alias / Benutzername

Parallelität: **2**. Identische Queries: **In-Memory-Cache (1 h)**.

### Erwartete Kostenersparnis (SerpAPI Starter ≈ €0,023 / erfolgreiche Suche)

| Szenario          |            Vorher |          Nachher |    Ersparnis |
| ----------------- | ----------------: | ---------------: | -----------: |
| Volles Profil     | ~12 Calls ≈ €0,28 | ≤5 Calls ≈ €0,12 | **~55–60 %** |
| Nur Name+Ort+Mail |  ~6 Calls ≈ €0,14 | ≤3 Calls ≈ €0,07 |    **~50 %** |

Gemini: nur noch Treffer mit Confidence **≥ 70 %** im Prompt → weniger Tokens.

## Neue Architektur (`src/lib/analysis/osint/`)

| Service                              | Rolle                                         |
| ------------------------------------ | --------------------------------------------- |
| `SearchPlanner`                      | max. 5 Queries, Priorität, Dedup              |
| `search-cache`                       | Query-Ergebnis-Cache                          |
| `ConfidenceScorer` / IdentityMatcher | +/- Gewichtung laut Sprint-Spec               |
| `GoogleResultClassifier`             | OSINT-Kategorien + Aggregate                  |
| `ResultVerifier`                     | <50 verwerfen, 50–69 möglich, ≥70 verifiziert |
| `SourceLinkBuilder`                  | klickbare Markdown-Quellen                    |
| `GeminiSummaryBuilder`               | strukturierter Prompt + verified-only Payload |

## UI (ohne Design-Regression)

- Scan-Texte angepasst (Schritte wie spezifiziert)
- KI-Lagebild: strukturierte Abschnitte + klickbare Quellen-Links
- Trefferkarten: Confidence, Quelle, Erkennungsdatum, Button **Original öffnen**
- „Mögliche weitere Treffer“ (50–69 %) einklappbar
- Standardliste: nur ≥ 70 %

## Geänderte / neue Dateien (Auswahl)

- `src/lib/analysis/osint/*` (neu)
- `src/lib/analysis/google/queries.ts`, `run-analysis.ts`, `module.ts`
- `src/lib/analysis/hit-intel.ts`, `gemini-summary.ts`, `ai-summary-text.ts`
- `src/components/analysis/google/GoogleIntelligenceReport.tsx`
- `src/components/analysis/intelligence/IntelligenceHitCard.tsx`
- `src/components/analysis/intelligence/AiSummaryWithLinks.tsx` (neu)
- `tests/unit/analysis/osint-sprint6b.test.ts` (neu)

## Testergebnisse

- Vitest analysis + finance: grün
- TypeScript: grün
- ESLint (geänderte Pfade): ohne Warnings

## Offen für Sprint 6C

- Persistenter SERP-Cache (Redis/DB) statt Prozess-Memory
- Model-spezifische Confidence-Kalibrierung / Learning
- Explizite SerpAPI-Cache-Hit-Erkennung (0 Credits seitens Provider)
- Batch/Flex Gemini-Tarif für Lagebild
- Entfernungs-Workflow (Button aktuell disabled)
