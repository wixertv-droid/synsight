import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { forwardCommunicationRequest } from "@/lib/services/communications-service";
import { adminRequestForwardSchema } from "@/lib/validation/communications";
import { validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        access.status === 401
          ? "Sie müssen angemeldet sein."
          : "Administratorrechte erforderlich."
      ),
      { status: access.status }
    );
  }

  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const json = await request.json().catch(() => null);
  const parsed = adminRequestForwardSchema.safeParse(json);
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
    const result = await forwardCommunicationRequest({
      actor: access.user,
      channel: parsed.data.channel,
      id: parsed.data.id,
      targets: parsed.data.targets,
    });
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_NOT_FOUND") {
      return NextResponse.json(
        apiError("NOT_FOUND", "Anfrage nicht gefunden."),
        { status: 404 }
      );
    }
    console.error("[admin.communications] forward failed:", error);
    return NextResponse.json(
      apiError(
        "FORWARD_FAILED",
        "Die Nachricht konnte nicht weitergeleitet werden."
      ),
      { status: 500 }
    );
  }
}
