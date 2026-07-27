import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getReverseImageReportByScanId } from "@/lib/analysis/reverse-image/repository";
import { readReverseImageFile } from "@/lib/analysis/reverse-image/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hitId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = Number.parseInt(user.id, 10);
  const { hitId } = await context.params;
  const hitIdNum = Number.parseInt(hitId, 10);
  if (!Number.isFinite(userId) || !Number.isFinite(hitIdNum)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const url = new URL(_request.url);
  const scanId = Number.parseInt(url.searchParams.get("scanId") ?? "", 10);
  if (!Number.isFinite(scanId)) {
    return new NextResponse("scanId required", { status: 400 });
  }

  const report = await getReverseImageReportByScanId(userId, scanId);
  const hit = report?.hits.find((h) => h.id === String(hitIdNum));
  const path =
    url.searchParams.get("thumb") === "1"
      ? hit?.thumbnailPath
      : hit?.storedPath;
  if (!hit || !path) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const bytes = await readReverseImageFile(path);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
