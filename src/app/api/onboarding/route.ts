import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  completeOnboarding,
  validateOnboardingPayload,
} from "@/lib/services/onboarding-service";

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

  const parsed = validateOnboardingPayload(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(apiError("VALIDATION_ERROR", parsed.message), {
      status: 400,
    });
  }

  await completeOnboarding(Number(user.id), parsed.data);
  return NextResponse.json(apiSuccess({ redirectTo: "/dashboard" }));
}
