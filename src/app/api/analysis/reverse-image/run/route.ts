import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { AnalysisGateError } from "@/lib/analysis/assert-runnable";
import { runWithAnalysisCredits } from "@/lib/analysis/run-with-credits";
import {
  ReverseImageUnavailableError,
  startReverseImageRescan,
  startReverseImageSearchScan,
} from "@/lib/analysis/reverse-image/run-analysis";
import { parseRetentionDays } from "@/lib/analysis/retention";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/request";

/** Short — scan continues in background after response. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const userId = Number.parseInt(user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json(
      apiError("INVALID_USER", "Ungültige Benutzer-ID."),
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: unknown;
    retentionDays?: unknown;
    rescanOnly?: unknown;
    scanId?: unknown;
  };
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  const retentionDays = parseRetentionDays(body.retentionDays);
  const rescanOnly = body.rescanOnly === true;
  const rescanScanId = Number.parseInt(String(body.scanId ?? ""), 10);

  try {
    const started = await runWithAnalysisCredits(
      {
        userId,
        analysisKey: "reverse_image_search",
        requestId,
      },
      async () => {
        const identity = await getIdentityForUser(userId);
        if (rescanOnly && Number.isFinite(rescanScanId) && rescanScanId > 0) {
          return startReverseImageRescan(identity, {
            userId,
            scanId: rescanScanId,
          });
        }
        return startReverseImageSearchScan(identity, {
          userId,
          retentionDays,
        });
      }
    );
    // HTTP returns immediately; InsightFace pipeline runs in background.
    return NextResponse.json(
      apiSuccess({
        status: started.status,
        scanId: started.scanId,
        report: null,
        rescan: started.rescan ?? false,
      })
    );
  } catch (error) {
    if (error instanceof AnalysisGateError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.httpStatus,
      });
    }
    if (error instanceof ReverseImageUnavailableError) {
      return NextResponse.json(
        apiError("PROVIDER_UNAVAILABLE", error.message),
        { status: 503 }
      );
    }
    console.error("[analysis/reverse-image/run] failed", error);
    const technical =
      error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      apiError(
        "ANALYSIS_FAILED",
        `Reverse Image Search ist fehlgeschlagen. (${technical.slice(0, 220)})`
      ),
      { status: 500 }
    );
  }
}
