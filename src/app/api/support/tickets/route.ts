import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupportTicket } from "@/lib/services/support-service";
import { createSupportTicketSchema } from "@/lib/validation/support";
import { validateMutationOrigin } from "@/lib/security/request";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Sie müssen angemeldet sein."),
      { status: 401 }
    );
  }

  const { listUserSupportTickets } =
    await import("@/lib/services/support-service");
  const tickets = await listUserSupportTickets(user);
  return NextResponse.json(apiSuccess({ tickets }));
}

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const parsed = createSupportTicketSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Ticket-Daten."
      ),
      { status: 400 }
    );
  }

  if (parsed.data.honeypot) {
    return NextResponse.json(apiSuccess({ ticketNumber: "SYN-IGNORED" }));
  }

  const user = await getCurrentUser();
  const ticket = await createSupportTicket({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    userId: user ? Number(user.id) : null,
    source: user ? "dashboard" : "public",
  });

  return NextResponse.json(apiSuccess({ ticket }));
}
