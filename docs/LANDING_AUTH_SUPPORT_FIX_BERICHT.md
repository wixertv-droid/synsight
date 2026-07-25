# Bericht — Passwort-Reset, Support-Tickets, Landing-Preise & E-Mails

**Branch:** `cursor/landing-auth-support-fix-7c12`  
**Datum:** 2026-07-25  
**Basis:** RC-2 Hardening

---

## Fehler 1 — Passwort vergessen

### Ursache

- Flow war vorhanden, Zustellung aber oft unsichtbar (`EMAIL_DELIVERY_MODE=log-link` / SMTP-Fehler ohne Await).
- Preview-Link nur bei `NODE_ENV!==production`, nicht bei Log-Link-Modus.

### Fix

- `password-reset-service`: Delivery wird **awaited**, Template `password-reset-email.ts` unverändert genutzt.
- Bei SMTP-Fehler: Fallback-Log der Reset-URL (Token bleibt gültig).
- API liefert `previewToken` wenn `EMAIL_DELIVERY_MODE=log-link` (auch Production/Ops).
- Seiten: `/forgot-password`, `/reset-password` · Login-Link „Passwort vergessen?“

### Produktion

In `.env.production` setzen:

```dotenv
EMAIL_DELIVERY_MODE=provider
APP_URL=https://synsight.de
```

SMTP wie bei Verifizierungsmails.

---

## Fehler 2 — Footer Support → Ticket

### Fix

- Footer **Support** / **Technischer Kontakt** / **Datenschutzanfrage** → `/support` (Formular)
- Neu: `support_requests`, API `POST /api/support`, Seite `/support`
- Admin: **Support → Nachrichten → Kanal „Support“**

### Admin-Pfad

`/admin/support/nachrichten` → Reiter **Support**

---

## Fehler 3 — Landing-Preise

### Fix

- SynCredits-Pakete + Analysepreise laden live aus `/api/pricing` (`cache: no-store`).
- Keine Hardcoded-Euro-Beträge mehr als Fallback.

### Admin-Einstellung (wo ändern)

**Admin → Marketing → Preise**  
Route: `/admin/marketing/preise`

Dort:

1. **SynCredits-Pakete** (Starter/Focus/Protect/Command …) → erscheinen unter „Keine Abonnements…“
2. **Analysepreise** (aktive Module) → Liste „ANALYSEPREISE“ darunter

---

## Fehler 4 — Öffentliche E-Mails admin-steuerbar

### Neu in Admin → Support → Nachrichten (Einstellungen oben)

| Feld                   | Verwendung                                |
| ---------------------- | ----------------------------------------- |
| Kontakt E-Mail         | Footer, Impressum, Kontakt, Security      |
| Presse E-Mail          | Presse-Seite                              |
| Partner E-Mail         | Partner-Benachrichtigungen                |
| **Support E-Mail**     | Ticket-Benachrichtigung an Admin-Postfach |
| **Datenschutz E-Mail** | Datenschutz-Seite / Privacy               |

Public API: `GET /api/site-emails`

Support-UI-Links führen zum Ticket-Formular, nicht mehr auf `mailto:support@…`.

---

## Datenbank

Migration: `026_support_tickets_and_public_emails.sql`

- Tabelle `support_requests`
- Spalten `support_email`, `privacy_email` in `communication_settings`

---

## Deploy (bekannte Form)

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/landing-auth-support-fix-7c12
git pull origin cursor/landing-auth-support-fix-7c12
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:ensure-catalog
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 status
curl -sI https://synsight.de | head -5
```

Danach prüfen:

1. Login → Passwort vergessen → E-Mail / Log-Link → neues Passwort
2. Footer Support → Ticket → Admin Support-Kanal
3. Landing SynCredits-Preise = Admin Marketing → Preise
4. Admin Support → Nachrichten: Support-/Datenschutz-E-Mail ändern → Footer/Impressum/Datenschutz
