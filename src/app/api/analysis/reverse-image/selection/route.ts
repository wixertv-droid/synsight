import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ReverseImageUnavailableError,
  saveReverseImageSelection,
} from "@/lib/analysis/reverse-image/run-analysis";
import { NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const userId = Number.parseInt(user.id, 10);
  const body = (await request.json().catch(() => ({}))) as {
    scanId?: unknown;
    selectedImageUrls?: unknown;
    manualCandidate?: {
      imageUrl?: string;
      title?: string;
      sourceUrl?: string | null;
    };
  };

  const scanId = Number.parseInt(String(body.scanId ?? ""), 10);
  if (!Number.isFinite(scanId) || scanId <= 0) {
    return NextResponse.json(apiError("INVALID_SCAN", "scanId fehlt."), {
      status: 400,
    });
  }

  const selectedImageUrls = Array.isArray(body.selectedImageUrls)
    ? body.selectedImageUrls.filter((v): v is string => typeof v === "string")
    : [];

  try {
    await saveReverseImageSelection({
      userId,
      scanId,
      selectedImageUrls,
      manualCandidate: body.manualCandidate?.imageUrl
        ? {
            imageUrl: body.manualCandidate.imageUrl,
            title: body.manualCandidate.title,
            sourceUrl: body.manualCandidate.sourceUrl,
          }
        : undefined,
    });
    return NextResponse.json(apiSuccess({ ok: true }));
  } catch (error) {
    if (error instanceof ReverseImageUnavailableError) {
      return NextResponse.json(apiError("NOT_FOUND", error.message), {
        status: 404,
      });
    }
    return NextResponse.json(
      apiError("SAVE_FAILED", "Auswahl konnte nicht gespeichert werden."),
      {
        status: 500,
      }
    );
  }
}
