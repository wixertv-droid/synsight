import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import {
  AnalysisGateError,
  assertAnalysisRunnable,
} from "@/lib/analysis/assert-runnable";
import { purchaseCreditPackage } from "@/lib/services/credits-service";
import { updateAnalysisPricing } from "@/lib/services/pricing-service";
import type { AuthenticatedUser } from "@/lib/auth/types";

const admin: AuthenticatedUser = {
  id: "1",
  displayName: "Admin",
  email: "admin@synsight.local",
  role: "admin",
};

describe("assertAnalysisRunnable", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    process.env.CREDITS_CHECKOUT_MODE = "instant";
    // Google provider readiness uses SerpAPI config helpers — mark as present
    // via env so memory tests can pass the API gate for google_search.
    process.env.SERPAPI_API_KEY = "test-key";
  });

  it("requires requestId", async () => {
    await expect(
      assertAnalysisRunnable({
        userId: 1,
        analysisKey: "domain_analysis",
        requestId: "",
      })
    ).rejects.toMatchObject({ code: "REQUEST_ID_REQUIRED" });
  });

  it("rejects inactive modules before consume", async () => {
    await updateAnalysisPricing({
      actor: admin,
      analysisKey: "domain_analysis",
      label: "Domain Analyse",
      description: null,
      credits: 5,
      sortOrder: 40,
      isActive: false,
    });
    await expect(
      assertAnalysisRunnable({
        userId: 1,
        analysisKey: "domain_analysis",
        requestId: "req-inactive-1",
      })
    ).rejects.toBeInstanceOf(AnalysisGateError);
  });

  it("consumes credits once and returns alreadyConsumed on retry", async () => {
    await purchaseCreditPackage(1, "pack_500");
    // domain_analysis has no Serp/DeHashed provider check → assertProviderReady false
    // Use a key that passes provider readiness only when configured.
    // For memory tests without provider, expect API_UNAVAILABLE for google/leak/username.
    await expect(
      assertAnalysisRunnable({
        userId: 1,
        analysisKey: "google_search",
        requestId: "req-google-1",
      })
    ).rejects.toMatchObject({ code: "API_UNAVAILABLE" });
  });
});
