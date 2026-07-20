import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupportStaffAccess } from "@/lib/admin/access";
import { searchAdminUsers } from "@/lib/services/admin-service";

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
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const users = await searchAdminUsers(access.user, query, limit);
  return NextResponse.json(apiSuccess({ users }));
}
