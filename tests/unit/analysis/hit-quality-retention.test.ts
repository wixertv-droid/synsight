import { describe, expect, it } from "vitest";
import {
  isJunkHit,
  isPrimaryHit,
  refineSerpHits,
  textMatchesSubject,
} from "@/lib/analysis/hit-quality";
import type { IntelligenceHit } from "@/lib/analysis/types";
import {
  computeExpiresAt,
  isReportExpired,
  normalizeExpiresAtValue,
  parseRetentionDays,
  toMysqlTimestamp,
} from "@/lib/analysis/retention";

function hit(
  partial: Partial<IntelligenceHit> &
    Pick<IntelligenceHit, "id" | "title" | "url">
): IntelligenceHit {
  return {
    query: '"Anna Beispiel"',
    snippet: "Profilseite",
    category: "name",
    fetchedAt: new Date().toISOString(),
    source: "example.com",
    sourceType: "serpapi_google",
    visibility: "public_index",
    relevance: "low",
    risk: "none",
    status: "verified",
    whyFound: "test",
    whyRelevant: "test",
    visibleData: "test",
    isPublic: true,
    isProblematic: false,
    risks: "",
    canIgnore: true,
    shouldAct: false,
    recommendation: "",
    ...partial,
  };
}

describe("hit quality", () => {
  it("detects junk hosts", () => {
    expect(
      isJunkHit({
        title: "Eintrag",
        snippet: "Telefonbuch",
        url: "https://www.dasoertliche.de/Anna",
      })
    ).toBe(true);
  });

  it("matches subject tokens", () => {
    expect(
      textMatchesSubject("Anna Beispiel Berlin", ["anna", "beispiel"])
    ).toBe(true);
    expect(textMatchesSubject("Random Blog Post", ["anna", "beispiel"])).toBe(
      false
    );
  });

  it("dedupes and drops junk without subject match", () => {
    const refined = refineSerpHits(
      [
        hit({
          id: "1",
          title: "Anna Beispiel — LinkedIn",
          url: "https://linkedin.com/in/anna",
          relevance: "neutral",
          risk: "watch",
          category: "social",
        }),
        hit({
          id: "2",
          title: "Anna Beispiel — LinkedIn",
          url: "https://www.linkedin.com/in/anna/",
          relevance: "neutral",
          risk: "watch",
          category: "social",
        }),
        hit({
          id: "3",
          title: "Unrelated recipe",
          url: "https://cooking.example/soup",
          relevance: "low",
          risk: "none",
        }),
        hit({
          id: "4",
          title: "Yellow pages",
          url: "https://yellowpages.com/anna",
          relevance: "low",
          risk: "none",
        }),
      ],
      "Anna Beispiel"
    );

    expect(refined.map((item) => item.id)).toEqual(["1"]);
    expect(isPrimaryHit(refined[0])).toBe(true);
  });
});

describe("report retention", () => {
  it("parses presets and computes expiry", () => {
    expect(parseRetentionDays(7)).toBe(7);
    expect(parseRetentionDays(999)).toBe(30);
    expect(computeExpiresAt("2026-07-01T00:00:00.000Z", 0)).toBeNull();
    expect(computeExpiresAt("2026-07-01T00:00:00.000Z", 1)).toBe(
      "2026-07-02T00:00:00.000Z"
    );
    expect(toMysqlTimestamp("2026-07-02T00:00:00.000Z")).toBe(
      "2026-07-02 00:00:00.000"
    );
    expect(normalizeExpiresAtValue("2026-07-02 00:00:00.000")).toBe(
      "2026-07-02T00:00:00.000Z"
    );
    expect(normalizeExpiresAtValue(new Date("2026-07-02T00:00:00.000Z"))).toBe(
      "2026-07-02T00:00:00.000Z"
    );
  });

  it("detects expired reports", () => {
    expect(
      isReportExpired({
        expiresAt: "2020-01-01T00:00:00.000Z",
        now: new Date("2026-07-23T00:00:00.000Z"),
      })
    ).toBe(true);
    expect(
      isReportExpired({
        expiresAt: null,
        retentionDays: 0,
        generatedAt: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });
});
