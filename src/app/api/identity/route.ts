import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getIdentityForUser,
  saveIdentityForUser,
} from "@/lib/services/identity-service";
import { validateMutationOrigin } from "@/lib/security/request";
import { identityProfileSchema } from "@/lib/validation/identity";
import { getProfileRepository } from "@/lib/repositories";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Bitte melden Sie sich erneut an."),
      { status: 401 }
    );
  }

  const userId = Number(user.id);
  await getProfileRepository().ensureDraft(userId, {
    firstName: user.displayName.split(" ")[0] || "User",
    lastName: user.displayName.split(" ").slice(1).join(" ") || "Account",
  });

  const identity = await getIdentityForUser(userId);
  if (!identity) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Profil wurde nicht gefunden."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess(identity));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Bitte melden Sie sich erneut an."),
      { status: 401 }
    );
  }

  const parsed = identityProfileSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Angaben."
      ),
      { status: 400 }
    );
  }

  const identity = await saveIdentityForUser(Number(user.id), parsed.data);
  return NextResponse.json(apiSuccess(identity));
}
