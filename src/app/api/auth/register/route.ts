import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { registerUser } from "@/lib/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";
import {
  checkRateLimit,
  rateLimitHeaders,
  recordRateLimitFailure,
  REGISTER_RATE_LIMIT,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ipAddress = getClientIp(request);
  const rateLimitKey = `register:${ipAddress}`;
  const currentLimit = checkRateLimit(rateLimitKey, REGISTER_RATE_LIMIT);
  if (!currentLimit.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut."
      ),
      { status: 429, headers: rateLimitHeaders(currentLimit) }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  const result = await registerUser(parsed.data, { ipAddress });
  if (result.status === "email_exists") {
    recordRateLimitFailure(rateLimitKey, REGISTER_RATE_LIMIT);
    return NextResponse.json(
      apiError(
        "EMAIL_EXISTS",
        "Für diese E-Mail-Adresse besteht bereits ein Konto."
      ),
      { status: 409 }
    );
  }

  const previewToken =
    process.env.NODE_ENV === "production" ? null : result.verificationToken;
  const query = new URLSearchParams({ email: result.email });
  if (previewToken) query.set("preview", previewToken);

  return NextResponse.json(
    apiSuccess({
      redirectTo: `/verify-email?${query.toString()}`,
    }),
    { status: 201 }
  );
}
