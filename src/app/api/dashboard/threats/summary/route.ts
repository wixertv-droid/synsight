import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  getThreatsSummaryView,
  regenerateThreatsSummary,
} from "@/lib/services/threats-summary-service";

export async function GET() {
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

  const view = await getThreatsSummaryView(userId);
  return NextResponse.json(
    apiSuccess({
      summary: view.summary,
      needsGeneration: view.needsGeneration,
      fingerprint: view.fingerprint,
      threatCount: view.threats.length,
    })
  );
}

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
    force?: unknown;
  };
  const force = body.force === true;

  try {
    const summary = await regenerateThreatsSummary(userId, { force });
    return NextResponse.json(apiSuccess({ summary }));
  } catch (error) {
    console.error("[api/dashboard/threats/summary] regenerate failed", error);
    return NextResponse.json(
      apiError(
        "SUMMARY_FAILED",
        "KI-Lagebild konnte nicht aktualisiert werden."
      ),
      { status: 500 }
    );
  }
}
