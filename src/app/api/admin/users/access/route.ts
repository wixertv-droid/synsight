import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAccess } from "@/lib/admin/access";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  ADMIN_USER_ROLE_DEFINITIONS,
  changeAdminManagedUserRole,
  changeAdminManagedUserStatus,
  manuallyVerifyUser,
  resendUserVerification,
  revokeUserSessions,
} from "@/lib/services/admin-user-access-service";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role"),
    userId: z.number().int().positive(),
    role: z.enum(["user", "support", "worker", "admin"]),
  }),

  z.object({
    action: z.literal("status"),
    userId: z.number().int().positive(),
    status: z.enum(["pending_verification", "active", "suspended"]),
  }),

  z.object({
    action: z.literal("verify"),
    userId: z.number().int().positive(),
  }),

  z.object({
    action: z.literal("resend_verification"),
    userId: z.number().int().positive(),
  }),

  z.object({
    action: z.literal("revoke_sessions"),
    userId: z.number().int().positive(),
  }),
]);

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  const messages: Record<string, string> = {
    ADMIN_FORBIDDEN: "Administratorrechte erforderlich.",

    USER_NOT_FOUND: "Benutzer wurde nicht gefunden.",

    SELF_ADMIN_ROLE_CHANGE_FORBIDDEN:
      "Sie können Ihrem eigenen Konto nicht die Administratorrolle entziehen.",

    LAST_ADMIN_PROTECTED:
      "Der letzte Administrator kann nicht herabgestuft werden.",

    SELF_SUSPEND_FORBIDDEN:
      "Sie können Ihr eigenes Administratorkonto nicht sperren.",

    SELF_SESSION_REVOKE_FORBIDDEN:
      "Ihre eigene Admin-Sitzung kann hier nicht beendet werden.",

    USER_NOT_VERIFIED:
      "Das Konto ist noch nicht verifiziert. Verifizieren Sie es zuerst.",

    USER_DELETED: "Gelöschte Konten können hier nicht verifiziert werden.",

    USER_SUSPENDED: "Ein gesperrtes Konto muss zuerst entsperrt werden.",

    VERIFICATION_RESEND_NOT_AVAILABLE:
      "Eine neue Verifizierung kann nur für noch nicht verifizierte Konten versendet werden.",
  };

  return NextResponse.json(
    apiError(
      code,
      messages[code] ?? "Die Benutzeraktion konnte nicht ausgeführt werden."
    ),
    {
      status:
        code === "USER_NOT_FOUND"
          ? 404
          : code === "ADMIN_FORBIDDEN"
            ? 403
            : 400,
    }
  );
}

export async function GET() {
  const access = await getAdminAccess();

  if (!access.granted) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Administratorrechte erforderlich."),
      { status: access.status }
    );
  }

  return NextResponse.json(
    apiSuccess({
      roles: ADMIN_USER_ROLE_DEFINITIONS,
    })
  );
}

export async function POST(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Administratorrechte erforderlich."),
      { status: access.status }
    );
  }

  const originError = validateMutationOrigin(request);

  if (originError) {
    return originError;
  }

  const body = await request.json().catch(() => null);

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Benutzeraktion."),
      { status: 400 }
    );
  }

  try {
    let result: unknown;

    switch (parsed.data.action) {
      case "role":
        result = await changeAdminManagedUserRole(
          access.user,
          parsed.data.userId,
          parsed.data.role
        );
        break;

      case "status":
        result = await changeAdminManagedUserStatus(
          access.user,
          parsed.data.userId,
          parsed.data.status
        );
        break;

      case "verify":
        result = await manuallyVerifyUser(access.user, parsed.data.userId);
        break;

      case "resend_verification":
        result = await resendUserVerification(access.user, parsed.data.userId);
        break;

      case "revoke_sessions":
        result = await revokeUserSessions(access.user, parsed.data.userId);
        break;
    }

    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    console.error("[admin/users/access]", error);

    return errorResponse(error);
  }
}
