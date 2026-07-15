import { apiError } from "@/lib/api/response";
import { NextResponse } from "next/server";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Origin-based CSRF protection for cookie-authenticated mutations.
 * SameSite=Lax remains the first layer; this rejects cross-origin POSTs.
 */
export function validateMutationOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Non-browser clients may omit Origin. Require same-origin fetch metadata
    // when browsers provide it and otherwise allow server-to-server clients.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (
      fetchSite &&
      !["same-origin", "same-site", "none"].includes(fetchSite)
    ) {
      return NextResponse.json(
        apiError("CSRF_REJECTED", "Die Anfrage konnte nicht bestätigt werden."),
        { status: 403 }
      );
    }
    return null;
  }

  const requestOrigin = normalizeOrigin(request.url);
  const configuredOrigin = process.env.APP_URL
    ? normalizeOrigin(process.env.APP_URL)
    : null;
  const allowed = new Set(
    [requestOrigin, configuredOrigin].filter((value): value is string =>
      Boolean(value)
    )
  );

  if (!allowed.has(normalizeOrigin(origin) ?? "")) {
    return NextResponse.json(
      apiError("CSRF_REJECTED", "Die Anfrage konnte nicht bestätigt werden."),
      { status: 403 }
    );
  }

  return null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const value =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return value.slice(0, 45);
}
