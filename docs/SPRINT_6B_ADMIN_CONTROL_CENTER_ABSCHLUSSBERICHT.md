# Sprint 6B — Admin Control Center — Abschlussbericht

**Branch:** `cursor/admin-control-center-7c12`  
**Basis:** Sprint 6A SynCredits  
**Status:** Implementiert, Security- und Build-Gates grün

## Ergebnis

Das Admin Control Center ist als geschützter SOC-Bereich unter `/admin`
implementiert. Es ist ausschließlich für aktive Sessions mit `role=admin`
sichtbar und erreichbar. Normale Benutzer werden auf `/dashboard`
zurückgeleitet; Admin-APIs antworten serverseitig mit `403 Forbidden`.

## Datenbank

Neue Migration:

- `database/migrations/008_admin_control_center.sql`

Erweiterung `credit_transactions`:

| Spalte               | Zweck                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| `performed_by`       | ID des ausführenden Administrators                                        |
| `reason`             | verpflichtender, revisionssicherer Grund                                  |
| `transaction_source` | purchase, analysis, bonus, refund, admin_credit, admin_remove, adjustment |

Zusätzliche Indizes:

- `credit_transactions_performed_by_idx`
- `credit_transactions_source_idx`

Bestehende Datensätze werden aus `created_by_admin_id`, `description` und
`type` zurückgefüllt.

## Sicherheit

Mehrschichtiger Schutz:

1. Edge-Middleware schützt `/admin` und prüft `session.role`.
2. Admin-Seite prüft die DB-validierte Session erneut.
3. Jeder Admin-API-Endpunkt prüft Authentifizierung und `role=admin`.
4. Credit-Mutationsendpunkte verwenden CSRF-Origin-Schutz.
5. Service-Layer prüft die Rolle nochmals (Defense in Depth).
6. Änderungen speichern Admin-ID, Zeitpunkt, Ziel-User, Betrag, Grund,
   Transaktionsquelle und vorbereitete IP-Adresse.
7. Guthabenänderung erfolgt atomar und kann den Kontostand nicht unter null
   setzen.

## Neue API-Endpunkte

| Methode | Pfad                        | Funktion                             |
| ------- | --------------------------- | ------------------------------------ |
| GET     | `/api/admin/users?q=`       | Suche Name, Alias, Email, User-ID    |
| GET     | `/api/admin/user/:id`       | User, Guthaben, Transaktionen        |
| POST    | `/api/admin/credits/add`    | Credits gutschreiben                 |
| POST    | `/api/admin/credits/remove` | Credits abziehen                     |
| GET     | `/api/admin/system`         | System-, Server-, DB- und Userstatus |

Alle Endpunkte benötigen `role=admin`.

## Oberfläche

- Admin-Menü erscheint nur bei `role=admin`.
- Route `/admin` nutzt das bestehende Dashboard-/Premium-Design.
- Systemstatus, Serverstatus, Datenbankstatus und Version.
- Benutzer-, Administrator- und Registrierungszahlen.
- Benutzersuche nach Name, Alias, Email und ID.
- Credit-Gutschrift/-Abzug mit Betrag, Grund und Pflichtbestätigung.
- Premium-Coming-Soon-Karten für:
  - Finanzübersicht
  - Umsätze
  - Zahlungsanbieter
  - KI-Auslastung
  - API-Verbrauch
  - Benutzerstatistiken
  - Analysestatistiken
  - Systemlogs
  - Audit-Protokolle
  - Support

## Architektur

```text
React UI
  → Admin API (Auth + Role + CSRF)
    → admin-service (Business-Regeln + Audit)
      → admin-repository / credits-repository / audit-repository
        → MariaDB
```

Keine Credit- oder Berechtigungs-Business-Logik liegt in React-Komponenten.

## Neue Dateien

- `database/migrations/008_admin_control_center.sql`
- `src/app/(platform)/admin/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/user/[id]/route.ts`
- `src/app/api/admin/credits/add/route.ts`
- `src/app/api/admin/credits/remove/route.ts`
- `src/app/api/admin/system/route.ts`
- `src/components/admin/AdminUserControl.tsx`
- `src/lib/admin/access.ts`
- `src/lib/admin/credits-route.ts`
- `src/lib/repositories/admin-repository.ts`
- `src/lib/repositories/mysql/admin-repository.ts`
- `src/lib/services/admin-service.ts`
- `src/lib/validation/admin.ts`
- `tests/unit/api/admin-routes.test.ts`
- `tests/unit/services/admin-service.test.ts`

## Geänderte Kern-Dateien

- `src/middleware.ts`
- `src/lib/auth/config.ts`
- `src/lib/database/schema.ts`
- `src/lib/repositories/index.ts`
- `src/lib/repositories/credits-repository.ts`
- `src/lib/repositories/mysql/credits-repository.ts`
- `src/lib/services/credits-service.ts`
- `src/components/dashboard/DashboardSidebar.tsx`
- `tests/unit/database/migrations.test.ts`
- `tests/unit/auth/route-guards.test.ts`
- `e2e/auth.spec.ts`

## Tests

| Gate                | Ergebnis                         |
| ------------------- | -------------------------------- |
| `npm run typecheck` | ✅                               |
| `npm run lint`      | ✅                               |
| `npm run test`      | ✅ 76 Tests                      |
| `npm run build`     | ✅                               |
| `npm run test:e2e`  | ✅ 6 Tests (inkl. Rollenprüfung) |

## Server-Update

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/admin-control-center-7c12
git pull origin cursor/admin-control-center-7c12
npm ci

DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:status
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run build

pm2 delete synsight
pm2 start ecosystem.config.cjs --update-env
pm2 save
```

Danach als `admin@synsight.local` anmelden. Der Menüpunkt
**Administration** erscheint automatisch.

## Produktionsreife

- Rollen- und API-Schutz: produktionsreif
- Credit-Änderungen/Audit: produktionsreif
- Admin-SOC-UI: produktionsreif
- Coming-Soon-Module: absichtlich ohne Business-Logik
