import { handleProfileImageUpload } from "@/lib/media/profile-image-upload";

export async function POST(request: Request) {
  return handleProfileImageUpload(request);
}
