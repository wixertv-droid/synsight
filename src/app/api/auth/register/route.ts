import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { isPublicRegistrationAllowed } from "@/lib/config/env";
import { registerUser } from "@/lib/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";
import {
  rateLimitHeaders,
  recordRateLimitAttempt,
  REGISTER_RATE_LIMIT,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isPublicRegistrationAllowed()) {
    return NextResponse.json(
      apiError(
        "REGISTRATION_DISABLED",
        "Die öffentliche Registrierung ist derzeit nicht verfügbar."
      ),
      { status: 403 }
    );
  }

  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ipAddress = getClientIp(request);
  const rateLimitKey = `register:${ipAddress}`;
  const attempt = recordRateLimitAttempt(rateLimitKey, REGISTER_RATE_LIMIT);
  if (!attempt.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut."
      ),
      { status: 429, headers: rateLimitHeaders(attempt) }
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
      { status: 400, headers: rateLimitHeaders(attempt) }
    );
  }

  const result = await registerUser(parsed.data, { ipAddress });
  if (result.status === "email_exists") {
    return NextResponse.json(
      apiError(
        "EMAIL_EXISTS",
        "Für diese E-Mail-Adresse besteht bereits ein Konto."
      ),
      { status: 409, headers: rateLimitHeaders(attempt) }
    );
  }

  if (result.status === "reserved_username") {
    return NextResponse.json(
      apiError(
        "RESERVED_USERNAME",
        "Diese E-Mail-Adresse kann nicht verwendet werden."
      ),
      { status: 409, headers: rateLimitHeaders(attempt) }
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
    { status: 201, headers: rateLimitHeaders(attempt) }
  );
}
