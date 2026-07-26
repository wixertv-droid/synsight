import type { AnalysisSourceModule } from "@/lib/services/hit-actions-service";
import { analysisHitFingerprint } from "@/lib/analysis/hit-fingerprint";

export type HitActionState =
  "none" | "ignored" | "self" | "resolved" | "ordered";

/** Ignored + resolved do not count toward report KPIs / risk stats. */
export function isExcludedFromStats(
  action: HitActionState | undefined | null
): boolean {
  return action === "ignored" || action === "resolved";
}

export function fingerprintForIntelligenceHit(
  sourceModule: AnalysisSourceModule,
  hit: {
    url?: string | null;
    source?: string | null;
    displayCategory?: string | null;
    category?: string | null;
    title?: string | null;
  }
): string {
  return analysisHitFingerprint({
    module: sourceModule,
    url: hit.url,
    platform: hit.source || hit.displayCategory || hit.category,
    title: hit.title,
  });
}
