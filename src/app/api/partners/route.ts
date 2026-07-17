import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  SpamRejectedError,
  submitPartnerRequest,
} from "@/lib/services/communications-service";
import { partnerRequestSchema } from "@/lib/validation/communications";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const ipAddress = getClientIp(request);
  const attempt = recordRateLimitAttempt(
    `partners:${ipAddress}`,
    COMMUNICATION_RATE_LIMIT
  );
  if (!attempt.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Anfragen. Bitte versuchen Sie es später erneut."
      ),
      { status: 429, headers: rateLimitHeaders(attempt) }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = partnerRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400, headers: rateLimitHeaders(attempt) }
    );
  }

  try {
    const result = await submitPartnerRequest({
      data: parsed.data,
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(
      apiSuccess({
        id: result.request.id,
        status: result.request.status,
        message:
          "Ihre Partnerschaftsanfrage wurde übermittelt. Wir melden uns zeitnah.",
      }),
      { status: 201, headers: rateLimitHeaders(attempt) }
    );
  } catch (error) {
    if (error instanceof SpamRejectedError) {
      return NextResponse.json(
        apiSuccess({
          id: 0,
          status: "new",
          message:
            "Ihre Partnerschaftsanfrage wurde übermittelt. Wir melden uns zeitnah.",
        }),
        { status: 201, headers: rateLimitHeaders(attempt) }
      );
    }
    console.error("[partners.submit] failed:", error);
    return NextResponse.json(
      apiError(
        "SUBMIT_FAILED",
        "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut."
      ),
      { status: 500, headers: rateLimitHeaders(attempt) }
    );
  }
}
