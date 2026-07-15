export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  blockMs: number;
}

interface Bucket {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const globalStore = globalThis as typeof globalThis & {
  __synsightRateLimits?: Map<string, Bucket>;
};

const store =
  globalStore.__synsightRateLimits ??
  (globalStore.__synsightRateLimits = new Map<string, Bucket>());

export const LOGIN_RATE_LIMIT: RateLimitPolicy = {
  limit: 5,
  windowMs: 15 * 60_000,
  blockMs: 15 * 60_000,
};

export const REGISTER_RATE_LIMIT: RateLimitPolicy = {
  limit: 3,
  windowMs: 60 * 60_000,
  blockMs: 60 * 60_000,
};

export const VERIFICATION_RATE_LIMIT: RateLimitPolicy = {
  limit: 3,
  windowMs: 15 * 60_000,
  blockMs: 15 * 60_000,
};

export function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): RateLimitResult {
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStartedAt >= policy.windowMs) {
    store.set(key, {
      attempts: 0,
      windowStartedAt: now,
      blockedUntil: 0,
    });
    return {
      allowed: true,
      remaining: policy.limit,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  return {
    allowed: bucket.attempts < policy.limit,
    remaining: Math.max(0, policy.limit - bucket.attempts),
    retryAfterSeconds: 0,
  };
}

export function recordRateLimitFailure(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): RateLimitResult {
  return recordRateLimitAttempt(key, policy, now);
}

/** Counts any attempt (success or failure) against the policy window. */
export function recordRateLimitAttempt(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): RateLimitResult {
  const current = store.get(key);
  const bucket =
    !current || now - current.windowStartedAt >= policy.windowMs
      ? { attempts: 0, windowStartedAt: now, blockedUntil: 0 }
      : { ...current };

  if (bucket.blockedUntil > now) {
    store.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  if (bucket.attempts >= policy.limit) {
    bucket.blockedUntil = now + policy.blockMs;
    store.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(policy.blockMs / 1000),
    };
  }

  bucket.attempts += 1;
  if (bucket.attempts >= policy.limit) {
    bucket.blockedUntil = now + policy.blockMs;
  }
  store.set(key, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - bucket.attempts),
    retryAfterSeconds: 0,
  };
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
