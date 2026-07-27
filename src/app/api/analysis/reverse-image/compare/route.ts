import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { AnalysisGateError } from "@/lib/analysis/assert-runnable";
import { runWithAnalysisCredits } from "@/lib/analysis/run-with-credits";
import {
  ReverseImageUnavailableError,
  startReverseImageCompare,
} from "@/lib/analysis/reverse-image/run-analysis";
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
    scanId?: unknown;
    selectedImageUrls?: unknown;
  };
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  const scanId = Number.parseInt(String(body.scanId ?? ""), 10);
  const selectedImageUrls = Array.isArray(body.selectedImageUrls)
    ? body.selectedImageUrls.filter((v): v is string => typeof v === "string")
    : undefined;

  if (!Number.isFinite(scanId) || scanId <= 0) {
    return NextResponse.json(apiError("INVALID_SCAN", "scanId fehlt."), {
      status: 400,
    });
  }

  try {
    const started = await runWithAnalysisCredits(
      { userId, analysisKey: "reverse_image_compare", requestId },
      async () => {
        const identity = await getIdentityForUser(userId);
        return startReverseImageCompare(identity, {
          userId,
          scanId,
          selectedImageUrls,
        });
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
    console.error("[analysis/reverse-image/compare] failed", error);
    return NextResponse.json(
      apiError("ANALYSIS_FAILED", "Gesichtsvergleich ist fehlgeschlagen."),
      { status: 500 }
    );
  }
}
