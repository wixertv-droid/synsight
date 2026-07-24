/**
 * OSINT Reconnaissance Matrix — Search Strategy facade.
 * Implementation lives in search-planner.ts (shared by pipeline + queries).
 */
export {
  planGoogleSearches,
  planScoredGoogleSearches,
  normalizeSearchCacheKey,
  OSINT_MAX_QUERIES,
  type ScoredSearchPlan,
} from "@/lib/analysis/osint/search-planner";
