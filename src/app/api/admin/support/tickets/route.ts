import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupportStaffAccess } from "@/lib/admin/access";
import {
  listStaffSupportTickets,
  updateStaffSupportTicket,
} from "@/lib/services/support-service";
import { adminSupportTicketUpdateSchema } from "@/lib/validation/support";
import { validateMutationOrigin } from "@/lib/security/request";

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

export async function GET(request: Request) {
  const access = await getSupportStaffAccess();
  if (!access.granted) return denied(access.status);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  const tickets = await listStaffSupportTickets(access.user, {
    status: status as
      "new" | "open" | "waiting" | "resolved" | "closed" | undefined,
    limit: Number(url.searchParams.get("limit") ?? "100"),
  });

  return NextResponse.json(apiSuccess({ tickets }));
}

export async function PATCH(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getSupportStaffAccess();
  if (!access.granted) return denied(access.status);

  const body = await request.json().catch(() => null);
  const ticketId = Number(body?.ticketId);
  if (!Number.isFinite(ticketId)) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ticket-ID fehlt."), {
      status: 400,
    });
  }

  const parsed = adminSupportTicketUpdateSchema.safeParse(body?.patch ?? body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Ticket-Aktualisierung."
      ),
      { status: 400 }
    );
  }

  const ticket = await updateStaffSupportTicket(
    access.user,
    ticketId,
    parsed.data
  );
  if (!ticket) {
    return NextResponse.json(apiError("NOT_FOUND", "Ticket nicht gefunden."), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess({ ticket }));
}
