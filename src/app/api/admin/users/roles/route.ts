import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  assignUserRole,
  listAssignableUsers,
} from "@/lib/services/support-service";
import { adminUserRoleSchema } from "@/lib/validation/support";
import { validateMutationOrigin } from "@/lib/security/request";

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Administratorrechte erforderlich."
    ),
    { status }
  );
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const users = await listAssignableUsers(access.user);
  return NextResponse.json(apiSuccess({ users }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  if (!Number.isFinite(userId)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Benutzer-ID fehlt."),
      { status: 400 }
    );
  }

  const parsed = adminUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Rolle."
      ),
      { status: 400 }
    );
  }

  try {
    const user = await assignUserRole(access.user, userId, parsed.data.role);
    if (!user) {
      return NextResponse.json(
        apiError("NOT_FOUND", "Benutzer nicht gefunden."),
        { status: 404 }
      );
    }
    return NextResponse.json(apiSuccess({ user }));
  } catch (error) {
    if (error instanceof Error && error.message === "SELF_DEMOTE_FORBIDDEN") {
      return NextResponse.json(
        apiError(
          "FORBIDDEN",
          "Sie können Ihre eigene Admin-Rolle nicht entfernen."
        ),
        { status: 403 }
      );
    }
    throw error;
  }
}
