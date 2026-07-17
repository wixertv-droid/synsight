import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  getAdminPricingCatalog,
  getPublicPricingCatalog,
  resetPricingDefaults,
  updateAnalysisPricing,
  updateCreditPackagePricing,
} from "@/lib/services/pricing-service";
import {
  consumeCredits,
  purchaseCreditPackage,
} from "@/lib/services/credits-service";

const admin: AuthenticatedUser = {
  id: "1",
  displayName: "Admin",
  email: "admin@synsight.local",
  role: "admin",
};

describe("database-backed pricing service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    process.env.CREDITS_CHECKOUT_MODE = "instant";
  });

  it("provides all requested analysis prices", async () => {
    const catalog = await getPublicPricingCatalog();
    expect(catalog.analyses).toHaveLength(13);
    expect(
      catalog.analyses.find((row) => row.key === "phone_analysis")?.credits
    ).toBe(6);
    expect(
      catalog.analyses.find((row) => row.key === "alias_analysis")?.credits
    ).toBe(8);
  });

  it("uses admin-updated analysis price immediately for consumption", async () => {
    await updateAnalysisPricing({
      actor: admin,
      analysisKey: "domain_analysis",
      label: "Domain Analyse",
      description: "Updated",
      credits: 9,
      sortOrder: 50,
      isActive: true,
    });
    await purchaseCreditPackage(1, "pack_500");
    const result = await consumeCredits(1, "domain_analysis");
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.creditsCharged).toBe(9);
      expect(result.balance).toBe(491);
    }
  });

  it("adds a new analysis type without code changes", async () => {
    await updateAnalysisPricing({
      actor: admin,
      analysisKey: "custom_risk_scan",
      label: "Custom Risk Scan",
      description: null,
      credits: 11,
      sortOrder: 500,
      isActive: true,
    });
    await purchaseCreditPackage(1, "pack_500");
    const result = await consumeCredits(1, "custom_risk_scan");
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.creditsCharged).toBe(11);
    }
  });

  it("updates packages and restores factory defaults", async () => {
    const updated = await updateCreditPackagePricing({
      actor: admin,
      code: "pack_500",
      name: "Starter Plus",
      credits: 550,
      bonusCredits: 10,
      priceCents: 700,
      currency: "EUR",
      badge: "Test",
      sortOrder: 10,
      isActive: true,
      isPopular: false,
    });
    expect(updated?.priceCents).toBe(700);
    expect(
      (await getPublicPricingCatalog()).packages.find(
        (row) => row.code === "pack_500"
      )?.priceCents
    ).toBe(700);

    await resetPricingDefaults({ actor: admin, scope: "all" });
    const catalog = await getAdminPricingCatalog(admin);
    const starter = catalog.packages.find((row) => row.code === "pack_500");
    expect(starter).toMatchObject({
      credits: 500,
      bonusCredits: 0,
      priceCents: 500,
    });
  });
});
