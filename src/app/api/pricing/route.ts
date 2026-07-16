import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { getPricingCatalog } from "@/lib/services/credits-service";

export async function GET() {
  const catalog = await getPricingCatalog();
  return NextResponse.json(apiSuccess(catalog));
}
