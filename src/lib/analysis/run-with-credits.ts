/**
 * Run an analysis after credit gate; refund SynCredits if the run fails.
 *
 * Optional kann derselbe Lauf einen unveränderlichen Support-Snapshot erzeugen:
 * - verwendete Eingaben
 * - tatsächlich ausgegebenes Ergebnis
 * - native Analyse-ID
 * - Credits
 * - Fehler
 *
 * Fehler beim Support-Logging dürfen niemals die Kundenanalyse zerstören.
 */
import {
  AnalysisGateError,
  assertAnalysisRunnable,
  type AssertAnalysisRunnableInput,
  type AssertAnalysisRunnableResult,
} from "@/lib/analysis/assert-runnable";
import { refundAnalysisCredits } from "@/lib/services/credits-service";
import {
  completeAnalysisRunSnapshot,
  failAnalysisRunSnapshot,
  startAnalysisRunSnapshot,
} from "@/lib/services/support-analysis-history-service";

export interface AnalysisSupportSnapshotOptions<T> {
  moduleKey?: string;
  inputSnapshot?: unknown;
  retentionDays?: number;

  /**
   * Verknüpfung mit der nativen Modultabelle:
   * z.B. username_analysis.id oder digital_exposure_scans.id
   */
  nativeRunId?: (result: T) => number | null | undefined;

  /**
   * Standardmäßig wird das vollständige zurückgegebene Ergebnis gespeichert.
   * Kann bei Bedarf eingeschränkt werden.
   */
  resultSnapshot?: (result: T) => unknown;
}

export async function runWithAnalysisCredits<T>(
  gateInput: AssertAnalysisRunnableInput,
  runner: (gate: AssertAnalysisRunnableResult) => Promise<T>,
  supportSnapshot?: AnalysisSupportSnapshotOptions<T>
): Promise<T> {
  const gate = await assertAnalysisRunnable(gateInput);

  const chargedThisAttempt = !gate.alreadyConsumed;

  let snapshotId: number | null = null;

  if (supportSnapshot) {
    try {
      snapshotId = await startAnalysisRunSnapshot({
        userId: gateInput.userId,
        moduleKey: supportSnapshot.moduleKey ?? gateInput.analysisKey,
        requestId: gateInput.requestId || null,
        inputSnapshot: supportSnapshot.inputSnapshot,
        retentionDays: supportSnapshot.retentionDays,
      });
    } catch (error) {
      console.error(
        "[runWithAnalysisCredits] support snapshot start failed",
        error
      );
    }
  }

  try {
    const result = await runner(gate);

    if (supportSnapshot && snapshotId) {
      try {
        const nativeRunId = supportSnapshot.nativeRunId?.(result) ?? null;

        const resultSnapshot = supportSnapshot.resultSnapshot
          ? supportSnapshot.resultSnapshot(result)
          : result;

        await completeAnalysisRunSnapshot({
          snapshotId,
          nativeRunId,
          resultSnapshot,
          creditsCharged: gate.creditsCharged,
        });
      } catch (error) {
        console.error(
          "[runWithAnalysisCredits] support snapshot completion failed",
          error
        );
      }
    }

    return result;
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

    if (supportSnapshot && snapshotId) {
      try {
        await failAnalysisRunSnapshot({
          snapshotId,
          errorCode:
            error instanceof AnalysisGateError
              ? error.code
              : error instanceof Error
                ? error.name
                : "ANALYSIS_FAILED",
          error,
        });
      } catch (snapshotError) {
        console.error(
          "[runWithAnalysisCredits] support snapshot failure logging failed",
          snapshotError
        );
      }
    }

    throw error;
  }
}
