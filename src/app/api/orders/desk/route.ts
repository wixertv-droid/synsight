import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrdersDesk } from "@/lib/admin/permissions";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  listDeskOrders,
  updateDeskOrderStatus,
} from "@/lib/services/order-workflow-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  if (!canAccessOrdersDesk(user.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Kein Zugriff."), {
      status: 403,
    });
  }

  const statusParam = new URL(request.url).searchParams.get("status") ?? "all";
  const status =
    statusParam === "offen" ||
    statusParam === "in_bearbeitung" ||
    statusParam === "erledigt" ||
    statusParam === "abgelehnt"
      ? statusParam
      : "all";

  const orders = await listDeskOrders({ status });
  return NextResponse.json(apiSuccess({ orders }));
}

const patchSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.enum(["offen", "in_bearbeitung", "erledigt", "abgelehnt"]),
  note: z.string().max(1000).optional().nullable(),
});

export async function PATCH(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  if (!canAccessOrdersDesk(user.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Kein Zugriff."), {
      status: 403,
    });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Statusänderung."),
      { status: 400 }
    );
  }

  const ok = await updateDeskOrderStatus(parsed.data);
  if (!ok) {
    return NextResponse.json(apiError("NOT_FOUND", "Auftrag nicht gefunden."), {
      status: 404,
    });
  }
  return NextResponse.json(apiSuccess({ updated: true }));
}
