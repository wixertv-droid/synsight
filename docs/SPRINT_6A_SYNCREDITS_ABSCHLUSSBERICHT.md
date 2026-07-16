# Sprint 6A — SynCredits Zahlungssystem — Abschlussbericht

**Branch:** `cursor/syncredits-sprint-6a-7c12`  
**Status:** DATABASE + API + UI READY (Checkout-Provider anbindbar)

---

## Ziel

SynCredits ersetzen das Abo-Modell. Nutzer zahlen paketbasiert und verbrauchen Credits nur für gestartete Analysen. Mehrere Zahlungsanbieter sind im Datenmodell vorbereitet.

---

## Neue Migration

`database/migrations/007_syncredits.sql`

| Tabelle                | Zweck                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `credit_accounts`      | 1:1 Guthaben pro User                                                |
| `credit_transactions`  | revisionssicheres Ledger                                             |
| `credit_packages`      | Starter/Focus/Protect/Command                                        |
| `payment_providers`    | manual, stripe, paypal, apple_pay, google_pay, sepa                  |
| `invoices`             | Rechnungsvorbereitung                                                |
| `usage_logs`           | Analyse-Verbrauch                                                    |
| `payments` (erweitert) | `purpose`, `package_id`, `provider_id`, `invoice_id`, `amount_cents` |

Pakete:

| Code      | Credits | Bonus | Preis |
| --------- | ------- | ----- | ----- |
| pack_500  | 500     | 0     | 5 €   |
| pack_1700 | 1500    | 200   | 15 €  |
| pack_3600 | 3000    | 600   | 30 €  |
| pack_7800 | 6000    | 1800  | 60 €  |

---

## Zentrale Preise

`src/lib/credits/pricing.ts` — Analysepreise ohne Codeänderung an den Call-Sites anpassbar.

---

## Architektur

Route → `credits-service` → `credits-repository` (MySQL / In-Memory)

Admin-ready: `adminGrantCredits` / `adminRevokeCredits` im Service (Typen `admin_grant` / `admin_revoke`).

Checkout:

- `CREDITS_CHECKOUT_MODE=instant` (Default): sofortige Gutschrift (manuell/Test)
- `CREDITS_CHECKOUT_MODE=provider`: Payment `pending` für externe PSP

---

## API

| Methode | Pfad                    | Auth       |
| ------- | ----------------------- | ---------- |
| GET     | `/api/credits`          | ja         |
| GET     | `/api/credits/history`  | ja         |
| GET     | `/api/credits/packages` | öffentlich |
| POST    | `/api/credits/purchase` | ja + CSRF  |
| POST    | `/api/credits/consume`  | ja + CSRF  |
| GET     | `/api/pricing`          | öffentlich |

---

## UI

- Landing: `SynCreditsSection` (`#syncredits`), Nav-Link, DemoScanner ohne Monatsabo
- Dashboard: `CreditsPanel` + Header-Chip Guthaben
- `ConsumeConfirm` für „Diese Analyse kostet XX SynCredits“

---

## Wichtige Dateien

- `database/migrations/007_syncredits.sql`
- `src/lib/credits/pricing.ts`
- `src/lib/repositories/credits-repository.ts`
- `src/lib/repositories/mysql/credits-repository.ts`
- `src/lib/services/credits-service.ts`
- `src/app/api/credits/**`
- `src/app/api/pricing/route.ts`
- `src/components/sections/SynCreditsSection.tsx`
- `src/components/dashboard/CreditsPanel.tsx`
- `docs/SPRINT_6A_SYNCREDITS_ABSCHLUSSBERICHT.md`

---

## Server-Update

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/syncredits-sprint-6a-7c12
git pull origin cursor/syncredits-sprint-6a-7c12
npm ci

DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:status
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run build

pm2 delete synsight
pm2 start ecosystem.config.cjs --update-env
pm2 save
```

In `.env.production`:

```dotenv
CREDITS_CHECKOUT_MODE=instant
CREDITS_PAYMENT_PROVIDER=manual
```

---

## Quality Gates

| Command             | Result      |
| ------------------- | ----------- |
| `npm run typecheck` | ✅          |
| `npm run lint`      | ✅          |
| `npm run test`      | ✅ 67 tests |
| `npm run build`     | ✅          |

## Produktionsreife

| Bereich                   | Einschätzung                          |
| ------------------------- | ------------------------------------- |
| Ledger / Packages / Usage | Produktionsreif                       |
| Instant-Checkout          | Test-/Staging-reif                    |
| Stripe/PayPal/…           | Datenmodell bereit, Webhooks folgen   |
| UI Landing/Dashboard      | Produktionsreif im bestehenden Design |

**SPRINT 6A FREIGEGEBEN FÜR SERVER-DEPLOY (instant checkout)**
