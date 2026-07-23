import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  listPaymentProviders,
  upsertPaymentProvider,
} from "@/lib/services/finance-service";
import { validateMutationOrigin } from "@/lib/security/request";

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

const saveSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(150),
  isActive: z.boolean().optional(),
  supportsCheckout: z.boolean().optional(),
  environment: z.enum(["test", "live"]).optional(),
  notes: z.string().max(500).nullable().optional(),
  apiKey: z.string().min(8).max(500).optional(),
  webhookSecret: z.string().min(8).max(500).optional(),
});

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const providers = await listPaymentProviders(access.user);
  return NextResponse.json(apiSuccess({ providers }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Eingabe."
      ),
      { status: 400 }
    );
  }

  try {
    const provider = await upsertPaymentProvider(access.user, parsed.data);
    return NextResponse.json(apiSuccess({ provider }));
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_REQUIRED") {
      return NextResponse.json(
        apiError("DATABASE_REQUIRED", "Datenbank ist erforderlich."),
        { status: 503 }
      );
    }
    throw error;
  }
}
