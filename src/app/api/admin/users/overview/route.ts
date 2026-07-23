import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { getAdminUserOverview } from "@/lib/services/admin-user-profile-service";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const stats = await getAdminUserOverview(access.user);
  return NextResponse.json(apiSuccess({ stats }));
}
