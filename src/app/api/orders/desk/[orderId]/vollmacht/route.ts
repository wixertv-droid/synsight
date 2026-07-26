import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrdersDesk } from "@/lib/admin/permissions";
import { readSignedVollmachtFile } from "@/lib/services/order-workflow-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
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

  const orderId = Number((await context.params).orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Auftrags-ID."),
      { status: 400 }
    );
  }

  const file = await readSignedVollmachtFile(orderId);
  if (!file) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Unterschriebene Vollmacht nicht gefunden."),
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "")}"`,
    },
  });
}
