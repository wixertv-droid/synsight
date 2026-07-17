import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiSuccess({
        authenticated: false,
        user: null,
      })
    );
  }

  return NextResponse.json(
    apiSuccess({
      authenticated: true,
      user: {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    })
  );
}
