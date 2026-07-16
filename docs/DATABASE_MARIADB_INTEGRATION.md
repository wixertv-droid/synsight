# SynSight — MariaDB Integration Analysis & Architecture

**Stand:** 2026-07-16  
**Ziel:** Leere MariaDB-Datenbank `synsight` auf Debian 13 vollständig befüllen und anbinden.

---

## 1. Analyse — Was existiert?

| Bereich                     | Status                                              | Pfad / Hinweis                                |
| --------------------------- | --------------------------------------------------- | --------------------------------------------- |
| Drizzle Config              | ✅                                                  | `drizzle.config.ts` → MySQL/MariaDB dialect   |
| Schema (Drizzle)            | ✅                                                  | `src/lib/database/schema.ts`                  |
| Connection Pool             | ✅                                                  | `src/lib/database/client.ts`, `connection.ts` |
| Repository Layer            | ✅                                                  | `src/lib/repositories/*`                      |
| Service Layer               | ✅                                                  | `src/lib/services/*`                          |
| Auth API                    | ✅                                                  | `/api/auth/*`                                 |
| Migrator                    | ✅                                                  | `database/migrate.ts` (Lock + Checksum)       |
| Migration 001               | ✅                                                  | Core: users, profiles, sessions, …            |
| Migration 002               | ✅                                                  | Production identity + social_accounts         |
| Migration 003               | ✅                                                  | digital_traces, profile_images                |
| Seed Runner                 | ✅                                                  | `database/seeds/seed.ts`                      |
| Admin Seed SQL              | ✅                                                  | `database/seeds/001_admin_user.sql`           |
| `npm run db:migrate`        | ✅                                                  | vorhanden                                     |
| `npm run db:seed`           | ✅                                                  | vorhanden                                     |
| `npm run db:status`         | ❌ fehlte → wird ergänzt                            |
| `role` Spalte               | ❌ fehlte → Migration 004                           |
| Admin Email Server-tauglich | ⚠️ war `admin@synsight.de` → `admin@synsight.local` |
| `.env.local` Template       | ⚠️ dokumentiert in `.env.example`                   |

### Architektur (bereits korrekt)

```
Frontend → API Routes → Services → Repositories → Database (mysql2/Drizzle)
```

Keine direkten SQL-Zugriffe aus React-Komponenten.

---

## 2. Was fehlte auf dem Server?

1. **Keine Tabellen** — Migrationen wurden noch nicht ausgeführt
2. **Keine Benutzer** — Seed nicht ausgeführt
3. **Keine klare `db:status` Prüfung**
4. **Admin-Rolle nur soft** (`username === "admin"`) — jetzt echte `role`-Spalte
5. **Seed-E-Mail** nicht auf lokale Server-Domain abgestimmt

---

## 3. Tabellen-Mapping (Anforderung ↔ Implementierung)

| Anforderung       | Tabelle in DB       | Bemerkung                      |
| ----------------- | ------------------- | ------------------------------ |
| users             | `users`             | + `role` (004)                 |
| profiles          | `profiles`          | PK = `user_id` (1:1)           |
| sessions          | `sessions`          | `session_token_hash`           |
| social_accounts   | `social_accounts`   | Instagram, Facebook, …         |
| digital_traces    | `digital_traces`    | + `source`, `risk_level` (004) |
| identity_images   | `profile_images`    | Pfade only, kein BLOB          |
| security_profiles | `security_profiles` | Scores / Monitoring            |
| analysis_reports  | `analysis_reports`  | KI-Vorbereitung                |
| analysis_items    | `analysis_items`    | JSON `metadata`                |
| audit_logs        | `audit_events`      | Security Audit                 |

Zusätzliche Produktionstabellen (bereits in 001/002):  
`email_verification_tokens`, `password_reset_tokens`, `login_attempts`, `account_lockouts`, `csrf_tokens`, `schema_migrations`.

---

## 4. Server-Befehle (Debian + MariaDB)

```bash
# .env.local / .env.production
DATABASE_URL="mysql://synsight_user:STRONG_PASSWORD@localhost:3306/synsight"
REQUIRE_DATABASE=true

npm run db:status    # Verbindung + Migration-Stand
npm run db:migrate   # Idempotent, mehrfach sicher
npm run db:seed      # Admin + Profile + Security Profile
```

### Admin Login

| Feld     | Wert                          |
| -------- | ----------------------------- |
| E-Mail   | `admin@synsight.local`        |
| Passwort | `admin`                       |
| Hash     | Argon2id (nie Klartext in DB) |
| Rolle    | `admin`                       |

---

## 5. Foreign Keys & Indizes

Alle Kern-FKs mit `ON DELETE CASCADE` wo sinnvoll.  
Indizes auf Email, Username, Session-Token-Hash, Expiry, User-FKs.

Migrationen nutzen `IF NOT EXISTS` / Information-Schema Guards und sind **mehrfach ausführbar**.
