import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
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

  try {
    const report = await getLatestDigitalExposureReport(userId);
    return NextResponse.json(apiSuccess({ report }));
  } catch (error) {
    console.error("[analysis/digital-exposure/latest] failed", error);
    return NextResponse.json(
      apiError("LOAD_FAILED", "Report konnte nicht geladen werden."),
      { status: 500 }
    );
  }
}
