import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import {
  AnalysisGateError,
  assertAnalysisRunnable,
} from "@/lib/analysis/assert-runnable";
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

  it("rejects inactive modules before any provider call", async () => {
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

    try {
      await assertAnalysisRunnable({
        userId: 1,
        analysisKey: "domain_analysis",
        requestId: "req-inactive-2",
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "MODULE_INACTIVE" });
    }
  });

  it("rejects replaced alias_analysis", async () => {
    await expect(
      assertAnalysisRunnable({
        userId: 1,
        analysisKey: "alias_analysis",
        requestId: "req-alias-1",
      })
    ).rejects.toMatchObject({ code: "MODULE_REPLACED" });
  });
});
