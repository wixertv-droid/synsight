import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("admin finanzen module", () => {
  it("exposes finance API routes", () => {
    const root = path.join(process.cwd(), "src/app/api/admin/finance");
    expect(
      readFileSync(path.join(root, "overview/route.ts"), "utf8")
    ).toContain("getFinanceOverview");
    expect(
      readFileSync(path.join(root, "payment-providers/route.ts"), "utf8")
    ).toContain("upsertPaymentProvider");
    expect(
      readFileSync(path.join(root, "api-costs/route.ts"), "utf8")
    ).toContain("listApiUsageEvents");
  });

  it("wires finance views into AdminViewHost", () => {
    const host = readFileSync(
      path.join(process.cwd(), "src/components/admin/views/AdminViewHost.tsx"),
      "utf8"
    );
    expect(host).toContain("finance-overview");
    expect(host).toContain("finance-providers");
    expect(host).toContain("finance-api-costs");
    expect(host).toContain("AdminFinanceOverviewView");
  });

  it("records usage from search provider and gemini", () => {
    const search = readFileSync(
      path.join(process.cwd(), "src/lib/services/search-provider-service.ts"),
      "utf8"
    );
    const gemini = readFileSync(
      path.join(process.cwd(), "src/lib/analysis/gemini-summary.ts"),
      "utf8"
    );
    const analysis = readFileSync(
      path.join(process.cwd(), "src/lib/analysis/google/run-analysis.ts"),
      "utf8"
    );
    expect(search).toContain("recordApiUsageEvent");
    expect(search).toContain("recordFinance");
    expect(gemini).toContain('providerCode: "gemini"');
    expect(gemini).toContain("usageMetadata");
    expect(gemini).toContain("tokenUsage");
    expect(analysis).toContain('providerCode: "serpapi"');
    expect(analysis).toContain('eventType: "google_analysis"');
    expect(analysis).toContain("recordFinance: false");
  });
});

describe("gemini token cost calculation", () => {
  it("calculates cost from prompt/output tokens and 1M prices", async () => {
    const { calculateTokenCostEur, GEMINI_36_FLASH_STANDARD_USD, USD_TO_EUR } =
      await import("@/lib/services/finance-service");
    // gemini-3.6-flash Standard: $1.50 / $7.50 → EUR @0.92
    const inputEur = GEMINI_36_FLASH_STANDARD_USD.inputPer1m * USD_TO_EUR;
    const outputEur = GEMINI_36_FLASH_STANDARD_USD.outputPer1m * USD_TO_EUR;
    const cost = calculateTokenCostEur(
      { promptTokenCount: 1500, candidatesTokenCount: 500 },
      inputEur,
      outputEur
    );
    // USD: (1500/1e6)*1.5 + (500/1e6)*7.5 = 0.006; EUR = 0.006*0.92
    expect(inputEur).toBeCloseTo(1.38, 6);
    expect(outputEur).toBeCloseTo(6.9, 6);
    expect(cost).toBeCloseTo(0.00552, 8);
  });
});
