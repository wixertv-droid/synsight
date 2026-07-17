import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  acknowledgePromotionNotification,
  getPendingPromotionNotifications,
} from "@/lib/services/promotions-service";
import { promotionNotificationSchema } from "@/lib/validation/admin-promotions";
import { validateMutationOrigin } from "@/lib/security/request";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const notifications = await getPendingPromotionNotifications(Number(user.id));
  return NextResponse.json(apiSuccess({ notifications }));
}

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

  const parsed = promotionNotificationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Anfrage."
      ),
      { status: 400 }
    );
  }

  const acknowledged = await acknowledgePromotionNotification(
    Number(user.id),
    parsed.data.rewardId
  );
  if (!acknowledged) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Benachrichtigung nicht gefunden."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess({ acknowledged: true }));
}
