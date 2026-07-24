import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";

describe("ensureDigitalLeakCatalog", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    vi.resetModules();
  });

  it("is a no-op without DATABASE_URL and does not throw", async () => {
    const { ensureDigitalLeakCatalog } =
      await import("@/lib/credits/ensure-digital-leak-catalog");
    await expect(ensureDigitalLeakCatalog()).resolves.toBe(false);
  });

  it("is invoked by public and admin pricing catalog reads", async () => {
    const ensure = await import("@/lib/credits/ensure-digital-leak-catalog");
    const spy = vi
      .spyOn(ensure, "ensureDigitalLeakCatalog")
      .mockResolvedValue(true);

    const { getPublicPricingCatalog, getAdminPricingCatalog } =
      await import("@/lib/services/pricing-service");

    const publicCatalog = await getPublicPricingCatalog();
    expect(spy).toHaveBeenCalled();
    expect(
      publicCatalog.analyses.some((row) => row.key === "digital_leak_exposure")
    ).toBe(true);
    expect(
      publicCatalog.analyses.some((row) => row.key === "phone_analysis")
    ).toBe(false);

    spy.mockClear();
    const adminCatalog = await getAdminPricingCatalog({
      id: "1",
      displayName: "Admin",
      email: "admin@synsight.local",
      role: "admin",
    });
    expect(spy).toHaveBeenCalled();
    expect(
      adminCatalog.analyses.some(
        (row) => row.analysisKey === "digital_leak_exposure" && row.isActive
      )
    ).toBe(true);
  });

  it("documents that DEFAULT_ANALYSIS_PRICES alone never write MySQL", async () => {
    const pricing = await import("@/lib/credits/pricing");
    const ensureSource = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/credits/ensure-digital-leak-catalog.ts", "utf8")
    );
    expect(
      pricing.DEFAULT_ANALYSIS_PRICES.some(
        (row) => row.key === "digital_leak_exposure"
      )
    ).toBe(true);
    expect(ensureSource).toContain("analysis_pricing");
    expect(ensureSource).toContain("api_cost_settings");
    expect(ensureSource).toContain("dehashed");
    expect(ensureSource).toContain("phone_analysis");
  });
});
