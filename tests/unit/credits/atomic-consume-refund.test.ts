import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryCreditsRepository } from "@/lib/repositories/credits-repository";

describe("RC-3 atomic SynCredits consume/refund", () => {
  let repo: ReturnType<typeof createInMemoryCreditsRepository>;

  beforeEach(async () => {
    const g = globalThis as typeof globalThis & {
      __synsightCreditAccounts?: Map<number, unknown>;
      __synsightCreditTx?: unknown[];
      __synsightUsageLogs?: unknown[];
      __synsightCreditTxId?: number;
      __synsightUsageLogId?: number;
    };
    g.__synsightCreditAccounts = new Map();
    g.__synsightCreditTx = [];
    g.__synsightUsageLogs = [];
    g.__synsightCreditTxId = 1;
    g.__synsightUsageLogId = 1;
    repo = createInMemoryCreditsRepository();
    await repo.applyCreditChange({
      userId: 42,
      type: "bonus",
      amount: 100,
      description: "seed",
      transactionSource: "bonus",
    });
  });

  it("debits once for the same requestId (idempotent)", async () => {
    const first = await repo.consumeAnalysisCreditsAtomic({
      userId: 42,
      analysisKey: "google_search",
      credits: 10,
      label: "Google",
      requestId: "req-atomic-1",
    });
    expect(first.status).toBe("completed");
    expect(first.alreadyConsumed).toBe(false);
    expect(first.balance).toBe(90);

    const second = await repo.consumeAnalysisCreditsAtomic({
      userId: 42,
      analysisKey: "google_search",
      credits: 10,
      label: "Google",
      requestId: "req-atomic-1",
    });
    expect(second.status).toBe("completed");
    expect(second.alreadyConsumed).toBe(true);
    expect(second.balance).toBe(90);
  });

  it("refunds failed analysis and allows re-consume", async () => {
    await repo.consumeAnalysisCreditsAtomic({
      userId: 42,
      analysisKey: "username_intelligence",
      credits: 10,
      label: "Username",
      requestId: "req-refund-1",
    });

    const refund = await repo.refundAnalysisCreditsAtomic({
      userId: 42,
      requestId: "req-refund-1",
      reason: "analysis_failed",
    });
    expect(refund.status).toBe("refunded");
    expect(refund.balance).toBe(100);

    const again = await repo.refundAnalysisCreditsAtomic({
      userId: 42,
      requestId: "req-refund-1",
      reason: "retry",
    });
    expect(again.status).toBe("already_refunded");

    const recharge = await repo.consumeAnalysisCreditsAtomic({
      userId: 42,
      analysisKey: "username_intelligence",
      credits: 10,
      label: "Username",
      requestId: "req-refund-1",
    });
    expect(recharge.status).toBe("completed");
    expect(recharge.alreadyConsumed).toBe(false);
    expect(recharge.balance).toBe(90);
  });

  it("never goes negative on insufficient balance", async () => {
    const result = await repo.consumeAnalysisCreditsAtomic({
      userId: 42,
      analysisKey: "google_search",
      credits: 1000,
      label: "Google",
      requestId: "req-poor-1",
    });
    expect(result.status).toBe("insufficient");
    expect(result.balance).toBe(100);
  });
});
