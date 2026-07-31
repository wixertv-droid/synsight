/**
 * Short-lived in-process cache for public demo scans.
 * Same normalized query → same payload (avoids random upstream scores
 * looking unserious when a visitor re-runs the free check).
 */
type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 6 * 60 * 60_000; // 6 hours

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

export function getDemoScanCache(query: string): unknown | null {
  const key = cacheKey(query);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.payload;
}

export function setDemoScanCache(
  query: string,
  payload: unknown,
  ttlMs = DEFAULT_TTL_MS
): void {
  store.set(cacheKey(query), {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}
