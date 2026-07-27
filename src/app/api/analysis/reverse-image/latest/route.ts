import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getLatestReverseImageAwaitingAction,
  getLatestReverseImageReport,
} from "@/lib/analysis/reverse-image/repository";
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

  const [report, pending] = await Promise.all([
    getLatestReverseImageReport(userId),
    getLatestReverseImageAwaitingAction(userId),
  ]);

  return NextResponse.json(apiSuccess({ report, pending }));
}
