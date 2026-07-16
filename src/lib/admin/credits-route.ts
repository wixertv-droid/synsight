import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { adjustCreditsByAdmin } from "@/lib/services/admin-service";
import { adminCreditAdjustmentSchema } from "@/lib/validation/admin";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

export async function handleAdminCreditAdjustment(
  request: Request,
  operation: "add" | "remove"
) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const access = await getAdminAccess();
  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        access.status === 401
          ? "Sie müssen angemeldet sein."
          : "Administratorrechte erforderlich."
      ),
      { status: access.status }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = adminCreditAdjustmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ??
          "Anzahl, Grund und Bestätigung sind erforderlich."
      ),
      { status: 400 }
    );
  }

  const result = await adjustCreditsByAdmin({
    actor: access.user,
    targetUserId: parsed.data.userId,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    operation,
    ipAddress: getClientIp(request),
  });

  if (result.status === "not_found") {
    return NextResponse.json(
      apiError("USER_NOT_FOUND", "Benutzer nicht gefunden."),
      { status: 404 }
    );
  }
  if (result.status === "insufficient") {
    return NextResponse.json(
      apiError(
        "INSUFFICIENT_CREDITS",
        `Guthaben kann nicht negativ werden. Verfügbar: ${result.balance}.`
      ),
      { status: 409 }
    );
  }

  return NextResponse.json(apiSuccess(result));
}
