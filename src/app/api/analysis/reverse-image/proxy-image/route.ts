import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api/response";
import {
  getReverseImageSerpSources,
  loadCheckpointForScan,
} from "@/lib/analysis/reverse-image/run-analysis";
import { downloadPublicImage } from "@/lib/analysis/reverse-image/serpapi-images";
import { allCandidates } from "@/lib/analysis/reverse-image/serp-checkpoint";

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase();
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const userId = Number.parseInt(user.id, 10);
  const url = new URL(request.url);
  const scanId = Number.parseInt(url.searchParams.get("scanId") ?? "", 10);
  const imageUrl = url.searchParams.get("url")?.trim() ?? "";

  if (!Number.isFinite(scanId) || scanId <= 0 || !imageUrl) {
    return NextResponse.json(
      apiError("INVALID_REQUEST", "scanId und url erforderlich."),
      {
        status: 400,
      }
    );
  }

  const sources = await getReverseImageSerpSources(userId, scanId);
  const checkpoint = await loadCheckpointForScan(userId, scanId);
  const candidateList =
    sources?.candidates ?? (checkpoint ? allCandidates(checkpoint) : []);
  const match = candidateList.find(
    (c) => normalizeUrl(c.imageUrl) === normalizeUrl(imageUrl)
  );

  if (!match) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Bild gehört nicht zu diesem Scan."),
      {
        status: 403,
      }
    );
  }

  const primary = await downloadPublicImage(imageUrl);
  const fallbackThumb =
    !primary && match.thumbnailUrl
      ? await downloadPublicImage(match.thumbnailUrl)
      : null;
  const bytes = primary ?? fallbackThumb;
  if (!bytes) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Bild konnte nicht geladen werden."),
      {
        status: 404,
      }
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
