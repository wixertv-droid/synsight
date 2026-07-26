import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  deleteSynSightOrder,
  listSynSightOrders,
} from "@/lib/services/hit-actions-service";
import { ensureOrderWorkflowSchema } from "@/lib/orders/ensure-order-workflow-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  await ensureOrderWorkflowSchema();
  const orders = await listSynSightOrders(Number(user.id));
  return NextResponse.json(apiSuccess({ orders }));
}

const deleteSchema = z.object({
  orderId: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Auftrags-ID."),
      { status: 400 }
    );
  }

  const deleted = await deleteSynSightOrder({
    userId: Number(user.id),
    orderId: parsed.data.orderId,
  });
  if (!deleted) {
    return NextResponse.json(apiError("NOT_FOUND", "Auftrag nicht gefunden."), {
      status: 404,
    });
  }
  return NextResponse.json(apiSuccess({ deleted: true }));
}
