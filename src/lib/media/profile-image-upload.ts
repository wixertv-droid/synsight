import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  processAndStoreProfileImage,
  removeStoredProfileImage,
} from "@/lib/media/image-pipeline";
import {
  getIdentityForUser,
  persistProcessedProfileImage,
} from "@/lib/services/identity-service";
import {
  IMAGE_UPLOAD_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

const IMAGE_TYPES = new Set([
  "front",
  "left_profile",
  "right_profile",
  "angled",
]);

export async function handleProfileImageUpload(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Bitte melden Sie sich erneut an."),
      { status: 401 }
    );
  }
  const userId = Number(user.id);
  const rateLimit = recordRateLimitAttempt(
    `image-upload:${userId}:${getClientIp(request)}`,
    IMAGE_UPLOAD_RATE_LIMIT
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      apiError(
        "RATE_LIMITED",
        "Zu viele Bild-Uploads. Bitte versuchen Sie es später erneut."
      ),
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Bildanfrage."),
      { status: 400, headers: rateLimitHeaders(rateLimit) }
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
      { status: 400, headers: rateLimitHeaders(rateLimit) }
    );
  }
  const typedImageType = imageType as
    "front" | "left_profile" | "right_profile" | "angled";

  const current = await getIdentityForUser(userId);
  const existingTypes = new Set(
    current?.images.map((image) => image.imageType) ?? []
  );
  if (existingTypes.size >= 4 && !existingTypes.has(typedImageType)) {
    return NextResponse.json(
      apiError("IMAGE_LIMIT_REACHED", "Maximal 4 Referenzbilder möglich."),
      { status: 409, headers: rateLimitHeaders(rateLimit) }
    );
  }

  let processed = null;
  try {
    processed = await processAndStoreProfileImage({
      userId,
      imageType: typedImageType,
      fileName: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    const persisted = await persistProcessedProfileImage(userId, processed);
    return NextResponse.json(apiSuccess(persisted), {
      status: 201,
      headers: rateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (processed) {
      await removeStoredProfileImage(userId, processed.storagePath).catch(
        () => undefined
      );
    }
    return NextResponse.json(
      apiError(
        "IMAGE_PROCESSING_FAILED",
        error instanceof Error
          ? error.message
          : "Das Bild konnte nicht verarbeitet werden."
      ),
      { status: 400, headers: rateLimitHeaders(rateLimit) }
    );
  }
}
