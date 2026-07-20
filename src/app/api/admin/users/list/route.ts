import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupportStaffAccess } from "@/lib/admin/access";
import { listAdminUsers } from "@/lib/services/admin-user-profile-service";

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
  const data = await listAdminUsers(access.user, {
    query: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    sort:
      (url.searchParams.get("sort") as
        "id" | "created" | "login" | "credits") ?? "id",
    direction: (url.searchParams.get("direction") as "asc" | "desc") ?? "desc",
    page: Number(url.searchParams.get("page") ?? "1"),
    limit: Number(url.searchParams.get("limit") ?? "25"),
  });

  return NextResponse.json(apiSuccess(data));
}
