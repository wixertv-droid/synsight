import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { registerDevUser } from "@/lib/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";

/**
 * DEVELOPMENT ONLY: issues a session for the submitted identity without
 * persisting anything. A production implementation must create a `users`
 * row, hash the password (Argon2id), and send an email verification link
 * before ever issuing a session — see docs/AUDIT_REPORT.md.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  await registerDevUser({
    id: `dev-${Date.now()}`,
    displayName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
    email: parsed.data.email,
    role: "demo",
  });

  return NextResponse.json(apiSuccess({ redirectTo: "/onboarding" }));
}
