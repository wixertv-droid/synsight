import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DigitalExposureUnavailableError,
  runDigitalLeakExposureScan,
} from "@/lib/analysis/digital-exposure/run-analysis";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/request";

export const maxDuration = 120;

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

  try {
    const identity = await getIdentityForUser(userId);
    const report = await runDigitalLeakExposureScan(identity, { userId });
    return NextResponse.json(apiSuccess({ report }));
  } catch (error) {
    if (error instanceof DigitalExposureUnavailableError) {
      return NextResponse.json(
        apiError("PROVIDER_UNAVAILABLE", error.message),
        { status: 503 }
      );
    }
    console.error("[analysis/digital-exposure/run] failed", error);
    const technical =
      error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      apiError(
        "ANALYSIS_FAILED",
        `Digital Leak & Exposure Scan ist fehlgeschlagen. (${technical.slice(0, 160)})`
      ),
      { status: 500 }
    );
  }
}
