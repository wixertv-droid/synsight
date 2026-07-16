# SynSight — MariaDB Integration Abschlussbericht

**Datum:** 2026-07-16  
**Branch:** `cursor/mariadb-integration-7c12`  
**PR:** https://github.com/wixertv-droid/synsight/pull/10

---

## Analyse (vorher)

| Existierte                                       | Fehlte / anzupassen                                         |
| ------------------------------------------------ | ----------------------------------------------------------- |
| Drizzle Schema, Connection, Repos, Services, API | Leere DB ohne Tabellen/Seeds auf dem Server                 |
| Migrationen 001–003 + Migrator                   | `db:status`, Migration 004 (role/compat)                    |
| Seed-Runner                                      | Admin-E-Mail `admin@synsight.local`, echte `role`           |
| `db:migrate` / `db:seed`                         | MariaDB `multipleStatements` für PREPARE/EXECUTE            |
| Env-Docs teilweise                               | `mysql://` in Zod rejected → Login/API kaputt mit echter DB |

---

## Geänderte / neue Dateien

- `database/migrations/004_admin_role_and_compat.sql` _(neu)_
- `database/migrate.ts` — `multipleStatements: true`
- `database/status.ts` _(neu)_ → `npm run db:status`
- `database/seeds/001_admin_user.sql` / `seed.ts` — Admin-Seed
- `src/lib/database/schema.ts` — role, location, trace fields; Enum-Spaltennamen fix
- `src/lib/repositories/mysql/user-repository.ts` — liest `role` aus DB
- `src/lib/config/env.ts` — akzeptiert `mysql://` DATABASE_URL
- `src/lib/database/connection.ts` — klarere Fehlermeldung
- `package.json` — `db:status`
- `.env.example`, `.env.local.example`
- `.github/workflows/ci.yml` — MariaDB 11.4 + status
- `docs/DATABASE_MARIADB_INTEGRATION.md`
- `scripts/verify-admin-login.ts`
- `tests/unit/database/migrations.test.ts`, `tests/setup.ts`

---

## Tabellen (nach Migration)

**BASE TABLE:**  
`users`, `profiles`, `sessions`, `user_tokens`, `security_profiles`, `analysis_reports`, `analysis_report_items`, `subscription_plans`, `subscriptions`, `payments`, `user_settings`, `audit_events`, `profile_aliases`, `profile_phone_numbers`, `profile_additional_emails`, `social_accounts`, `profile_images`, `digital_traces`, `_synsight_schema_migrations`

**VIEW (Domain-Aliase):**  
`identity_images`, `analysis_items`, `audit_logs`

---

## Migration Status

```
npm run db:migrate   → 001–004 applied (idempotent, 2. Lauf = skip)
npm run db:status    → UP TO DATE
```

---

## Seed Status

```
Admin: admin@synsight.local / admin
Hash:  Argon2id (kein Klartext)
Role:  admin
```

Zusätzlich: Profile, Security Profile, Settings, Protect-Subscription.

---

## Login Test Ergebnis

| Test                           | Ergebnis                                                 |
| ------------------------------ | -------------------------------------------------------- |
| Argon2id verify + Session-Repo | ✅ success, Session-Row aktiv                            |
| `POST /api/auth/login`         | ✅ 200, `redirectTo: /dashboard`, Session-Cookie gesetzt |
| Health `database`              | ✅ ok                                                    |

---

## Quality Gates

| Command             | Ergebnis    |
| ------------------- | ----------- |
| `npm run typecheck` | ✅          |
| `npm run lint`      | ✅          |
| `npm run test`      | ✅ 38 tests |
| `npm run build`     | ✅          |

---

## Server-Befehle (Debian 13)

```bash
# .env.production / PM2 env
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/synsight
REQUIRE_DATABASE=true
SESSION_SECRET=<min 32 chars>
APP_URL=https://synsight.de

npm run db:status
npm run db:migrate
npm run db:seed
pm2 restart synsight   # oder entsprechender Prozessname
```

Login: **admin@synsight.local** / **admin**

---

## Offene Probleme

1. Admin-Passwort `admin` ist nur für Erstsetup — sofort ändern.
2. Compatibility-Views sind read-oriented; Schreibpfade nutzen weiter die physischen Tabellen.
3. Kein automatisches `ALTER` für bestehende DBs mit abweichendem Schema außerhalb der Migrationskette.

---

## Empfehlungen

1. Nach Seed Admin-Passwort rotieren und `admin@synsight.local` nur intern nutzen.
2. MariaDB-Backup (`mariadb-dump`) vor jeder neuen Migration.
3. CI-Job `database` als Gate vor Production-Deploy behalten.
4. Nächste DB-Schritte: Premium-Billing-Felder, OSINT-Job-Queues, Report-Versionierung — auf dieser Basis aufsetzen.
