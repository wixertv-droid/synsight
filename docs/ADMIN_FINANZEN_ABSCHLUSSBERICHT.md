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

| Änderung            | Inhalt                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `payment_providers` | `encrypted_api_key`, `encrypted_webhook_secret`, `environment`, `notes` |
| `api_cost_settings` | Preis pro Request (Seed: serpapi, gemini, openai, stripe, paypal)       |
| `api_usage_events`  | Verbuchte API-Calls mit Kosten, Detail und Meta-JSON                    |

## APIs

| Methode | Pfad                                   | Funktion                                     |
| ------- | -------------------------------------- | -------------------------------------------- |
| GET     | `/api/admin/finance/overview`          | Einnahmen/Ausgaben + Chart-Daten             |
| GET/PUT | `/api/admin/finance/payment-providers` | Zahlungsanbieter listen/speichern            |
| GET/PUT | `/api/admin/finance/api-costs`         | Preise + Event-Liste; `?eventId=` für Detail |

Mutationen prüfen Admin-Rolle und CSRF-Origin.

## Kostenbuchung

- Jede SerpAPI-Suche schreibt ein `api_usage_events`-Event inkl. Query.
- Gemini-Zusammenfassungen werden ebenfalls verbucht (inkl. Modell-Fallback-Versuche).
- Health-Checks laufen als `health_check` (nicht als normale Suche).
- Kosten = `request_count × cost_per_request_eur` aus `api_cost_settings`.

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
