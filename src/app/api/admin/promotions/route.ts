import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  createPromotion,
  deletePromotion,
  getAdminPromotionsCatalog,
  setPromotionActiveState,
  updatePromotion,
} from "@/lib/services/promotions-service";
import { adminPromotionSchema } from "@/lib/validation/admin-promotions";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import type { PromotionUpsertInput } from "@/lib/repositories/promotions-repository";
import { z } from "zod";

const promotionPayloadSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  timeFrom: z.string().nullable().optional(),
  timeTo: z.string().nullable().optional(),
  timezone: z.string(),
  bonusCredits: z.number(),
  promoCodeRequired: z.boolean(),
  promoCode: z.string().nullable().optional(),
  newUsersOnly: z.boolean(),
  existingUsersOnly: z.boolean(),
  singleUsePerUser: z.boolean(),
  maxParticipants: z.number().nullable().optional(),
  minBalance: z.number().nullable().optional(),
  budgetCredits: z.number().nullable().optional(),
});

function normalizePromotionData(
  data: z.infer<typeof promotionPayloadSchema>
): Omit<PromotionUpsertInput, "adminId"> {
  return {
    name: data.name,
    description: data.description ?? null,
    isActive: data.isActive,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    timeFrom: data.timeFrom ?? null,
    timeTo: data.timeTo ?? null,
    timezone: data.timezone,
    bonusCredits: data.bonusCredits,
    promoCodeRequired: data.promoCodeRequired,
    promoCode: data.promoCode ?? null,
    newUsersOnly: data.newUsersOnly,
    existingUsersOnly: data.existingUsersOnly,
    singleUsePerUser: data.singleUsePerUser,
    maxParticipants: data.maxParticipants ?? null,
    minBalance: data.minBalance ?? null,
    budgetCredits: data.budgetCredits ?? null,
  };
}

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Administratorrechte erforderlich."
    ),
    { status }
  );
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  return NextResponse.json(
    apiSuccess(await getAdminPromotionsCatalog(access.user))
  );
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = adminPromotionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Promotion."
      ),
      { status: 400 }
    );
  }

  const ipAddress = getClientIp(request);
  const payload = parsed.data;

  function normalizeFromPayload(payload: {
    action: "create" | "update";
    name: string;
    description?: string | null;
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    timeFrom?: string | null;
    timeTo?: string | null;
    timezone: string;
    bonusCredits: number;
    promoCodeRequired: boolean;
    promoCode?: string | null;
    newUsersOnly: boolean;
    existingUsersOnly: boolean;
    singleUsePerUser: boolean;
    maxParticipants?: number | null;
    minBalance?: number | null;
    budgetCredits?: number | null;
  }) {
    return normalizePromotionData(promotionPayloadSchema.parse(payload));
  }

  try {
    if (payload.action === "create") {
      const promotion = await createPromotion({
        actor: access.user,
        data: normalizeFromPayload({
          action: "create",
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          timeFrom: payload.timeFrom,
          timeTo: payload.timeTo,
          timezone: payload.timezone,
          bonusCredits: payload.bonusCredits,
          promoCodeRequired: payload.promoCodeRequired,
          promoCode: payload.promoCode,
          newUsersOnly: payload.newUsersOnly,
          existingUsersOnly: payload.existingUsersOnly,
          singleUsePerUser: payload.singleUsePerUser,
          maxParticipants: payload.maxParticipants,
          minBalance: payload.minBalance,
          budgetCredits: payload.budgetCredits,
        }),
        ipAddress,
      });
      return NextResponse.json(apiSuccess({ promotion }));
    }

    if (payload.action === "update") {
      const result = await updatePromotion({
        actor: access.user,
        id: payload.id,
        data: normalizeFromPayload({
          action: "update",
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          timeFrom: payload.timeFrom,
          timeTo: payload.timeTo,
          timezone: payload.timezone,
          bonusCredits: payload.bonusCredits,
          promoCodeRequired: payload.promoCodeRequired,
          promoCode: payload.promoCode,
          newUsersOnly: payload.newUsersOnly,
          existingUsersOnly: payload.existingUsersOnly,
          singleUsePerUser: payload.singleUsePerUser,
          maxParticipants: payload.maxParticipants,
          minBalance: payload.minBalance,
          budgetCredits: payload.budgetCredits,
        }),
        ipAddress,
      });
      if (result.status === "not_found") {
        return NextResponse.json(
          apiError("PROMOTION_NOT_FOUND", "Promotion nicht gefunden."),
          { status: 404 }
        );
      }
      return NextResponse.json(apiSuccess({ promotion: result.promotion }));
    }

    if (payload.action === "set_active") {
      const result = await setPromotionActiveState({
        actor: access.user,
        id: payload.id,
        isActive: payload.isActive,
        ipAddress,
      });
      if (result.status === "not_found") {
        return NextResponse.json(
          apiError("PROMOTION_NOT_FOUND", "Promotion nicht gefunden."),
          { status: 404 }
        );
      }
      return NextResponse.json(apiSuccess(result));
    }

    const result = await deletePromotion({
      actor: access.user,
      id: payload.id,
      ipAddress,
    });
    if (result.status === "not_found") {
      return NextResponse.json(
        apiError("PROMOTION_NOT_FOUND", "Promotion nicht gefunden."),
        { status: 404 }
      );
    }
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_PROMOTION_TARGETING") {
        return NextResponse.json(
          apiError(
            "VALIDATION_ERROR",
            "Eine Promotion kann nicht gleichzeitig nur für neue und nur für bestehende Benutzer gelten."
          ),
          { status: 400 }
        );
      }
      if (error.message === "PROMO_CODE_REQUIRED") {
        return NextResponse.json(
          apiError(
            "VALIDATION_ERROR",
            "Promotion-Code ist erforderlich, wenn die Code-Pflicht aktiviert ist."
          ),
          { status: 400 }
        );
      }
    }
    throw error;
  }
}
