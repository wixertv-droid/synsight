import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getStaffAccess } from "@/lib/admin/access";
import { getSupportUserCase } from "@/lib/services/support-user-case-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const access = await getStaffAccess();

  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        access.status === 401
          ? "Sie müssen angemeldet sein."
          : "Support- oder Administratorrechte erforderlich."
      ),
      {
        status: access.status,
      }
    );
  }

  const { id } = await context.params;

  const userId = Number.parseInt(id, 10);

  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Benutzer-ID."),
      {
        status: 400,
      }
    );
  }

  try {
    const supportCase = await getSupportUserCase(access.user, userId);

    if (!supportCase) {
      return NextResponse.json(
        apiError("NOT_FOUND", "Benutzer wurde nicht gefunden."),
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      apiSuccess({
        supportCase,
      })
    );
  } catch (error) {
    console.error("[admin/support/user-case] failed", error);

    return NextResponse.json(
      apiError(
        "SUPPORT_CASE_FAILED",
        "Support-Akte konnte nicht geladen werden."
      ),
      {
        status: 500,
      }
    );
  }
}
