/**
 * Rate-limit storage abstraction (M-09).
 *
 * Default: in-memory Map on `globalThis` (single process, survives hot reload).
 * Horizontal scaling: when `REDIS_URL` is set, `createSharedRateLimitStore`
 * exposes the adapter surface; a future sprint can swap the backing calls to
 * Redis INCR/EXPIRE without changing call sites. A file-backed or other
 * process-consistent store can implement the same `RateLimitStore` interface.
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

const BUCKET_TTL_MS = 24 * 60 * 60_000;

const globalStore = globalThis as typeof globalThis & {
  __synsightRateLimits?: Map<string, RateLimitBucket>;
  __synsightRateLimitCleanup?: ReturnType<typeof setInterval>;
};

function memoryMap(): Map<string, RateLimitBucket> {
  if (!globalStore.__synsightRateLimits) {
    globalStore.__synsightRateLimits = new Map();
    startBucketCleanup();
  }
  return globalStore.__synsightRateLimits;
}

function isBucketExpired(bucket: RateLimitBucket, now = Date.now()): boolean {
  const horizon = Math.max(
    bucket.blockedUntil,
    bucket.windowStartedAt + BUCKET_TTL_MS
  );
  return now > horizon;
}

function pruneExpiredBuckets(now = Date.now()): void {
  const map = globalStore.__synsightRateLimits;
  if (!map) return;
  for (const [key, bucket] of map) {
    if (isBucketExpired(bucket, now)) {
      map.delete(key);
    }
  }
}

function startBucketCleanup(): void {
  if (globalStore.__synsightRateLimitCleanup) return;
  globalStore.__synsightRateLimitCleanup = setInterval(() => {
    pruneExpiredBuckets();
  }, 15 * 60_000);
  globalStore.__synsightRateLimitCleanup.unref?.();
}

function createMemoryBackedStore(
  map: Map<string, RateLimitBucket>
): RateLimitStore {
  return {
    get(key) {
      return map.get(key) ?? null;
    },
    set(key, bucket) {
      map.set(key, bucket);
    },
    delete(key) {
      map.delete(key);
    },
  };
}

/** Default process-local store (globalThis singleton). */
export const memoryRateLimitStore: RateLimitStore =
  createMemoryBackedStore(memoryMap());

/**
 * Shared-store adapter prepared for horizontal Redis deployment.
 * Today delegates to the process singleton memory map so behaviour matches
 * `memoryRateLimitStore`; replace inner get/set/delete with Redis when wired.
 */
export function createSharedRateLimitStore(_redisUrl?: string): RateLimitStore {
  void _redisUrl;
  if (_redisUrl?.trim()) {
    console.warn(
      "[rate-limit] REDIS_URL set but Redis adapter not yet active — using process memory store"
    );
  }
  return createMemoryBackedStore(memoryMap());
}

/** @deprecated Use createSharedRateLimitStore */
export const createRedisRateLimitStore = createSharedRateLimitStore;

let activeStore: RateLimitStore | null = null;

/** Always returns the same process singleton store instance. */
export function getRateLimitStore(): RateLimitStore {
  if (!activeStore) {
    activeStore = resolveRateLimitStoreFromEnv();
  }
  return activeStore;
}

export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

/** Resolve store from env once (call at boot / first use). */
export function resolveRateLimitStoreFromEnv(): RateLimitStore {
  const redisUrl = process.env.REDIS_URL?.trim();
  activeStore = redisUrl
    ? createSharedRateLimitStore(redisUrl)
    : memoryRateLimitStore;
  return activeStore;
}
