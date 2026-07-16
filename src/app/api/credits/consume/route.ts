import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { consumeCredits } from "@/lib/services/credits-service";
import { consumeCreditsSchema } from "@/lib/validation/credits";
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

  const json = await request.json().catch(() => null);
  const parsed = consumeCreditsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ??
          "Bitte bestätigen Sie die Analyse und den Preis."
      ),
      { status: 400 }
    );
  }

  const result = await consumeCredits(
    Number(user.id),
    parsed.data.analysisKey,
    parsed.data.requestId
  );

  if (result.status === "unknown_analysis") {
    return NextResponse.json(
      apiError("UNKNOWN_ANALYSIS", "Unbekannter Analysetyp."),
      { status: 400 }
    );
  }

  if (result.status === "insufficient") {
    return NextResponse.json(
      apiError(
        "INSUFFICIENT_CREDITS",
        `Nicht genügend SynCredits. Benötigt: ${result.required}, verfügbar: ${result.balance}.`
      ),
      { status: 402 }
    );
  }

  return NextResponse.json(apiSuccess(result));
}
