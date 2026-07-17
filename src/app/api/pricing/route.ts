import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

export async function GET() {
  const catalog = await getPublicPricingCatalog();
  return NextResponse.json(apiSuccess(catalog));
}
