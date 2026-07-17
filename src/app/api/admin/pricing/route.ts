import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getAdminPricingCatalog,
  resetPricingDefaults,
  updateAnalysisPricing,
} from "@/lib/services/pricing-service";
import { adminAnalysisPricingSchema } from "@/lib/validation/admin-pricing";
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
  return NextResponse.json(
    apiSuccess(await getAdminPricingCatalog(access.user))
  );
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = adminAnalysisPricingSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Preisänderung."
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
    return NextResponse.json(apiSuccess(catalog));
  }

  const updated = await updateAnalysisPricing({
    actor: access.user,
    ...parsed.data,
    ipAddress,
  });
  return NextResponse.json(apiSuccess({ analysis: updated }));
}
