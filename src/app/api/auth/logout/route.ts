import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { logout } from "@/lib/services/auth-service";

export async function POST() {
  await logout();
  return NextResponse.json(apiSuccess({ redirectTo: "/login" }));
}
