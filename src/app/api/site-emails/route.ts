import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getPublicSiteEmails } from "@/lib/services/communications-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const emails = await getPublicSiteEmails();
    return NextResponse.json(emails);
  } catch (error) {
    console.error("[site-emails] load failed:", error);
    return NextResponse.json(
      apiError("LOAD_FAILED", "Kontakt-E-Mails konnten nicht geladen werden."),
      { status: 500 }
    );
  }
}
