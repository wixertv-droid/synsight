import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  SpamRejectedError,
  submitPressRequest,
} from "@/lib/services/communications-service";
import { pressRequestSchema } from "@/lib/validation/communications";
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
    `press:${ipAddress}`,
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
  const parsed = pressRequestSchema.safeParse(json);
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
    const result = await submitPressRequest({
      data: parsed.data,
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(
      apiSuccess({
        id: result.request.id,
        status: result.request.status,
        message:
          "Ihre Presseanfrage wurde übermittelt. Unser Medienteam meldet sich.",
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
            "Ihre Presseanfrage wurde übermittelt. Unser Medienteam meldet sich.",
        }),
        { status: 201, headers: rateLimitHeaders(attempt) }
      );
    }
    console.error("[press.submit] failed:", error);
    return NextResponse.json(
      apiError(
        "SUBMIT_FAILED",
        "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut."
      ),
      { status: 500, headers: rateLimitHeaders(attempt) }
    );
  }
}
