import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDatabase } from "@/lib/database/client";
import { newsletterSubscribers } from "@/lib/database/schema";

export async function POST(request: Request) {
  const form = await request.formData();

  const token = String(form.get("token") ?? "").trim();

  if (token.length === 64) {
    const db = getDatabase();

    if (db) {
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");

      await db
        .update(newsletterSubscribers)
        .set({
          status: "unsubscribed",
          unsubscribedAt: now,
        })
        .where(eq(newsletterSubscribers.unsubscribeToken, token));
    }
  }

  return NextResponse.redirect(
    new URL("/newsletter/abmelden?status=done", request.url),
    303
  );
}
