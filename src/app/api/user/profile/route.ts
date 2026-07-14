import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/services/user-service";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const profile = await getUserProfile(user);

  return NextResponse.json(apiSuccess({ profile }));
}
