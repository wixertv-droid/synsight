import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { loginWithCredentials } from "@/lib/services/auth-service";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  const user = await loginWithCredentials(
    parsed.data.identifier,
    parsed.data.password,
    {
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    }
  );

  if (!user) {
    return NextResponse.json(
      apiError(
        "INVALID_CREDENTIALS",
        "Benutzername oder Passwort ist falsch."
      ),
      { status: 401 }
    );
  }

  return NextResponse.json(apiSuccess({ redirectTo: "/dashboard" }));
}
