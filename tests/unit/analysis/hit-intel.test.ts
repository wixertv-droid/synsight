import { describe, expect, it } from "vitest";
import {
  buildReportScorecard,
  buildStructuredAnalysisSummary,
  enrichHitIntel,
  riskToSeverity,
} from "@/lib/analysis/hit-intel";
import type { IntelligenceHit } from "@/lib/analysis/types";

function baseHit(partial: Partial<IntelligenceHit> = {}): IntelligenceHit {
  return {
    id: "h1",
    query: '"Rene Eule" Gera',
    title: "Rene Eule — Facebook Beitrag Gera",
    url: "https://www.facebook.com/example/photos/123",
    snippet: "Rene Eule war in Gera beim Einsatz.",
    category: "name",
    fetchedAt: new Date().toISOString(),
    source: "facebook.com",
    sourceType: "serpapi_google",
    visibility: "public_index",
    relevance: "relevant",
    risk: "action",
    status: "verified",
    whyFound: "query",
    whyRelevant: "relevant",
    visibleData: "visible",
    isPublic: true,
    isProblematic: true,
    risks: "public",
    canIgnore: false,
    shouldAct: true,
    recommendation: "prüfen",
    ...partial,
  };
}

describe("hit intel enrichment", () => {
  it("scores identity confidence from name + location + social", () => {
    const enriched = enrichHitIntel(baseHit(), {
      subjectName: "Rene Eule",
      location: "Gera",
    });
    expect(enriched.identityConfidence ?? 0).toBeGreaterThanOrEqual(70);
    expect(enriched.severity).toBe("critical");
    expect(enriched.aiEvaluation?.reasons.some((r) => /Name/.test(r))).toBe(
      true
    );
    expect(
      enriched.aiEvaluation?.reasons.some((r) => /Ort|Wohnort/.test(r))
    ).toBe(true);
    expect(enriched.whyFoundPlain).toMatch(/Name|Rene/i);
  });

  it("marks weak name-only mismatches as low confidence", () => {
    const enriched = enrichHitIntel(
      baseHit({
        title: "Unrelated blog",
        snippet: "Cooking recipes",
        url: "https://example.com/soup",
        risk: "none",
        shouldAct: false,
        isProblematic: false,
      }),
      { subjectName: "Rene Eule", location: "Gera" }
    );
    expect(enriched.identityConfidence ?? 100).toBeLessThan(45);
    expect(riskToSeverity(enriched.risk)).toBe("low");
  });

  it("builds scorecard and analysis summary", () => {
    const hits = [
      enrichHitIntel(baseHit({ id: "1" }), {
        subjectName: "Rene Eule",
        location: "Gera",
      }),
      enrichHitIntel(
        baseHit({
          id: "2",
          title: "Other",
          snippet: "no match",
          url: "https://example.com/x",
          risk: "none",
          shouldAct: false,
          isProblematic: false,
        }),
        { subjectName: "Rene Eule", location: "Gera" }
      ),
    ];
    const scorecard = buildReportScorecard(hits);
    expect(scorecard.totalLive).toBe(2);
    expect(scorecard.overallScore).toBeGreaterThan(0);
    const summary = buildStructuredAnalysisSummary(
      "Rene Eule",
      hits,
      scorecard
    );
    expect(summary).toMatch(/Kurz gesagt/i);
    expect(summary).toMatch(/öffentlichen Google-Treffern/i);
    expect(summary).toMatch(/Rene Eule/);
    expect(summary).toMatch(/Empfehlung/i);
  });
});
