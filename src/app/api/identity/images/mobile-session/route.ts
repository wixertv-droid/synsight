import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { createMobileImageUploadSession } from "@/lib/services/mobile-image-upload-service";
import { validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Bitte melden Sie sich erneut an."),
      { status: 401 }
    );
  }

  try {
    const session = await createMobileImageUploadSession(Number(user.id));
    return NextResponse.json(apiSuccess(session), { status: 201 });
  } catch (error) {
    console.error(
      "[mobile-upload] session create failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      apiError(
        "SESSION_CREATE_FAILED",
        "Der Handy-Upload konnte nicht gestartet werden."
      ),
      { status: 500 }
    );
  }
}
