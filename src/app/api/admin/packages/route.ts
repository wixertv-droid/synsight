import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getAdminPricingCatalog,
  resetPricingDefaults,
  updateCreditPackagePricing,
} from "@/lib/services/pricing-service";
import { adminPackagePricingSchema } from "@/lib/validation/admin-pricing";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Administratorrechte erforderlich."
    ),
    { status }
  );
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const catalog = await getAdminPricingCatalog(access.user);
  return NextResponse.json(apiSuccess({ packages: catalog.packages }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = adminPackagePricingSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Paketänderung."
      ),
      { status: 400 }
    );
  }

  const ipAddress = getClientIp(request);
  if (parsed.data.action === "reset") {
    const catalog = await resetPricingDefaults({
      actor: access.user,
      scope: parsed.data.scope,
      ipAddress,
    });
    return NextResponse.json(apiSuccess({ packages: catalog.packages }));
  }

  const updated = await updateCreditPackagePricing({
    actor: access.user,
    ...parsed.data,
    ipAddress,
  });
  if (!updated) {
    return NextResponse.json(
      apiError("PACKAGE_NOT_FOUND", "SynCredits-Paket nicht gefunden."),
      { status: 404 }
    );
  }
  return NextResponse.json(apiSuccess({ package: updated }));
}
