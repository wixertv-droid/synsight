import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  checkRateLimit,
  rateLimitHeaders,
  recordRateLimitFailure,
  VERIFICATION_RATE_LIMIT,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { resendEmailVerification } from "@/lib/services/verification-service";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const key = `verification:${ip}`;
  const limit = checkRateLimit(key, VERIFICATION_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      apiError("RATE_LIMITED", "Bitte warten Sie vor dem nächsten Versuch."),
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const parsed = resendVerificationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Bitte prüfen Sie die E-Mail-Adresse."),
      { status: 400 }
    );
  }

  const token = await resendEmailVerification(parsed.data.email);
  recordRateLimitFailure(key, VERIFICATION_RATE_LIMIT);

  return NextResponse.json(
    apiSuccess({
      message:
        "Wenn ein unbestätigtes Konto existiert, wurde eine neue Bestätigung vorbereitet.",
      previewToken: process.env.NODE_ENV === "production" ? null : token,
    })
  );
}
