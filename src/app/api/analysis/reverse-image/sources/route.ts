import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getReverseImageSerpSources } from "@/lib/analysis/reverse-image/run-analysis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

  const scanId = Number.parseInt(
    new URL(request.url).searchParams.get("scanId") ?? "",
    10
  );
  if (!Number.isFinite(scanId) || scanId <= 0) {
    return NextResponse.json(
      apiError("INVALID_SCAN", "scanId fehlt oder ist ungültig."),
      { status: 400 }
    );
  }

  const sources = await getReverseImageSerpSources(userId, scanId);
  if (!sources) {
    return NextResponse.json(
      apiError(
        "NOT_FOUND",
        "Keine gespeicherten SerpAPI-Daten für diesen Scan."
      ),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess(sources));
}
