import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  AnalysisGateError,
  assertAnalysisRunnable,
} from "@/lib/analysis/assert-runnable";
import {
  UsernameIntelligenceUnavailableError,
  runUsernameIntelligenceScan,
} from "@/lib/analysis/username/run-analysis";
import { parseRetentionDays } from "@/lib/analysis/retention";
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

  const body = (await request.json().catch(() => ({}))) as {
    retentionDays?: unknown;
    requestId?: unknown;
  };
  const retentionDays = parseRetentionDays(body.retentionDays);
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";

  try {
    await assertAnalysisRunnable({
      userId,
      analysisKey: "username_intelligence",
      requestId,
    });

    const identity = await getIdentityForUser(userId);
    const report = await runUsernameIntelligenceScan(identity, {
      userId,
      retentionDays,
    });
    return NextResponse.json(apiSuccess({ report }));
  } catch (error) {
    if (error instanceof AnalysisGateError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.httpStatus,
      });
    }
    if (error instanceof UsernameIntelligenceUnavailableError) {
      return NextResponse.json(
        apiError("PROVIDER_UNAVAILABLE", error.message),
        { status: 503 }
      );
    }
    console.error("[analysis/username/run] failed", error);
    const technical =
      error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      apiError(
        "ANALYSIS_FAILED",
        `Username Intelligence Scan ist fehlgeschlagen. (${technical.slice(0, 220)})`
      ),
      { status: 500 }
    );
  }
}
