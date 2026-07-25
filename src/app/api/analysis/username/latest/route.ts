import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
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
    const report = await getLatestUsernameReport(userId);
    return NextResponse.json(apiSuccess({ report }));
  } catch (error) {
    console.error("[analysis/username/latest] failed", error);
    return NextResponse.json(
      apiError("LOAD_FAILED", "Username-Report konnte nicht geladen werden."),
      { status: 500 }
    );
  }
}
