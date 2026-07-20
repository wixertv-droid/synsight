import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupportStaffAccess } from "@/lib/admin/access";
import { listAdminAuditEvents } from "@/lib/services/admin-user-profile-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getSupportStaffAccess();
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

  const url = new URL(request.url);
  const userIdParam = url.searchParams.get("userId");
  const userId = userIdParam ? Number.parseInt(userIdParam, 10) : undefined;

  const events = await listAdminAuditEvents(access.user, {
    userId: Number.isFinite(userId) ? userId : undefined,
    limit: Number(url.searchParams.get("limit") ?? "100"),
  });

  return NextResponse.json(apiSuccess({ events }));
}
