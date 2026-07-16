import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import {
  consumeCredits,
  getCreditsOverview,
  listCreditPackages,
  purchaseCreditPackage,
} from "@/lib/services/credits-service";

describe("credits-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    process.env.CREDITS_CHECKOUT_MODE = "instant";
  });

  it("lists the four standard SynCredits packages", async () => {
    const packages = await listCreditPackages();
    expect(packages).toHaveLength(4);
    expect(packages.map((pack) => pack.code)).toEqual([
      "pack_500",
      "pack_1700",
      "pack_3600",
      "pack_7800",
    ]);
    expect(packages[1]?.totalCredits).toBe(1700);
  });

  it("purchases a package and increases balance including bonus", async () => {
    const result = await purchaseCreditPackage(1, "pack_1700");
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.balance).toBe(1700);

    const overview = await getCreditsOverview(1);
    expect(overview.balance).toBe(1700);
    expect(overview.lifetimePurchased).toBe(1500);
    expect(overview.lifetimeBonus).toBe(200);
  });

  it("consumes credits for a priced analysis", async () => {
    await purchaseCreditPackage(1, "pack_500");
    const consumed = await consumeCredits(1, "domain_analysis");
    expect(consumed.status).toBe("completed");
    if (consumed.status !== "completed") return;
    expect(consumed.creditsCharged).toBe(5);
    expect(consumed.balance).toBe(495);
  });

  it("rejects consume when balance is insufficient", async () => {
    const consumed = await consumeCredits(1, "full_identity_analysis");
    expect(consumed.status).toBe("insufficient");
  });
});
