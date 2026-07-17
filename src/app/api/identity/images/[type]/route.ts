import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteProfileImage } from "@/lib/services/identity-service";
import { validateMutationOrigin } from "@/lib/security/request";

const TYPES = new Set(["front", "left_profile", "right_profile", "angled"]);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Bitte melden Sie sich erneut an."),
      { status: 401 }
    );
  }
  const { type } = await params;
  if (!TYPES.has(type)) {
    return NextResponse.json(
      apiError("INVALID_IMAGE_TYPE", "Ungültiger Bildtyp."),
      { status: 400 }
    );
  }
  const deleted = await deleteProfileImage(
    Number(user.id),
    type as "front" | "left_profile" | "right_profile" | "angled"
  );
  return NextResponse.json(apiSuccess({ deleted }));
}
