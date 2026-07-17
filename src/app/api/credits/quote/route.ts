import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnalysisQuote } from "@/lib/services/pricing-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }
  const analysisKey =
    new URL(request.url).searchParams.get("analysisKey") ?? "";
  const quote = await getAnalysisQuote(Number(user.id), analysisKey);
  if (!quote) {
    return NextResponse.json(
      apiError("UNKNOWN_ANALYSIS", "Analyse ist nicht verfügbar."),
      { status: 404 }
    );
  }
  return NextResponse.json(apiSuccess(quote));
}
