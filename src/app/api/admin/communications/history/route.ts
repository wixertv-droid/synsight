import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getStaffAccess } from "@/lib/admin/access";

import { listCommunicationHistory } from "@/lib/services/communication-history-service";

import type { CommunicationChannel } from "@/lib/repositories/communications-repository";

const CHANNELS = new Set(["contact", "partner", "press", "support"]);

export async function GET(request: Request) {
  const access = await getStaffAccess();

  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        "Support- oder Administratorrechte erforderlich."
      ),
      {
        status: access.status,
      }
    );
  }

  const url = new URL(request.url);

  const channel = url.searchParams.get("channel");
  const id = Number.parseInt(url.searchParams.get("id") ?? "", 10);

  if (!channel || !CHANNELS.has(channel) || !Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Ticket-Angaben."),
      {
        status: 400,
      }
    );
  }

  const history = await listCommunicationHistory(
    access.user,
    channel as CommunicationChannel,
    id
  );

  return NextResponse.json(
    apiSuccess({
      history,
    })
  );
}
