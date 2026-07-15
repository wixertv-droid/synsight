import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/services/user-service";
import {
  updateProfileForUser,
  validateProfileInput,
} from "@/lib/services/profile-service";
import { validateMutationOrigin } from "@/lib/security/request";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const profile = await getUserProfile(user);

  return NextResponse.json(apiSuccess({ profile }));
}

export async function PATCH(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const parsed = validateProfileInput(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(apiError("VALIDATION_ERROR", parsed.message), {
      status: 400,
    });
  }

  await updateProfileForUser(user, parsed.data);
  return NextResponse.json(apiSuccess({ updated: true }));
}
