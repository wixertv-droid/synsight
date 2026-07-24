import type { GoogleSearchItem } from "@/lib/analysis/google/custom-search";
import type { SerpSearchEngine } from "@/lib/analysis/types";
import { normalizeSearchCacheKey } from "@/lib/analysis/osint/search-planner";

const TTL_MS = 60 * 60 * 1000; // 1 Stunde — gleiche Query in Session wiederverwenden
const MAX_ENTRIES = 200;

interface CacheEntry {
  items: GoogleSearchItem[];
  storedAt: number;
}

const memory = new Map<string, CacheEntry>();

export function getCachedSearchResults(
  query: string,
  engine: SerpSearchEngine = "google"
): GoogleSearchItem[] | null {
  const key = normalizeSearchCacheKey(query, engine);
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > TTL_MS) {
    memory.delete(key);
    return null;
  }
  return entry.items.map((item) => ({ ...item }));
}

export function setCachedSearchResults(
  query: string,
  items: GoogleSearchItem[],
  engine: SerpSearchEngine = "google"
): void {
  const key = normalizeSearchCacheKey(query, engine);
  if (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, {
    items: items.map((item) => ({ ...item })),
    storedAt: Date.now(),
  });
}

export function clearSearchCacheForTests(): void {
  memory.clear();
}
