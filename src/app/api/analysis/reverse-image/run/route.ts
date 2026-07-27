import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { AnalysisGateError } from "@/lib/analysis/assert-runnable";
import { runWithAnalysisCredits } from "@/lib/analysis/run-with-credits";
import {
  ReverseImageUnavailableError,
  startReverseImageCompare,
  startReverseImageDiscovery,
} from "@/lib/analysis/reverse-image/run-analysis";
import { parseRetentionDays } from "@/lib/analysis/retention";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/request";

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
    compareOnly?: unknown;
    selectedImageUrls?: unknown;
  };
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  const retentionDays = parseRetentionDays(body.retentionDays);
  const rescanOnly = body.rescanOnly === true || body.compareOnly === true;
  const rescanScanId = Number.parseInt(String(body.scanId ?? ""), 10);
  const selectedImageUrls = Array.isArray(body.selectedImageUrls)
    ? body.selectedImageUrls.filter((v): v is string => typeof v === "string")
    : undefined;

  try {
    if (rescanOnly && Number.isFinite(rescanScanId) && rescanScanId > 0) {
      const units = Math.min(Math.max(selectedImageUrls?.length ?? 1, 1), 200);
      const started = await runWithAnalysisCredits(
        {
          userId,
          analysisKey: "reverse_image_compare",
          requestId,
          units,
        },
        async () => {
          const identity = await getIdentityForUser(userId);
          return startReverseImageCompare(identity, {
            userId,
            scanId: rescanScanId,
            selectedImageUrls,
          });
        }
      );
      return NextResponse.json(
        apiSuccess({
          status: started.status,
          scanId: started.scanId,
          report: null,
          rescan: true,
        })
      );
    }

    const started = await runWithAnalysisCredits(
      { userId, analysisKey: "reverse_image_discovery", requestId },
      async () => {
        const identity = await getIdentityForUser(userId);
        return startReverseImageDiscovery(identity, { userId, retentionDays });
      }
    );
    return NextResponse.json(
      apiSuccess({
        status: started.status,
        scanId: started.scanId,
        report: null,
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
    return NextResponse.json(
      apiError("ANALYSIS_FAILED", "Analyse fehlgeschlagen."),
      { status: 500 }
    );
  }
}
