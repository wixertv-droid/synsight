# Admin Finanzen — Abschlussbericht

**Branch:** `cursor/admin-finanzen-7c12`  
**Basis:** Google Results Intel Report (`cursor/google-results-intel-report-7c12`)  
**Status:** Implementiert

## Ergebnis

Im Admin Control Center gibt es den neuen Bereich **Finanzen (A4)** mit drei
Unterseiten:

1. **Einnahmen & Ausgaben** — Cyber-HUD mit Saldo, 14-Tage-Diagramm und
   Kosten nach Provider
2. **Zahlungsanbieter** — Stripe/PayPal & Co. anlegen, API-Keys und
   Webhook-Secrets AES-verschlüsselt speichern
3. **API-Ausgaben** — Preis pro Abfrage setzen, Events öffnen
   (Query, Request-Anzahl, Stückpreis, Gesamtkosten, Meta)

Die bisherige SerpAPI-Detailbox auf der Admin-Übersicht wurde entfernt und
durch eine kurze Finanz-Kurzansicht mit Link nach `/admin/finanzen/uebersicht`
ersetzt. Support bleibt **A5**.

## Datenbank

Migration `017_admin_finanzen.sql` (idempotent):

| Änderung            | Inhalt                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `payment_providers` | `encrypted_api_key`, `encrypted_webhook_secret`, `environment`, `notes`  |
| `api_cost_settings` | SerpAPI: €/Request; Gemini: `billing_mode=per_token` + €/1M Input/Output |
| `api_usage_events`  | Verbuchte API-Calls mit Kosten, Detail und Meta-JSON                     |

## APIs

| Methode | Pfad                                   | Funktion                                     |
| ------- | -------------------------------------- | -------------------------------------------- |
| GET     | `/api/admin/finance/overview`          | Einnahmen/Ausgaben + Chart-Daten             |
| GET/PUT | `/api/admin/finance/payment-providers` | Zahlungsanbieter listen/speichern            |
| GET/PUT | `/api/admin/finance/api-costs`         | Preise + Event-Liste; `?eventId=` für Detail |

Mutationen prüfen Admin-Rolle und CSRF-Origin.

## Kostenbuchung

- Jede Google-Analyse schreibt **ein** SerpAPI-Event (`google_analysis`) mit
  `requestCount = Anzahl Suchanfragen`, Query-Liste in `meta_json` und Kosten
  = Requests × Preis aus `api_cost_settings`.
- Einzelne SerpAPI-Calls aktualisieren weiterhin die Live-Metriken unter
  Website → APIs; die Finanzbuchung ist davon entkoppelt (schlägt Metrics fehl,
  werden Kosten trotzdem erfasst).
- Gemini-Zusammenfassungen werden über **usageMetadata** verbucht
  (Modell-Priorität: `gemini-3.6-flash`):
  - USD-Formel (Standard): `(prompt/1M)×$1,50 + (candidates/1M)×$7,50`
  - Dashboard EUR: gleiche Formel mit Admin-Preisen
    `$1,50×0,92=€1,38` / `$7,50×0,92=€6,90` pro 1M Tokens
    (`018_gemini_token_billing.sql`, Admin → Finanzen → API-Ausgaben).
  - Token-Counts und angewandte Preise liegen in `meta_json`.
- Health-Checks laufen als `health_check`.
- SerpAPI-Kosten = nur **erfolgreiche** Suchen × `cost_per_request_eur`
  (Starter-Default: `$25/1000 = $0,025 ≈ €0,023`, Migration `019_serpapi_starter_pricing.sql`).
  Fehler/Timeouts → 0 €.

## Deploy

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/admin-finanzen-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```
