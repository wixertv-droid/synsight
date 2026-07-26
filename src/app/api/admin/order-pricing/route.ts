import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAdminArea } from "@/lib/admin/permissions";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  listOrderPricing,
  resetOrderPricingDefaults,
  upsertOrderPricing,
} from "@/lib/services/order-pricing-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  if (!canAccessAdminArea(user.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin only."), {
      status: 403,
    });
  }

  const pricing = await listOrderPricing(false);
  return NextResponse.json(apiSuccess({ pricing }));
}

const upsertSchema = z.object({
  action: z.literal("upsert"),
  orderType: z.string().min(2).max(64),
  label: z.string().min(2).max(150),
  description: z.string().max(500).nullable().optional(),
  credits: z.number().int().min(0).max(100_000),
  requiresVollmacht: z.boolean(),
  synsightCapable: z.boolean(),
  capabilityHint: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

const resetSchema = z.object({
  action: z.literal("reset"),
});

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  if (!canAccessAdminArea(user.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin only."), {
      status: 403,
    });
  }

  const body = await request.json().catch(() => null);
  const reset = resetSchema.safeParse(body);
  if (reset.success) {
    const pricing = await resetOrderPricingDefaults(Number(user.id));
    return NextResponse.json(apiSuccess({ pricing }));
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Preisdaten."),
      { status: 400 }
    );
  }

  const { action: _action, ...payload } = parsed.data;
  const row = await upsertOrderPricing({
    ...payload,
    adminId: Number(user.id),
  });
  return NextResponse.json(apiSuccess({ pricing: row }));
}
