import { apiError, apiSuccess } from "@/lib/api/response";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getCurrentUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

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

  const report = getIntelligenceReport(userId, "google_search");
  if (!report) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Noch keine Google-Analyse durchgeführt."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess({ report }));
}
