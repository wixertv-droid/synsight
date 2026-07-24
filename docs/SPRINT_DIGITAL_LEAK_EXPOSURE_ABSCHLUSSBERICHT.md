# Sprint Abschlussbericht — Digital Leak & Exposure Scan

**Branch:** `cursor/digital-leak-exposure-7c12`  
**Datum:** 2026-07-24

## Ziel

Zusammenführung von Telefon- und E-Mail-Analyse zu einer gemeinsamen
**Digital Leak & Exposure Scan**-Sicherheitsanalyse (HIBP), integriert in
Analysecenter, SynCredits, Ergebniscenter und Admin-API-Einstellungen.

## Geänderte / neue Dateien (Auswahl)

### Datenbank

- `database/migrations/020_digital_leak_exposure.sql`
- `src/lib/database/schema.ts` — Tabellen + `api_usage_events.analysis_id`

### Analyse-Engine

- `src/lib/analysis/digital-exposure/types.ts`
- `src/lib/analysis/digital-exposure/module.ts`
- `src/lib/analysis/digital-exposure/mask.ts`
- `src/lib/analysis/digital-exposure/hibp-client.ts`
- `src/lib/analysis/digital-exposure/repository.ts`
- `src/lib/analysis/digital-exposure/run-analysis.ts`
- `src/lib/analysis/digital-exposure/gemini-prep.ts` (Facts-only Vorbereitung)

### API

- `src/app/api/analysis/digital-exposure/run/route.ts`
- `src/app/api/analysis/digital-exposure/latest/route.ts`

### UI

- `src/app/(platform)/dashboard/analysis/digital-exposure/page.tsx`
- `src/components/analysis/digital-exposure/DigitalExposurePageClient.tsx`
- `src/components/analysis/digital-exposure/DigitalExposureReportView.tsx`
- `src/components/dashboard/analysis/AnalysisTypeCard.tsx`
- `src/components/dashboard/results/ResultsCenter.tsx`
- `src/components/dashboard/results/ResultsCenterClient.tsx`
- `src/components/admin/views/AdminApiCredentialsView.tsx` — HIBP „API TESTEN“
- `src/components/profile/IdentityProfilePanel.tsx` — Exposure-Karte

### Pricing / Katalog / Guidance

- `src/lib/credits/pricing.ts` — Key `digital_leak_exposure` (8 SynCredits)
- `src/lib/dashboard/analysis-center-data.ts`
- `src/lib/content/guidance.ts`
- `src/lib/profile/module-readiness.ts`
- `src/lib/services/api-credentials-service.ts` — HIBP Live-Test
- `src/lib/services/admin-platform-service.ts`
- `src/lib/services/finance-service.ts` — `analysisId` in Usage-Events

### Tests / Report

- `tests/unit/analysis/digital-exposure.test.ts`
- `tests/unit/database/migrations.test.ts`
- `docs/SPRINT_DIGITAL_LEAK_EXPOSURE_ABSCHLUSSBERICHT.md`

## Neue Datenbanktabellen

| Tabelle                    | Zweck                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| `digital_exposure_scans`   | Scan-Metadaten (Status, Risk Score, Summary)                                    |
| `digital_exposure_results` | Findings (EMAIL/PHONE/PASSWORD_EXPOSURE/BREACH/SOURCE) — **ohne Passwortwerte** |
| `api_usage_logs`           | Provider, Request-Typ, Kosten, User, Analyse-ID, Zeitpunkt                      |

Zusätzlich: `api_usage_events.analysis_id`, Pricing-Seed `digital_leak_exposure`,
Deaktivierung von `phone_analysis` / `email_analysis`, `api_cost_settings` für HIBP.

## Neue API-Einstellungen

**Have I Been Pwned (HIBP)** unter Admin → Website → APIs & Integrationen:

- API Aktiv (JA/NEIN)
- API Key (verschlüsselt)
- Kosten über `api_cost_settings` (haveibeenpwned)
- Button **API TESTEN** → Subscription-Status-Probe

Ohne aktiven Key: Nutzerhinweis  
„Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator.“

## Sicherheitsregeln

- Nur verifizierte HIBP-Breaches (`IsVerified`)
- Keine erfundenen Treffer
- Keine Passwortwerte gespeichert oder angezeigt
- `PASSWORD_EXPOSURE` = Metadaten zu DataClasses (z. B. „Passwords“), keine Secrets
- Telefon: ehrliches „Keine bekannten Leaks“ über verfügbare APIs (HIBP prüft E-Mails)

## Gemini-Vorbereitung

`buildGeminiPrepPayload` liefert `mode: "facts_only"` inkl. Constraints.
`summarizeDigitalExposureWithGemini` ist Stub (`null`) für späteren Anschluss.

## Testresultate

| Check                                        | Ergebnis                                   |
| -------------------------------------------- | ------------------------------------------ |
| Unit: digital-exposure                       | ✓                                          |
| Unit: migrations (020)                       | ✓                                          |
| Unit: module-readiness                       | ✓                                          |
| TypeScript (`tsc --noEmit`)                  | ✓                                          |
| ESLint (betroffene Pfade)                    | ✓                                          |
| `next build` Compile + Lint/Types            | ✓                                          |
| `next build` Prerender `/dashboard/analysis` | ⚠ Umgebung ohne `DATABASE_URL` (bestehend) |

## Deploy

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/digital-leak-exposure-7c12
git pull origin cursor/digital-leak-exposure-7c12
npm ci
npm run db:migrate
npm run build
pm2 restart synsight
```

Danach im Admin HIBP-Key speichern und **API TESTEN**.

## Offene Punkte

1. **Telefon-Leaks:** aktuell kein dedizierter Phone-Breach-Provider — Anzeige ehrlich „keine bekannten Leaks“.
2. **Gemini-Report:** Facts-Payload vorbereitet, Zusammenfassung noch nicht live.
3. **Retention-UI:** Google-Report behält Speicherdauer-Dropdown; Exposure speichert dauerhaft in `digital_exposure_*` (Metadaten).
4. **Alte Module:** `phone_analysis` / `email_analysis` in DB deaktiviert; Katalog-Einträge bleiben für Historie.
5. **Rate Limits:** HIBP-Aufrufe mit ~1,6 s Pause zwischen E-Mails.
