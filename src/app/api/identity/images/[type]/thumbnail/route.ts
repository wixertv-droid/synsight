import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityRepository } from "@/lib/repositories";
import { readStoredProfileImage } from "@/lib/media/image-pipeline";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { type } = await params;
  const snapshot = await getIdentityRepository().getSnapshot(Number(user.id));
  const image = snapshot?.images.find((row) => row.imageType === type);
  if (!image?.thumbnailPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const bytes = await readStoredProfileImage(
      Number(user.id),
      image.thumbnailPath
    );
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
