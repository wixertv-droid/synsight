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
    expect(search).toContain("recordApiUsageEvent");
    expect(search).toContain("eventType");
    expect(gemini).toContain('providerCode: "gemini"');
  });
});
