# Adminbereich Neuaufbau — Abschlussbericht

Datum: 2026-07-20  
Branch: `cursor/admin-restructure-7c12`

## Zusammenfassung

Der SynSight-Adminbereich wurde von einer einzelnen Seite mit Hash-Ankern in eine **viergliedrige SOC-Struktur** überführt. Alle bestehenden Admin-APIs, Komponenten und Datenbanktabellen bleiben erhalten — nichts wurde entfernt.

---

## Neue Seiten

| Bereich               | Route                         | Inhalt                                                 |
| --------------------- | ----------------------------- | ------------------------------------------------------ |
| Dashboard             | `/admin`                      | 4 Live-Kacheln (Benutzer, Marketing, Website, Support) |
| Benutzer Hub          | `/admin/benutzer`             | Modul-Übersicht                                        |
| Benutzer Unterseiten  | `/admin/benutzer/[slug]`      | 13 Unterpunkte (Übersicht, Verwaltung, Suche, …)       |
| Benutzerprofil        | `/admin/benutzer/profil/[id]` | 360°-Profil (Identität, Credits, Analysen, Timeline)   |
| Marketing Hub         | `/admin/marketing`            | Modul-Übersicht                                        |
| Marketing Unterseiten | `/admin/marketing/[slug]`     | Preise, SynCredits, Promotionen, …                     |
| Website Hub           | `/admin/website`              | Modul-Übersicht                                        |
| Website Unterseiten   | `/admin/website/[slug]`       | System, API, Analysemodule, Bilder, …                  |
| Support Hub           | `/admin/support`              | Modul-Übersicht                                        |
| Support Unterseiten   | `/admin/support/[slug]`       | Nachrichten, Tickets, Benutzersuche, …                 |

**Legacy-Redirects (Hash):**

- `#pricing-management` → `/admin/marketing/preise`
- `#promotions-management` → `/admin/marketing/promotionen`
- `#admin-communications` → `/admin/support/nachrichten`

---

## Verschobene Adminfunktionen

| Bisher                          | Neu                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| `AdminUserControl` auf `/admin` | `/admin/benutzer/gutschriften`, `/admin/benutzer/verwaltung` |
| `AdminPricingControl`           | `/admin/marketing/preise`, `/admin/marketing/syncredits`     |
| `AdminPromotionsControl`        | `/admin/marketing/promotionen`                               |
| `AdminCommunicationsControl`    | `/admin/support/nachrichten`                                 |
| Systemstatus-Karten             | `/admin` Dashboard + `/admin/website/systemstatus`           |

---

## Neue Services

- `admin-dashboard-service.ts` — Dashboard-KPIs für 4 Kacheln
- `admin-user-profile-service.ts` — Vollprofil, User-Liste, Audit, Sessions

## Erweiterte Services

- `admin-service.ts` — erweiterte Systemstatistiken
- `admin-repository` — `getUserOverviewStats`, `listUsers`, `listUserSessions`, `listAuditEvents`

## Neue APIs

| Methode | Pfad                            | Funktion                     |
| ------- | ------------------------------- | ---------------------------- |
| GET     | `/api/admin/dashboard`          | Dashboard-Übersicht          |
| GET     | `/api/admin/users/overview`     | Benutzer-KPIs                |
| GET     | `/api/admin/users/list`         | Paginierte Benutzerliste     |
| GET     | `/api/admin/users/[id]/profile` | Vollständiges Benutzerprofil |
| GET     | `/api/admin/audit`              | Audit-Events                 |

**Alle bestehenden `/api/admin/*` Endpunkte unverändert.**

---

## Datenbank

### Migration `013_admin_platform_settings.sql`

| Tabelle             | Zweck                                    |
| ------------------- | ---------------------------------------- |
| `platform_settings` | Singleton für Bild-/Upload-Einstellungen |
| `api_credentials`   | Verschlüsselte API-Keys (Vorbereitung)   |

**Keine Tabellen gelöscht. Keine Spalten entfernt.**

Drizzle-Schema ergänzt: `platformSettings`, `apiCredentials`.

---

## Neue Komponenten

- `AdminSubNav`, `AdminPageShell`, `AdminLegacyHashRedirect`
- `AdminViewHost` — generischer View-Router
- `AdminUserViews`, `AdminUserProfilePanel`, `AdminDashboardView`
- `AdminSystemStatusView`, `AdminAnalysisModulesView`, `AdminApiCredentialsView`, `AdminImageSettingsView`

---

## Verbesserungen

- Responsive Unter-Navigation pro Bereich
- Info-Tooltips (ⓘ) auf jeder Admin-Seite
- Benutzertabelle mit „Profil öffnen“
- Live-Dashboard-Kacheln
- Analysemodule Ein/Aus über bestehende Pricing-API
- Hash-Kompatibilität für alte Links

## Module in Vorbereitung (Placeholder, keine Regression)

Tickets (vollständig), CMS, Logs, Referral, erweiterte Rollen (Support/Moderator), API-Key-UI mit PUT-Endpunkt.

---

## Tests

- `npm run typecheck` — erfolgreich
- `tests/unit/services/admin-service.test.ts` — 12/12 bestanden
- `tests/unit/api/admin-routes.test.ts` — bestanden
- `tests/unit/admin/navigation.test.ts` — neu

## Build

Production-Build erfordert `DATABASE_URL` (bestehendes Verhalten). TypeScript und Unit-Tests fehlerfrei.

---

## Deploy

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/admin-restructure-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```
