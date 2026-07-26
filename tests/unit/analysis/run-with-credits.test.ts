import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analysis/assert-runnable", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/analysis/assert-runnable")
  >("@/lib/analysis/assert-runnable");
  return {
    ...actual,
    assertAnalysisRunnable: vi.fn(),
  };
});

vi.mock("@/lib/services/credits-service", () => ({
  refundAnalysisCredits: vi.fn(),
}));

import { AnalysisGateError } from "@/lib/analysis/assert-runnable";
import { assertAnalysisRunnable } from "@/lib/analysis/assert-runnable";
import { runWithAnalysisCredits } from "@/lib/analysis/run-with-credits";
import { refundAnalysisCredits } from "@/lib/services/credits-service";

describe("runWithAnalysisCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refunds when analysis fails after a fresh charge", async () => {
    vi.mocked(assertAnalysisRunnable).mockResolvedValue({
      analysisKey: "google_search",
      label: "Google",
      creditsCharged: 10,
      balance: 90,
      transactionId: 1,
      usageLogId: 2,
      alreadyConsumed: false,
      apiConfigured: true,
    });

    await expect(
      runWithAnalysisCredits(
        { userId: 1, analysisKey: "google_search", requestId: "abc12345" },
        async () => {
          throw new Error("provider timeout");
        }
      )
    ).rejects.toThrow("provider timeout");

    expect(refundAnalysisCredits).toHaveBeenCalledWith(
      1,
      "abc12345",
      "provider timeout"
    );
  });

  it("does not refund when usage was already consumed (retry)", async () => {
    vi.mocked(assertAnalysisRunnable).mockResolvedValue({
      analysisKey: "google_search",
      label: "Google",
      creditsCharged: 10,
      balance: 90,
      transactionId: 1,
      usageLogId: 2,
      alreadyConsumed: true,
      apiConfigured: true,
    });

    await expect(
      runWithAnalysisCredits(
        { userId: 1, analysisKey: "google_search", requestId: "abc12345" },
        async () => {
          throw new Error("still failing");
        }
      )
    ).rejects.toThrow("still failing");

    expect(refundAnalysisCredits).not.toHaveBeenCalled();
  });

  it("does not refund AnalysisGateError", async () => {
    vi.mocked(assertAnalysisRunnable).mockRejectedValue(
      new AnalysisGateError("MODULE_INACTIVE", "deaktiviert", 403)
    );

    await expect(
      runWithAnalysisCredits(
        { userId: 1, analysisKey: "google_search", requestId: "abc12345" },
        async () => ({ ok: true })
      )
    ).rejects.toBeInstanceOf(AnalysisGateError);

    expect(refundAnalysisCredits).not.toHaveBeenCalled();
  });
});
