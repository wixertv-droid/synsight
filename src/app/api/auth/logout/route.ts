import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { logout } from "@/lib/services/auth-service";
import { validateMutationOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  await logout();
  return NextResponse.json(apiSuccess({ redirectTo: "/" }));
}
