import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { redeemPromotionByCode } from "@/lib/services/promotions-service";
import {
  checkRateLimit,
  PROMO_REDEEM_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { z } from "zod";

const redeemSchema = z.object({
  promoCode: z.string().trim().min(3, "Promotioncode ist ungültig.").max(64),
});

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

  const userId = Number.parseInt(user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json(
      apiError("INVALID_USER", "Ungültige Benutzer-ID."),
      { status: 400 }
    );
  }

  const ipAddress = getClientIp(request);
  const rateKey = `promo-redeem:${userId}:${ipAddress}`;
  const limit = checkRateLimit(rateKey, PROMO_REDEEM_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Einlöseversuche. Bitte später erneut versuchen."
      ),
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const parsed = redeemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Anfrage."
      ),
      { status: 400 }
    );
  }

  recordRateLimitAttempt(rateKey, PROMO_REDEEM_RATE_LIMIT);

  const result = await redeemPromotionByCode({
    userId,
    promoCode: parsed.data.promoCode,
    ipAddress,
  });

  if (result.status === "invalid_code") {
    return NextResponse.json(
      apiError("INVALID_CODE", "Promotioncode ungültig oder unbekannt."),
      { status: 404 }
    );
  }
  if (result.status === "not_eligible") {
    const message =
      result.reason === "ALREADY_REDEEMED"
        ? "Dieser Promotioncode wurde bereits eingelöst."
        : result.reason === "NEW_USERS_ONLY"
          ? "Dieser Code gilt nur für neue Benutzer."
          : result.reason === "EXISTING_USERS_ONLY"
            ? "Dieser Code gilt nur für bestehende Benutzer."
            : "Promotion kann nicht eingelöst werden.";
    return NextResponse.json(apiError("NOT_ELIGIBLE", message), {
      status: 403,
    });
  }

  return NextResponse.json(
    apiSuccess({
      promotionId: result.promotionId,
      promotionName: result.promotionName,
      credits: result.credits,
      balance: result.balance,
    })
  );
}
