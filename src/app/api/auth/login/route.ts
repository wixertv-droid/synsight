import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { loginWithCredentials } from "@/lib/services/auth-service";
import { loginSchema } from "@/lib/validation/auth";
import {
  checkRateLimit,
  clearRateLimit,
  LOGIN_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitFailure,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { getProfileRepository } from "@/lib/repositories";
import { isOnboardingComplete } from "@/lib/repositories/profile-repository";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ipAddress = getClientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  const rateLimitKey = `login:${ipAddress}:${parsed.data.identifier.toLowerCase()}`;
  const currentLimit = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);
  if (!currentLimit.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut."
      ),
      {
        status: 429,
        headers: rateLimitHeaders(currentLimit),
      }
    );
  }

  const result = await loginWithCredentials(
    parsed.data.identifier,
    parsed.data.password,
    {
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    }
  );

  if (result.status !== "success") {
    const failedLimit = recordRateLimitFailure(rateLimitKey, LOGIN_RATE_LIMIT);
    const message =
      result.status === "locked"
        ? "Das Konto ist vorübergehend gesperrt. Bitte versuchen Sie es später erneut."
        : result.status === "verification_required"
          ? "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."
          : "Benutzername oder Passwort ist falsch.";
    return NextResponse.json(apiError(result.status.toUpperCase(), message), {
      status: result.status === "locked" ? 423 : 401,
      headers: rateLimitHeaders(failedLimit),
    });
  }

  clearRateLimit(rateLimitKey);
  const profile = await getProfileRepository().findByUserId(
    Number(result.user.id)
  );
  const redirectTo = isOnboardingComplete(profile)
    ? "/dashboard"
    : "/onboarding";
  return NextResponse.json(apiSuccess({ redirectTo }));
}
