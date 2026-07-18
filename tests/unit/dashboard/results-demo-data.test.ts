import { describe, expect, it } from "vitest";
import { DEFAULT_ANALYSIS_PRICES } from "@/lib/credits/pricing";
import {
  demoAnalysisResults,
  getResultsOverview,
} from "@/lib/dashboard/results-demo-data";

describe("results demo catalogue", () => {
  it("covers every priced analysis type with expandable findings", () => {
    const ids = new Set(demoAnalysisResults.map((result) => result.id));
    for (const price of DEFAULT_ANALYSIS_PRICES) {
      expect(ids.has(price.key)).toBe(true);
    }

    for (const result of demoAnalysisResults) {
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.help.length).toBeGreaterThan(20);
      expect(result.whatThisMeans.length).toBeGreaterThan(20);
      for (const finding of result.findings) {
        expect(finding.evidence.length).toBeGreaterThan(0);
        expect(finding.whyItMatters.length).toBeGreaterThan(10);
      }
    }
  });

  it("builds overview totals from the catalogue", () => {
    const overview = getResultsOverview(demoAnalysisResults);
    expect(overview.analysesRun).toBe(DEFAULT_ANALYSIS_PRICES.length);
    expect(overview.findingsTotal).toBeGreaterThan(overview.analysesRun);
  });
});
