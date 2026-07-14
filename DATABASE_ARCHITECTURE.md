# SynSight Database Architecture

## Overview

SynSight uses a layered architecture designed for self-hosted MySQL 8 deployments without vendor lock-in:

```
Frontend (Next.js)
    ↓
API Layer (Route Handlers)
    ↓
Service Layer (lib/services)
    ↓
Repository Layer (lib/repositories)
    ↓
Database Adapter (lib/database/client.ts)
    ↓
MySQL 8 (via mysql2 + Drizzle ORM)
```

When `DATABASE_URL` is not set, repositories automatically fall back to in-memory implementations so the UI remains runnable during local development.

## ORM Decision: Drizzle

| Criterion | Drizzle ORM | Prisma |
|-----------|-------------|--------|
| Next.js compatibility | Excellent — server-only, no edge constraints for DB ops | Good, but heavier client |
| MySQL support | Native via `drizzle-orm/mysql-core` | Full support |
| Migrations | `drizzle-kit` + reference SQL | Prisma Migrate |
| Performance | Lightweight, SQL-first, minimal overhead | Query engine adds latency |
| Maintainability | Schema in TypeScript, maps cleanly to repository pattern | Higher-level abstraction, less SQL control |

**Decision: Drizzle ORM** — lighter runtime, SQL transparency, and a natural fit for the existing repository/service layering on a self-hosted MySQL server.

## Directory Structure

```
src/lib/database/
  connection.ts    # mysql2 connection pool
  client.ts        # Drizzle adapter (getDatabase)
  schema.ts        # Drizzle table definitions
  types.ts         # Infrastructure types

database/
  migrations/
    001_initial_schema.sql
  seeds/
    001_admin_user.sql
    seed.ts

src/lib/repositories/
  user-repository.ts
  session-repository.ts
  profile-repository.ts
  security-repository.ts
  mysql/           # MySQL implementations
  index.ts         # Factory (auto-selects backend)
```

## Tables

### Core Identity

| Table | Purpose |
|-------|---------|
| `users` | Accounts with Argon2id password hashes |
| `profiles` | Personal data (1:1 with users) |
| `sessions` | Server-side session records for audit and revocation |
| `user_tokens` | Password reset, email verification, API keys |
| `user_settings` | Theme, locale, notification preferences |

### Security & Analysis

| Table | Purpose |
|-------|---------|
| `security_profiles` | Monitoring preferences and security score |
| `analysis_reports` | KI analysis runs (initial, scheduled, manual) |
| `analysis_report_items` | Individual findings within a report |

### Billing

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Available plans (e.g. SynSight Protect) |
| `subscriptions` | Active user subscriptions |
| `payments` | Payment records linked to subscriptions |

### Audit

| Table | Purpose |
|-------|---------|
| `audit_events` | Immutable event log for compliance and debugging |

## Relationships

```
users (1) ──→ (1) profiles
users (1) ──→ (1) security_profiles
users (1) ──→ (1) user_settings
users (1) ──→ (*) sessions
users (1) ──→ (*) user_tokens
users (1) ──→ (*) analysis_reports
users (1) ──→ (*) subscriptions
users (1) ──→ (*) payments
users (1) ──→ (*) audit_events

analysis_reports (1) ──→ (*) analysis_report_items
subscription_plans (1) ──→ (*) subscriptions
subscriptions (1) ──→ (*) payments
```

## Migration Workflow

### 1. Apply reference migration (manual)

```bash
mysql -u synsight -p synsight < database/migrations/001_initial_schema.sql
mysql -u synsight -p synsight < database/seeds/001_admin_user.sql
```

### 2. Programmatic seed (alternative)

```bash
DATABASE_URL=mysql://synsight:password@localhost:3306/synsight npx tsx database/seeds/seed.ts
```

### 3. Drizzle Kit (future schema changes)

```bash
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply pending migrations
```

## Development Admin User

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin` (development only) |
| Storage | Argon2id hash in `users.password_hash` — never plaintext |

## Authentication Flow

1. `POST /api/auth/login` → `authService.loginWithCredentials()`
2. Service queries `userRepository.findByUsername()` or `findByEmail()`
3. Password verified via `verifyPassword()` (Argon2id)
4. Signed HttpOnly cookie created + session row in `sessions` table
5. `middleware.ts` validates cookie on protected routes (Edge-compatible)
6. `POST /api/auth/logout` → session revoked + cookie cleared

## API Endpoints

| Method | Path | Service | Auth |
|--------|------|---------|------|
| POST | `/api/auth/login` | `authService` | Public |
| POST | `/api/auth/logout` | `authService` | Public |
| GET | `/api/user/profile` | `userService` | Required |
| GET | `/api/security/status` | `securityService` | Required |

## Future Roadmap

### KI Analysis Pipeline

- `analysis_reports` stores run metadata and overall scores
- `analysis_report_items` stores individual findings (leaks, profiles, mentions)
- A background worker will populate these tables from external intelligence APIs
- `security_profiles.security_score` updated after each completed report

### Payments Integration

- `payments.provider` will reference Stripe, PayPal, or SEPA providers
- `payments.provider_reference` stores external transaction IDs
- Webhook handlers will update `subscriptions.status` and create `audit_events`

### Enterprise Accounts

- New `organizations` and `organization_members` tables (planned)
- Role-based access beyond `admin` / `demo`
- Shared `security_profiles` and team-level `analysis_reports`
- SSO via `user_tokens` with `token_type = 'api_key'` or dedicated OIDC flow

## Environment Variables

See `.env.example`:

- `DATABASE_URL` — MySQL connection string
- `SESSION_SECRET` — Cookie signing secret (min. 32 bytes)
- `APP_URL` — Public application URL
