import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handleMobileProfileImageUpload } from "@/lib/media/mobile-image-upload";
import { resolveMobileUploadSession } from "@/lib/services/mobile-image-upload-service";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const session = await resolveMobileUploadSession(token);
  if (!session) {
    return NextResponse.json(
      apiError(
        "INVALID_TOKEN",
        "Dieser Handy-Upload-Link ist ungültig oder abgelaufen."
      ),
      { status: 401 }
    );
  }

  return NextResponse.json(
    apiSuccess({
      expiresAt: session.expiresAt,
      slots: session.slots,
    })
  );
}

export async function POST(request: Request) {
  return handleMobileProfileImageUpload(request);
}
