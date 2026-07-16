import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { getAdminUserDetail } from "@/lib/services/admin-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json(
      apiError("INVALID_USER_ID", "Ungültige User-ID."),
      { status: 400 }
    );
  }

  const detail = await getAdminUserDetail(access.user, userId);
  if (!detail) {
    return NextResponse.json(
      apiError("USER_NOT_FOUND", "Benutzer nicht gefunden."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess(detail));
}
