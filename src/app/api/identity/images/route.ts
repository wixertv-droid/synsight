import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { processAndStoreProfileImage } from "@/lib/media/image-pipeline";
import { validateMutationOrigin } from "@/lib/security/request";

const IMAGE_TYPES = new Set([
  "front",
  "left_profile",
  "right_profile",
  "angled",
]);

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

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Bildanfrage."),
      { status: 400 }
    );
  }

  const imageType = String(form.get("imageType") ?? "");
  const file = form.get("file");

  if (!IMAGE_TYPES.has(imageType) || !(file instanceof File)) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        "Bildtyp oder Datei fehlt beziehungsweise ist ungültig."
      ),
      { status: 400 }
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const processed = await processAndStoreProfileImage({
      userId: Number(user.id),
      imageType: imageType as
        "front" | "left_profile" | "right_profile" | "angled",
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });
    return NextResponse.json(apiSuccess(processed), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      apiError(
        "IMAGE_PROCESSING_FAILED",
        error instanceof Error
          ? error.message
          : "Das Bild konnte nicht verarbeitet werden."
      ),
      { status: 400 }
    );
  }
}
