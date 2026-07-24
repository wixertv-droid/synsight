import type { IntelligenceHit } from "@/lib/analysis/types";

export const VERIFIED_CONFIDENCE_MIN = 70;
export const POSSIBLE_CONFIDENCE_MIN = 50;

/**
 * ResultVerifier — filtert nach Confidence.
 * <50: verwerfen | 50–69: möglich | >=70: verifiziert (Standardanzeige)
 */
export function verifyAndPartitionHits(hits: IntelligenceHit[]): {
  verified: IntelligenceHit[];
  possible: IntelligenceHit[];
  discarded: IntelligenceHit[];
  displayHits: IntelligenceHit[];
} {
  const verified: IntelligenceHit[] = [];
  const possible: IntelligenceHit[] = [];
  const discarded: IntelligenceHit[] = [];

  for (const hit of hits) {
    if (hit.sourceType === "identity_profile") {
      verified.push(hit);
      continue;
    }
    const score = hit.identityConfidence ?? 0;
    if (score >= VERIFIED_CONFIDENCE_MIN) {
      verified.push(hit);
    } else if (score >= POSSIBLE_CONFIDENCE_MIN) {
      possible.push({
        ...hit,
        relevance: "neutral",
        identityConfidenceLabel:
          hit.identityConfidenceLabel ?? "Möglicher Treffer",
      });
    } else {
      discarded.push(hit);
    }
  }

  // Display: verified first, then possible (UI can collapse possible)
  return {
    verified,
    possible,
    discarded,
    displayHits: [...verified, ...possible],
  };
}

export function dedupeHitsByUrl(hits: IntelligenceHit[]): IntelligenceHit[] {
  const seen = new Set<string>();
  const out: IntelligenceHit[] = [];
  for (const hit of hits) {
    let key = hit.url.trim().toLowerCase();
    try {
      const parsed = new URL(hit.url);
      parsed.hash = "";
      parsed.search = "";
      key =
        `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
    } catch {
      /* keep raw */
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}
