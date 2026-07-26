import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrdersDesk } from "@/lib/admin/permissions";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  getDeskOrderDetail,
  listDeskOrders,
  rejectOrderVollmacht,
  updateDeskOrderStatus,
  verifyOrderVollmacht,
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

  const url = new URL(request.url);
  const orderId = Number(url.searchParams.get("orderId"));
  if (Number.isInteger(orderId) && orderId > 0) {
    const detail = await getDeskOrderDetail(orderId);
    if (!detail) {
      return NextResponse.json(
        apiError("NOT_FOUND", "Auftrag nicht gefunden."),
        { status: 404 }
      );
    }
    return NextResponse.json(apiSuccess({ detail }));
  }

  const userId = Number(url.searchParams.get("userId"));
  const orders = await listDeskOrders({ status: "all" });
  if (Number.isInteger(userId) && userId > 0) {
    return NextResponse.json(
      apiSuccess({
        orders: orders.filter((order) => order.userId === userId),
      })
    );
  }

  const customersMap = new Map<
    number,
    {
      userId: number;
      username: string | null;
      email: string | null;
      openCount: number;
      totalCount: number;
    }
  >();
  for (const order of orders) {
    const existing = customersMap.get(order.userId) ?? {
      userId: order.userId,
      username: order.username ?? null,
      email: order.userEmail ?? null,
      openCount: 0,
      totalCount: 0,
    };
    existing.totalCount += 1;
    if (order.status === "offen" || order.status === "in_bearbeitung") {
      existing.openCount += 1;
    }
    customersMap.set(order.userId, existing);
  }

  const customers = [...customersMap.values()].sort((a, b) => {
    const nameA = (a.username || a.email || "").toLowerCase();
    const nameB = (b.username || b.email || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  return NextResponse.json(apiSuccess({ customers, orders }));
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    orderId: z.number().int().positive(),
    status: z.enum(["offen", "in_bearbeitung", "erledigt", "abgelehnt"]),
    note: z.string().max(1000).optional().nullable(),
  }),
  z.object({
    action: z.literal("reject_vollmacht"),
    orderId: z.number().int().positive(),
    reason: z.string().min(5).max(1000),
  }),
  z.object({
    action: z.literal("verify_vollmacht"),
    orderId: z.number().int().positive(),
  }),
]);

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
      apiError("VALIDATION_ERROR", "Ungültige Anfrage."),
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "status") {
      const ok = await updateDeskOrderStatus(parsed.data);
      if (!ok) {
        return NextResponse.json(
          apiError("NOT_FOUND", "Auftrag nicht gefunden."),
          { status: 404 }
        );
      }
      return NextResponse.json(apiSuccess({ updated: true }));
    }
    if (parsed.data.action === "reject_vollmacht") {
      await rejectOrderVollmacht({
        orderId: parsed.data.orderId,
        reason: parsed.data.reason,
      });
      return NextResponse.json(apiSuccess({ rejected: true }));
    }
    await verifyOrderVollmacht(parsed.data.orderId);
    return NextResponse.json(apiSuccess({ verified: true }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Aktion fehlgeschlagen.";
    const map: Record<string, [string, number]> = {
      REJECT_REASON_SHORT: [
        "Bitte einen klaren Grund angeben (min. 5 Zeichen).",
        400,
      ],
      VOLLMACHT_NOT_FOUND: ["Keine Vollmacht zu diesem Auftrag gefunden.", 404],
    };
    const mapped = map[message];
    return NextResponse.json(apiError(message, mapped?.[0] ?? message), {
      status: mapped?.[1] ?? 400,
    });
  }
}
