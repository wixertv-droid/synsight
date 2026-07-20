import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupportStaffAccess } from "@/lib/admin/access";
import {
  getCommunicationSettings,
  listCommunicationRequests,
  updateCommunicationRequestStatus,
  updateCommunicationSettings,
} from "@/lib/services/communications-service";
import {
  adminRequestStatusUpdateSchema,
  communicationSettingsSchema,
} from "@/lib/validation/communications";
import { validateMutationOrigin } from "@/lib/security/request";
import { getAdminAccess } from "@/lib/admin/access";

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Support- oder Adminrechte erforderlich."
    ),
    { status }
  );
}

export async function GET() {
  const access = await getSupportStaffAccess();
  if (!access.granted) return denied(access.status);

  const requests = await listCommunicationRequests(access.user);
  if (access.user.role === "admin") {
    const settings = await getCommunicationSettings(access.user);
    return NextResponse.json(apiSuccess({ settings, requests }));
  }

  return NextResponse.json(apiSuccess({ requests }));
}

export async function PUT(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

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

export async function PATCH(request: Request) {
  const access = await getSupportStaffAccess();
  if (!access.granted) return denied(access.status);

  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const json = await request.json().catch(() => null);
  const parsed = adminRequestStatusUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      ),
      { status: 400 }
    );
  }

  try {
    const updated = await updateCommunicationRequestStatus({
      actor: access.user,
      channel: parsed.data.channel,
      id: parsed.data.id,
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
    });
    return NextResponse.json(apiSuccess(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_NOT_FOUND") {
      return NextResponse.json(
        apiError("NOT_FOUND", "Anfrage nicht gefunden."),
        { status: 404 }
      );
    }
    console.error("[admin.communications] status update failed:", error);
    return NextResponse.json(
      apiError("UPDATE_FAILED", "Status konnte nicht aktualisiert werden."),
      { status: 500 }
    );
  }
}
