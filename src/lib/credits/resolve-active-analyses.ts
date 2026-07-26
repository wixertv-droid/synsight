import { isReplacedAnalysisKey } from "@/lib/credits/pricing";

export interface CatalogAnalysisEntry {
  key: string;
}

/**
 * Active analysis keys from the public pricing catalog (fail-closed).
 * Replaced legacy keys are never returned.
 */
export function extractActiveAnalysisKeys(
  analyses: CatalogAnalysisEntry[] | null | undefined
): string[] {
  if (!analyses?.length) return [];
  return analyses
    .filter((entry) => entry.key && !isReplacedAnalysisKey(entry.key))
    .map((entry) => entry.key);
}

/** Fail-closed: missing/empty activeKeys or replaced keys → inactive. */
export function isAnalysisKeyActive(
  activeKeys: string[] | null | undefined,
  key: string
): boolean {
  if (!activeKeys?.length) return false;
  if (isReplacedAnalysisKey(key)) return false;
  return activeKeys.includes(key);
}
