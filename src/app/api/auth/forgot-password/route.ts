import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { canExposeEmailPreviewTokens } from "@/lib/config/env";
import {
  checkRateLimit,
  PASSWORD_RESET_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { requestPasswordReset } from "@/lib/services/password-reset-service";
import { passwordResetRequestSchema } from "@/lib/validation/auth";

const PUBLIC_MESSAGE =
  "Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet. Prüfen Sie auch den Spam-Ordner.";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const key = `password-reset-request:${ip}`;
  const limit = checkRateLimit(key, PASSWORD_RESET_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      apiError("RATE_LIMITED", "Bitte warten Sie vor dem nächsten Versuch."),
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const parsed = passwordResetRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Bitte prüfen Sie die E-Mail-Adresse."),
      { status: 400 }
    );
  }

  const result = await requestPasswordReset(parsed.data.email);
  const attempted = recordRateLimitAttempt(key, PASSWORD_RESET_RATE_LIMIT);

  const showPreview =
    canExposeEmailPreviewTokens() &&
    result.deliveryMode === "log-link" &&
    Boolean(result.token);

  return NextResponse.json(
    apiSuccess({
      message: PUBLIC_MESSAGE,
      previewToken: showPreview ? result.token : null,
      deliveryMode: result.deliveryMode,
    }),
    { headers: rateLimitHeaders(attempted) }
  );
}
