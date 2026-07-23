import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { runGoogleIntelligenceAnalysis } from "@/lib/analysis/google/run-analysis";
import { saveIntelligenceReport } from "@/lib/analysis/session-store";
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
  };
  const retentionDays = parseRetentionDays(body.retentionDays);

  try {
    const identity = await getIdentityForUser(userId);
    const report = await runGoogleIntelligenceAnalysis(identity, {
      retentionDays,
      userId,
    });
    await saveIntelligenceReport(userId, report);
    return NextResponse.json(apiSuccess({ report }));
  } catch (error) {
    console.error("[analysis/google/run] failed", error);
    const technical =
      error instanceof Error ? error.message : "unbekannter Fehler";
    const friendly =
      /api_credentials|intelligence_reports|ER_NO_SUCH_TABLE/i.test(technical)
        ? "Datenbanktabellen fehlen. Bitte Migrationen ausführen (npm run db:migrate)."
        : /decrypt|auth|bad decrypt|Unsupported state/i.test(technical)
          ? "API-Schlüssel konnten nicht entschlüsselt werden. IMAGE_ENCRYPTION_KEY/SESSION_SECRET prüfen und Keys neu speichern."
          : "Google-Analyse ist fehlgeschlagen. Bitte API-Keys unter Website → APIs & Integrationen prüfen.";

    return NextResponse.json(
      apiError("ANALYSIS_FAILED", `${friendly} (${technical.slice(0, 160)})`),
      { status: 500 }
    );
  }
}
