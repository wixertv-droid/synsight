import { describe, expect, it } from "vitest";
import {
  partitionGoogleHits,
  scoreHitsRisk,
  scoreLeakFindings,
  scoreUsernameHits,
} from "@/lib/dashboard/channel-risk";
import type { IntelligenceHit } from "@/lib/analysis/types";

function hit(
  partial: Partial<IntelligenceHit> & Pick<IntelligenceHit, "id">
): IntelligenceHit {
  return {
    query: "q",
    title: "t",
    url: "https://example.com",
    snippet: "",
    category: "social",
    fetchedAt: new Date().toISOString(),
    source: "example.com",
    sourceType: "serpapi_google",
    visibility: "public_index",
    relevance: "relevant",
    risk: "watch",
    status: "verified",
    whyFound: "",
    whyRelevant: "",
    visibleData: "",
    isPublic: true,
    isProblematic: false,
    risks: "",
    canIgnore: true,
    shouldAct: false,
    recommendation: "",
    ...partial,
  };
}

describe("channel-risk", () => {
  it("scores critical hits much higher than low hits", () => {
    const low = scoreHitsRisk([
      hit({ id: "1", severity: "low", risk: "none" }),
      hit({ id: "2", severity: "low", risk: "none" }),
    ]);
    const critical = scoreHitsRisk([
      hit({ id: "3", severity: "critical", risk: "action" }),
      hit({ id: "4", severity: "critical", risk: "action" }),
    ]);
    expect(critical).toBeGreaterThan(low + 25);
    expect(critical).toBeGreaterThan(70);
  });

  it("returns 0 when no hits remain (ignored/resolved)", () => {
    expect(scoreHitsRisk([])).toBe(0);
    expect(scoreLeakFindings([]).value).toBe(0);
    expect(scoreUsernameHits([]).value).toBe(0);
  });

  it("partitions google hits by channel", () => {
    const parts = partitionGoogleHits([
      hit({
        id: "a",
        filterCategory: "social",
        severity: "high",
        risk: "review",
      }),
      hit({
        id: "b",
        filterCategory: "website",
        severity: "medium",
        risk: "watch",
      }),
      hit({
        id: "c",
        filterCategory: "forum",
        severity: "low",
        risk: "none",
      }),
    ]);
    expect(parts.profile).toHaveLength(1);
    expect(parts.websites).toHaveLength(1);
    expect(parts.mentions).toHaveLength(1);
    expect(parts.allLive).toHaveLength(3);
  });

  it("weights password exposure as extreme leak risk", () => {
    const mild = scoreLeakFindings([
      {
        type: "BREACH",
        title: "Test Breach",
        description: "Test description",
        riskLevel: "low",
        recommendation: "Test recommendation",
        sourceName: "System Scan",
        sourceDate: "2026-07-29",
        sourceUrl: "https://synsight.de",
        identifierMasked: "user@domain.com",
        dataClasses: ["Email"]
      },
      {
        type: "BREACH",
        title: "Old",
        description: "",
        riskLevel: "low",
        recommendation: "",
        sourceName: "System Scan",
        sourceDate: "2026-07-29",
        sourceUrl: "https://synsight.de",
        identifierMasked: "user@domain.com",
        dataClasses: ["Email"]
      },
    ]);
    
    const hot = scoreLeakFindings([
      {
        type: "BREACH",
        title: "Test Breach",
        description: "Test description",
        riskLevel: "low",
        recommendation: "Test recommendation",
        sourceName: "System Scan",
        sourceDate: "2026-07-29",
        sourceUrl: "https://synsight.de",
        identifierMasked: "user@domain.com",
        dataClasses: ["Email"]
      },
      {
        type: "PASSWORD_EXPOSURE",
        title: "Pwd",
        description: "",
        riskLevel: "high",
        recommendation: "",
        sourceName: "System Scan",
        sourceDate: "2026-07-29",
        sourceUrl: "https://synsight.de",
        identifierMasked: "user@domain.com",
        dataClasses: ["Email", "Password"]
      },
    ]);
    expect(hot.value).toBeGreaterThan(mild.value);
  });
});
