import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { listCreditPackages } from "@/lib/services/credits-service";

export async function GET() {
  const packages = await listCreditPackages();
  return NextResponse.json(apiSuccess({ packages }));
}
