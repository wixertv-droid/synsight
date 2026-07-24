# Sprint Abschlussbericht — Digital Leak & Exposure Scan

**Branch:** `cursor/digital-leak-exposure-7c12`  
**Datum:** 2026-07-24  
**Update:** Provider von HIBP auf **DeHashed.com** umgestellt

## Ziel

Zusammenführung von Telefon- und E-Mail-Analyse zu einer gemeinsamen
**Digital Leak & Exposure Scan**-Sicherheitsanalyse (**DeHashed.com**), integriert in
Analysecenter, SynCredits, Ergebniscenter und Admin-API-Einstellungen.

## Provider

| Feld          | Wert                                      |
| ------------- | ----------------------------------------- |
| Provider-Code | `dehashed`                                |
| API           | `POST https://api.dehashed.com/v2/search` |
| Auth-Header   | `DeHashed-Api-Key`                        |
| Env-Fallback  | `DEHASHED_API_KEY` / `DEHASHED_API_TOKEN` |
| Queries       | `email:"…"`, `phone:"…"`                  |

**Sicherheit:** Passwort- und Hash-Werte aus der API-Antwort werden **nie** gespeichert —
nur Boolean-Flags (`hasPasswordExposure` / `hasHashedPasswordExposure`) und DataClasses.

## Geänderte / neue Dateien (Auswahl)

### Datenbank

- `database/migrations/020_digital_leak_exposure.sql`
- `database/migrations/021_dehashed_provider.sql` — HIBP → DeHashed Migration
- `src/lib/database/schema.ts`

### Analyse-Engine

- `src/lib/analysis/digital-exposure/dehashed-client.ts`
- `src/lib/analysis/digital-exposure/run-analysis.ts`
- `src/lib/analysis/digital-exposure/module.ts`
- `src/lib/analysis/digital-exposure/gemini-prep.ts`

### Admin / UI / API

- Admin-Provider `dehashed` + **API TESTEN**
- Analysecenter / Ergebniscenter / Startseite unverändert im Layout

## Neue Datenbanktabellen

| Tabelle                    | Zweck                       |
| -------------------------- | --------------------------- |
| `digital_exposure_scans`   | Scan-Metadaten              |
| `digital_exposure_results` | Findings ohne Passwortwerte |
| `api_usage_logs`           | Provider-Usage-Audit        |

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

Danach Admin → APIs: **DeHashed.com** Account-E-Mail + API-Key speichern und **API TESTEN**
(Auth läuft über Header `DeHashed-Api-Key` gegen `POST /v2/search`).

**Wichtig:** Nach Deploy Katalog absichern:

```bash
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:ensure-catalog
# Falls migrate an Checksum scheitert:
# mysql -u synsight -p synsight < database/fixes/repair_digital_leak_catalog.sql
```

Zusätzlich schreibt `ensureDigitalLeakCatalog` beim App-Start und bei Katalog-/API-Kosten-Reads
die Pricing-/Cost-Zeilen nach (Raw-SQL + Force-Repair), damit Digital Leak & DeHashed auch
erscheinen, wenn Migrate vergessen wurde.

Prüfen nach Deploy:

- Analysecenter QUICK: **Digital Leak & Exposure Scan** (8 SynCredits), **kein** Telefon/E-Mail
- Ergebniscenter: Tab Digital Leak & Exposure
- Admin → Preisverwaltung: `digital_leak_exposure` aktiv
- Admin → Finanzen → API-Kosten: Provider `dehashed`

Schema-Tabellen für den Scan selbst (`digital_exposure_scans` / `_results`) erfordern
weiterhin erfolgreiches `db:migrate` (020).

## Offene Punkte

1. Gemini-Zusammenfassung: Facts-Payload vorbereitet, noch Stub.
2. DeHashed-Credits/Balance erscheinen im Admin-Test-Detail, wenn die API sie liefert.
3. Falls zuvor ein HIBP-Key gespeichert wurde: Migration `021` benennt den Provider um, sofern noch kein `dehashed`-Eintrag existiert — sonst Key unter DeHashed neu speichern.
