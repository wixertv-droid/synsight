import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import { reviewOrders } from "@/lib/services/order-workflow-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Bitte mindestens einen Auftrag wählen."),
      { status: 400 }
    );
  }

  const result = await reviewOrders({
    userId: Number(user.id),
    orderIds: parsed.data.orderIds,
    email: user.email,
  });

  return NextResponse.json(apiSuccess(result));
}
