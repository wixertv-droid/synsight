# Sprint 6E — Username Intelligence Scan (Enterprise Edition)

**Branch:** `cursor/sprint-6e-username-intel-7c12`  
**Basis:** `cursor/dehashed-unmask-identifiers-7c12`  
**Status:** Neues Analysemodul integriert — bestehende Google-/Leak-/Dashboard-/Credits-/API-Architektur unverändert

## Ergebnis

Neues Modul **Username Intelligence Scan** im AnalyseCenter (Schnellstart) neben Google Analyse und Digital Leak & Exposure. Flow: SynCredits → ErgebnisCenter → bestehende Scan-Animation (angepasste Statuszeilen + Landingpage-Mission-Progress) → Enterprise-Report im Google-/Leak-Look.

APIs ausschließlich **SerpAPI** + **Gemini**. Maximal **5–8** hochwertige Suchanfragen, Identity Confidence &lt; 60 % ausgeblendet.

## Geänderte / neue Dateien

### Neu

- `database/migrations/023_username_intelligence.sql`
- `src/lib/analysis/username/*` (types, module, planner, platform-detect, confidence, finance, settings, ensure-schema, repository, report-metrics, gemini-prep, run-analysis)
- `src/lib/credits/ensure-username-catalog.ts`
- `src/app/api/analysis/username/{run,latest}/route.ts`
- `src/app/api/admin/username-module/route.ts`
- `src/app/(platform)/dashboard/analysis/username/page.tsx`
- `src/components/analysis/username/UsernamePageClient.tsx`
- `src/components/analysis/username/UsernameIntelligenceReportView.tsx`
- `tests/unit/analysis/username-intelligence.test.ts`
- `docs/SPRINT_6E_USERNAME_INTEL_ABSCHLUSSBERICHT.md`

### Erweitert (Integration, keine Regressionen)

- `src/lib/credits/pricing.ts` — Key `username_intelligence` (10 SynCredits)
- `src/lib/dashboard/analysis-center-data.ts` — Schnellstart-Karte
- `src/components/dashboard/analysis/AnalysisTypeCard.tsx` — Start-Href
- `src/components/dashboard/results/ResultsCenter.tsx` / `ResultsCenterClient.tsx`
- `src/lib/services/pricing-service.ts` — Catalog ensure
- `src/lib/profile/module-readiness.ts`, `src/lib/content/guidance.ts`
- `src/lib/database/schema.ts` — neue Tabellen
- `src/components/admin/views/AdminAnalysisModulesView.tsx` — Modul-Einstellungen
- `src/components/admin/views/AdminFinanceApiCostsView.tsx` — Finanzblock
- `src/lib/admin/navigation.ts` — Finanzen-Eintrag
- `database/ensure-catalog.ts` — heilt auch Migration 023

## Neue Datenbanktabellen

| Tabelle                    | Zweck                                              |
| -------------------------- | -------------------------------------------------- |
| `username_analysis`        | Scan-Lauf (Status, Scores, Summary)                |
| `username_hits`            | Plattform-Treffer revisionssicher                  |
| `username_reports`         | Vollständiger Report-JSON + Graph/Timeline/Heatmap |
| `username_ai_reports`      | Gemini Digital-Identity-Reports                    |
| `username_cost_logs`       | API-/SynCredit-Kosten je Analyse                   |
| `username_module_settings` | Admin: aktiv, API, Limits, Finanzen                |

Zusätzlich: `analysis_pricing` Zeile `username_intelligence`.

## Neue Services

| Service                                          | Rolle                                     |
| ------------------------------------------------ | ----------------------------------------- |
| `planUsernameQueries`                            | 5–8 deduplizierte High-Value Queries      |
| `detectPlatform` / `detectProblemTags`           | Plattform- & Risiko-Erkennung             |
| `scoreUsernameHit`                               | Identity Confidence (Hide &lt; 60 %)      |
| `runUsernameIntelligenceScan`                    | SerpAPI-Pipeline + Persistenz + Kostenlog |
| `summarizeUsernameWithGemini`                    | Digital Identity Analyst (facts only)     |
| `computeUsernameFinance`                         | Auto-Kalkulation Kosten/Gewinn            |
| `ensureUsernameCatalog` / `ensureUsernameSchema` | Runtime self-heal                         |

## Suchstrategie

Priorität (nur sinnvolle Queries, keine Doppelten):

1. `"username"`
2. `"username" profile`
3. `"username" forum`
4. `"username" social`
5. `"username" gaming` (wenn Gaming-Signale)
6. `"username" github` (wenn Dev-Signale / Fallback)
7. `"username" reddit`
8. optional zweiter Alias

Cap: `max(5, min(8, maxQueries))` aus Admin-Einstellungen.

## API-Verbrauch / Kosten (Erwartung)

| Position                              | Wert                                         |
| ------------------------------------- | -------------------------------------------- |
| SerpAPI Calls / Analyse               | typisch **6** (Range 5–8), Cache zählt nicht |
| Gemini Calls / Analyse                | **1** (facts-only)                           |
| SerpAPI Ø                             | 6 × 0,023 € ≈ **0,138 €**                    |
| Gemini Ø (Settings-Default)           | **0,002 €**                                  |
| Geschätzte API-Kosten                 | ≈ **0,140 €**                                |
| Default SynCredits                    | **10** (≈ 0,10 € Umsatz bei 0,01 €/Credit)   |
| Kosten pro Analyse (mit 100 % Markup) | ≈ **0,280 €** (Kalkulationspreis)            |
| Gewinn / Analyse                      | Umsatz − echte API-Kosten (Admin-HUD live)   |

## Trefferqualität

- Hostname-/Inhalt-Erkennung für GitHub, Steam, Reddit, Social, Foren, Dating, Darknet u. a.
- Unbekannte Domains → automatische Plattform aus Hostname
- Dedupe über Host+Path
- Confidence-Bänder: 95–100 Bestätigt · 80–94 Sehr wahrscheinlich · 60–79 Möglich · &lt;60 hidden

## Performance

- Parallelität SerpAPI: 3
- Search-Cache wie Google-Modul
- Scan-Animation min. ~9–10 s + API-Ready Mission-Bar

## Admin

- **Website → Analysemodule:** aktiv/deaktivieren, SynCredits, API, max Queries, Länder, Sprache, Ergebnislimit, Confidence-Min
- **Finanzen → Username Intelligence / API-Ausgaben:** SynCredits, SerpAPI-/Gemini-Kosten, Gewinnaufschlag, Mindestgewinn, Auto-Berechnung

## Nicht geändert (Absicht)

Google Analyse, Digital Leak Pipeline/Maskierung, Dashboard-Layout, ErgebnisCenter-/AnalyseCenter-Grundstruktur, bestehende Modul-Schemas, SynCredits-Kern, Zahlungsbuchungen.

## Offene Optimierungen

- Logo-Assets je Plattform (aktuell Monogramm)
- Optionale Länder-/Sprach-Parameter an SerpAPI-Engine durchreichen (Settings vorhanden)
- Identity-Graph als Canvas-Visual (aktuell strukturierte Node-Liste)
- Credit-Wert dynamisch aus Paketpreisen statt Fix 0,01 €

## Deploy (VPS)

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/sprint-6e-username-intel-7c12
git pull origin cursor/sprint-6e-username-intel-7c12
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:ensure-catalog
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```
