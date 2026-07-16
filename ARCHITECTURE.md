# SynSight Architecture

## Purpose

SynSight is a self-hosted, Next.js-based identity-security platform. The stack
keeps business logic in a service layer above repositories, with MySQL 8 as the
system of record and in-memory fallbacks for local development without a database.

## Runtime Stack

- **App:** Next.js 15 (App Router), React 19, TypeScript, Tailwind
- **Auth:** signed session cookies (`synsight_session`), Argon2id passwords, email verification tokens
- **Data:** Drizzle ORM + mysql2 → self-hosted MySQL 8
- **Edge guard:** `src/middleware.ts` protects `/dashboard`, `/profile`, `/settings`, `/onboarding`
- **Observability bootstrap:** `src/instrumentation.ts` + `/api/health`

## Request Path

```
Browser / Client
  → Next.js Route Handler or Server Component
  → Service (`src/lib/services/*`)
  → Repository factory (`src/lib/repositories/index.ts`)
  → MySQL (when DATABASE_URL is set) or in-memory store
```

Mutation APIs additionally enforce:

1. Origin / fetch-site CSRF checks (`src/lib/security/request.ts`)
2. In-process rate limits (`src/lib/security/rate-limit.ts`)
3. Zod validation (`src/lib/validation/*`)
4. Audit events via `AuditRepository`

## Auth Flow (Sprint 5C)

1. **Register** — creates `pending_verification` user, hashes password with Argon2id, issues opaque email verification token
2. **Verify** — `/verify-email` consumes token, activates account
3. **Login** — validates credentials, rejects locked / unverified accounts, creates `sessions` row + signed cookie containing `sid`
4. **Logout** — revokes session by `sid` and clears cookie
5. **Onboarding** — multi-step identity intake before full dashboard use

Account lockout after repeated failures uses `users.failed_login_attempts` / `users.locked_until`.

## Identity Data Model (MySQL)

Core tables from `001_initial_schema.sql`, production identity extensions in
`002_production_identity.sql`, and digital-trace / image metadata in
`003_digital_traces_images.sql`:

| Area       | Tables                                                                              |
| ---------- | ----------------------------------------------------------------------------------- |
| Account    | `users`, `sessions`, `user_tokens`, `audit_events`                                  |
| Profile    | `profiles`, `profile_aliases`, `profile_phone_numbers`, `profile_additional_emails` |
| Traces     | `social_accounts`, `digital_traces`, `profile_images`                               |
| Security   | `security_profiles`, analysis/report tables                                         |
| Commercial | subscriptions / payments / settings                                                 |

TypeScript mirrors live in `src/types/domain.ts` and `src/lib/database/schema.ts`.

## Security Headers

`next.config.ts` sets CSP always. HSTS and `upgrade-insecure-requests` are
enabled only when `APP_URL` starts with `https://` (or `FORCE_HTTPS=true`).
Do not key these off `NODE_ENV` alone — production HTTP hostnames would lose
CSS/fonts/JS via forced HTTPS upgrades. Rebuild after changing `APP_URL`.

Private media is stored under `storage/private` (or `PRIVATE_STORAGE_ROOT`),
outside the Next.js public web root. Originals are encrypted at rest.

## Tooling

| Command                 | Role                                       |
| ----------------------- | ------------------------------------------ |
| `npm run typecheck`     | `tsc --noEmit`                             |
| `npm run lint`          | Next.js ESLint                             |
| `npm run test`          | Vitest unit/integration                    |
| `npm run test:coverage` | Vitest + V8 coverage                       |
| `npm run test:e2e`      | Playwright smoke (auth/route guards)       |
| `npm run db:migrate`    | Apply ordered SQL migrations (`001`–`003`) |
| `npm run db:seed`       | Seed development admin user                |
| `npm run check`         | typecheck → lint → test → build            |
| Husky + lint-staged     | Prettier on staged files before commit     |

## Related Docs

- `DATABASE_ARCHITECTURE.md` — ORM decision, repository layout, table notes
- `.env.example` / `.env.production.example` — environment contracts

## Explicit Non-Goals (this sprint)

- No new AI feature surface
- No third-party auth/IdP migration
- No outbound email provider implementation beyond mode scaffolding
