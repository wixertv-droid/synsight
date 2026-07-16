import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { purchaseCreditPackage } from "@/lib/services/credits-service";
import { purchaseCreditsSchema } from "@/lib/validation/credits";
import { validateMutationOrigin } from "@/lib/security/request";

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

  const json = await request.json().catch(() => null);
  const parsed = purchaseCreditsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültiges Paket."
      ),
      { status: 400 }
    );
  }

  const result = await purchaseCreditPackage(
    Number(user.id),
    parsed.data.packageCode
  );

  if (result.status === "not_found") {
    return NextResponse.json(
      apiError("PACKAGE_NOT_FOUND", "Dieses SynCredits-Paket existiert nicht."),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess(result), {
    status: result.status === "completed" ? 201 : 202,
  });
}
