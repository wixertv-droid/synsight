import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getStaffAccess } from "@/lib/admin/access";
import { getDatabase } from "@/lib/database/client";
import { users } from "@/lib/database/schema";

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

  const email =
    new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige E-Mail-Adresse."),
      {
        status: 400,
      }
    );
  }

  const db = getDatabase();

  if (!db) {
    return NextResponse.json(
      apiSuccess({
        user: null,
      })
    );
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      status: users.status,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const matched = rows[0];

  return NextResponse.json(
    apiSuccess({
      user: matched
        ? {
            ...matched,
            firstName: null,
            lastName: null,
          }
        : null,
    })
  );
}
