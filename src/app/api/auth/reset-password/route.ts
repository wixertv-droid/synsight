import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  checkRateLimit,
  PASSWORD_RESET_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { resetPasswordWithToken } from "@/lib/services/password-reset-service";
import { passwordResetSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const key = `password-reset:${ip}`;
  const limit = checkRateLimit(key, PASSWORD_RESET_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      apiError("RATE_LIMITED", "Bitte warten Sie vor dem nächsten Versuch."),
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const parsed = passwordResetSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte prüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  const result = await resetPasswordWithToken(
    parsed.data.token,
    parsed.data.password
  );
  const attempted = recordRateLimitAttempt(key, PASSWORD_RESET_RATE_LIMIT);

  if (!result.success) {
    const message =
      result.reason === "expired"
        ? "Dieser Link ist abgelaufen. Bitte fordern Sie eine neue E-Mail an."
        : result.reason === "already_used"
          ? "Dieser Link wurde bereits verwendet. Bitte fordern Sie eine neue E-Mail an."
          : result.reason === "account_blocked"
            ? "Das Konto ist nicht verfügbar."
            : "Der Link ist ungültig oder konnte nicht verwendet werden.";
    const code =
      result.reason === "expired"
        ? "TOKEN_EXPIRED"
        : result.reason === "already_used"
          ? "TOKEN_ALREADY_USED"
          : result.reason === "account_blocked"
            ? "ACCOUNT_BLOCKED"
            : "TOKEN_INVALID";
    return NextResponse.json(apiError(code, message), {
      status: 400,
      headers: rateLimitHeaders(attempted),
    });
  }

  return NextResponse.json(
    apiSuccess({
      message:
        "Ihr Passwort wurde aktualisiert. Sie können sich jetzt anmelden.",
      redirectTo: "/login?reset=1",
    }),
    { headers: rateLimitHeaders(attempted) }
  );
}
