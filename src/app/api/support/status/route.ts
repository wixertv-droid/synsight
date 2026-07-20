import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { getSupportAvailabilityStatus } from "@/lib/services/support-status-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getSupportAvailabilityStatus();
  return NextResponse.json(apiSuccess({ status }));
}
