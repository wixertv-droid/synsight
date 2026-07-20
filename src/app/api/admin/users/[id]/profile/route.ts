import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { getAdminUserFullProfile } from "@/lib/services/admin-user-profile-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
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

  const { id } = await context.params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Benutzer-ID."),
      { status: 400 }
    );
  }

  const profile = await getAdminUserFullProfile(access.user, userId);
  if (!profile) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Benutzer nicht gefunden."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess({ profile }));
}
