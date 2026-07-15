# Distributed Rate Limiting Plan (RC-1a)

SynSight currently uses an in-process `Map` (`src/lib/security/rate-limit.ts`)
suitable for single-node development and early staging.

## Target (before multi-instance production)

1. **Store:** Redis (or equivalent) with sliding / fixed windows per key.
2. **Keys:** `rl:{purpose}:{ip}` and optionally `rl:{purpose}:{ip}:{identifier}`.
3. **Proxy trust:** Configure the edge proxy to overwrite `X-Forwarded-For` so
   `getClientIp()` cannot be spoofed.
4. **Interface:** Keep `checkRateLimit` / `recordRateLimitAttempt` signatures;
   swap the adapter behind `RATE_LIMIT_STORE=memory|redis`.
5. **Purposes already covered:** login failures, registration attempts,
   verification resend. Extend to image upload + onboarding POST before scale-out.

## Interim control

Until Redis is wired, run a single application instance per environment or
accept that limits are soft under horizontal scale.
