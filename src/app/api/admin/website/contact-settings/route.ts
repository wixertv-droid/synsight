import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getCommunicationSettings,
  updateCommunicationSettings,
} from "@/lib/services/communications-service";
import { communicationSettingsSchema } from "@/lib/validation/communications";
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

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const settings = await getCommunicationSettings(access.user);

  return NextResponse.json(apiSuccess(settings));
}

export async function PUT(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const originError = validateMutationOrigin(request);
  if (originError) return originError;

  const json = await request.json().catch(() => null);
  const parsed = communicationSettingsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  const settings = await updateCommunicationSettings({
    actor: access.user,
    ...parsed.data,
  });

  return NextResponse.json(apiSuccess(settings));
}
