import { describe, expect, it } from "vitest";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";

describe("normalizeIntelligenceReport", () => {
  it("fills missing hits/queries so UI filter/map never crash", () => {
    const report = normalizeIntelligenceReport({
      subjectName: "Test User",
      riskLevel: "mittel",
      riskScore: 40,
    });

    expect(report).not.toBeNull();
    expect(report!.hits).toEqual([]);
    expect(report!.queries).toEqual([]);
    expect(report!.recommendations).toEqual([]);
    expect(report!.buckets.relevant).toBe(0);
    expect(report!.managementOverview.mentions).toBe(0);
    expect(report!.riskLevel).toBe("medium");
    expect(report!.executive.recommendedActions).toEqual([]);
  });

  it("parses stringified JSON and nested { report } envelopes", () => {
    const nested = normalizeIntelligenceReport(
      JSON.stringify({
        report: {
          subjectName: "Anna",
          hits: [{ id: "1" }],
          queries: [{ id: "q1", label: "Name", query: "Anna", help: "x" }],
        },
      })
    );

    expect(nested?.subjectName).toBe("Anna");
    expect(nested?.hits).toHaveLength(1);
    expect(nested?.queries).toHaveLength(1);
  });

  it("returns null for invalid payloads", () => {
    expect(normalizeIntelligenceReport(null)).toBeNull();
    expect(normalizeIntelligenceReport("not-json")).toBeNull();
    expect(normalizeIntelligenceReport(42)).toBeNull();
  });
});
