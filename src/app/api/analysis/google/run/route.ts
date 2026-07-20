import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { runGoogleIntelligenceAnalysis } from "@/lib/analysis/google/run-analysis";
import { saveIntelligenceReport } from "@/lib/analysis/session-store";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/request";

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

  const identity = await getIdentityForUser(userId);
  const report = await runGoogleIntelligenceAnalysis(identity);
  saveIntelligenceReport(userId, report);

  return NextResponse.json(apiSuccess({ report }));
}
