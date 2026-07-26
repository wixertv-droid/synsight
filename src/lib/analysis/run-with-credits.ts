/**
 * Run an analysis after credit gate; refund SynCredits if the run fails
 * after a fresh charge (RC-3 B-02).
 */
import {
  AnalysisGateError,
  assertAnalysisRunnable,
  type AssertAnalysisRunnableInput,
  type AssertAnalysisRunnableResult,
} from "@/lib/analysis/assert-runnable";
import { refundAnalysisCredits } from "@/lib/services/credits-service";

export async function runWithAnalysisCredits<T>(
  gateInput: AssertAnalysisRunnableInput,
  runner: (gate: AssertAnalysisRunnableResult) => Promise<T>
): Promise<T> {
  const gate = await assertAnalysisRunnable(gateInput);
  const chargedThisAttempt = !gate.alreadyConsumed;
  try {
    return await runner(gate);
  } catch (error) {
    if (!(error instanceof AnalysisGateError) && chargedThisAttempt) {
      try {
        await refundAnalysisCredits(
          gateInput.userId,
          gateInput.requestId,
          error instanceof Error
            ? error.message.slice(0, 180)
            : "analysis_failed"
        );
      } catch (refundError) {
        console.error("[runWithAnalysisCredits] refund failed", refundError);
      }
    }
    throw error;
  }
}
