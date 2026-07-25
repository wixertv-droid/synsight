/**
 * Rate-limit storage abstraction (M-09).
 * In-memory today; Redis-ready interface for multi-instance production.
 */

export interface RateLimitBucket {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export interface RateLimitStore {
  get(key: string): RateLimitBucket | null;
  set(key: string, bucket: RateLimitBucket): void;
  delete(key: string): void;
}

const globalStore = globalThis as typeof globalThis & {
  __synsightRateLimits?: Map<string, RateLimitBucket>;
};

function memoryMap(): Map<string, RateLimitBucket> {
  return (
    globalStore.__synsightRateLimits ??
    (globalStore.__synsightRateLimits = new Map())
  );
}

/** Default process-local store. */
export const memoryRateLimitStore: RateLimitStore = {
  get(key) {
    return memoryMap().get(key) ?? null;
  },
  set(key, bucket) {
    memoryMap().set(key, bucket);
  },
  delete(key) {
    memoryMap().delete(key);
  },
};

/**
 * Redis store stub — activate when REDIS_URL is configured in a later sprint.
 * Keeps the same key/bucket shape so call sites need no changes.
 */
export function createRedisRateLimitStore(_redisUrl: string): RateLimitStore {
  void _redisUrl;
  console.warn(
    "[rate-limit] REDIS_URL set but Redis adapter not yet active — using memory store"
  );
  return memoryRateLimitStore;
}

let activeStore: RateLimitStore = memoryRateLimitStore;
let resolvedFromEnv = false;

export function getRateLimitStore(): RateLimitStore {
  if (!resolvedFromEnv) {
    resolveRateLimitStoreFromEnv();
  }
  return activeStore;
}

export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
  resolvedFromEnv = true;
}

/** Resolve store from env once (call at boot / first use). */
export function resolveRateLimitStoreFromEnv(): RateLimitStore {
  const redisUrl = process.env.REDIS_URL?.trim();
  activeStore = redisUrl
    ? createRedisRateLimitStore(redisUrl)
    : memoryRateLimitStore;
  resolvedFromEnv = true;
  return activeStore;
}
