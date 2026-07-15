import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateMutationOrigin } from "@/lib/security/request";
import { verificationTokenSchema } from "@/lib/validation/auth";
import { verifyEmailToken } from "@/lib/services/verification-service";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const parsed = verificationTokenSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError("INVALID_TOKEN", "Der Bestätigungslink ist ungültig."),
      { status: 400 }
    );
  }

  const result = await verifyEmailToken(parsed.data.token);
  if (!result.success) {
    return NextResponse.json(
      apiError(
        "TOKEN_EXPIRED",
        "Der Bestätigungslink ist abgelaufen oder wurde bereits verwendet."
      ),
      { status: 410 }
    );
  }

  return NextResponse.json(apiSuccess({ redirectTo: "/verification-success" }));
}
