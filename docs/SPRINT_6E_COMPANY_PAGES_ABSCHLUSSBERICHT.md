# Sprint 6E+ – Unternehmen, Kontakt, Presse & Partnerschaften

## Überblick

Erweiterung des Footer-Bereichs **Unternehmen** um professionelle Unterseiten inklusive Formularsystem, Datenbankpersistenz, E-Mail-Vorbereitung und Admin-Verwaltung. Das bestehende Designsystem bleibt unverändert; neue Seiten nutzen Glass/Hardware-Panels, HUD-Labels und Space-Dark Theme.

## Neue Seiten

| Route       | Inhalt                                                               |
| ----------- | -------------------------------------------------------------------- |
| `/company`  | Über SynSight — Profil, Vision, futuristische Timeline               |
| `/contact`  | Premium-Kontaktformular                                              |
| `/partners` | Partnerschaftsbereiche + Anfrageformular                             |
| `/press`    | Pressebereich, Medienkontakt, Downloads (vorbereitet), Presseanfrage |

Footer-Links unter **Unternehmen** zeigen auf diese Routen (statt mailto-Platzhalter).

## Neue Komponenten

- `CompanyPage` — gemeinsames Shell (Zurück-Button, Header, Atmosphere)
- `CompanyTimeline` — vertikale Datenlinie mit Energiefluss & Scroll-Reveal
- `RequestFormShell` — wiederverwendbare Formularbasis (Loading, Fehler, Erfolg, Honeypot)
- `ContactForm` / `PartnerForm` / `PressForm`
- `AdminCommunicationsControl` — Kontakt & Kommunikation im Admin Control Center

## Datenbank

Migration **`011_company_communications.sql`**:

- `communication_settings` (Singleton: contact/press/partners E-Mails)
- `contact_requests`
- `partner_requests`
- `press_requests`

Status-Enum: `new` | `processing` | `answered` | `archived`

Drizzle-Schema in `src/lib/database/schema.ts` synchronisiert.

## API

| Methode | Pfad                        | Zweck                                    |
| ------- | --------------------------- | ---------------------------------------- |
| POST    | `/api/contact`              | Kontaktanfrage (Zod + Rate-Limit + CSRF) |
| POST    | `/api/partners`             | Partnerschaftsanfrage                    |
| POST    | `/api/press`                | Presseanfrage                            |
| GET     | `/api/admin/communications` | Settings + Anfragen                      |
| PUT     | `/api/admin/communications` | E-Mail-Ziele speichern                   |
| PATCH   | `/api/admin/communications` | Anfrage-Status ändern                    |

## Services

- `communications-service` — Submit, Admin-Listen, Status, Settings
- `email-service` — Stubs: `sendContactNotification`, `sendPressNotification`, `sendPartnerNotification` (queued, noch kein SMTP)

Spam-Schutz: Honeypot-Feld `website` (muss leer bleiben).

## Admin

Bereich **Kontakt & Kommunikation**:

- Ziel-E-Mails: `contact@synsight.de`, `press@synsight.de`, `partners@synsight.de` (editierbar)
- Anfragen je Kanal listen
- Status: Neu / In Bearbeitung / Beantwortet / Archiviert

## Tests

- Validierung, Communications-Service, E-Mail-Stubs, Migration 011
- TypeScript, ESLint, Vitest, Production Build — grün

## Keine Regressionen

Bestehende Landing-, Dashboard-, Auth- und Admin-Module unverändert in Design und Kernlogik; nur Footer-Links und Admin-Seite um Communications-Panel ergänzt.
