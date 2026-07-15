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
 *
 * Production browser requests must present a matching Origin (or Referer).
 * Missing Origin is only tolerated in non-production for tooling, and then
 * only when Sec-Fetch-Site is same-origin/same-site/none — never cross-site.
 */
export function validateMutationOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = normalizeOrigin(request.url);
  const configuredOrigin = process.env.APP_URL
    ? normalizeOrigin(process.env.APP_URL)
    : null;
  const allowed = new Set(
    [requestOrigin, configuredOrigin].filter((value): value is string =>
      Boolean(value)
    )
  );

  const reject = () =>
    NextResponse.json(
      apiError("CSRF_REJECTED", "Die Anfrage konnte nicht bestätigt werden."),
      { status: 403 }
    );

  if (fetchSite === "cross-site") {
    return reject();
  }

  const candidate = origin ?? (referer ? normalizeOrigin(referer) : null);
  if (candidate) {
    if (!allowed.has(normalizeOrigin(candidate) ?? "")) {
      return reject();
    }
    return null;
  }

  // No Origin/Referer: strict in production (or when CSRF_STRICT=true).
  const strictCsrf =
    process.env.CSRF_STRICT === "true" || process.env.NODE_ENV === "production";
  if (strictCsrf) {
    return reject();
  }

  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return reject();
  }

  return null;
}

export function getClientIp(request: Request): string {
  // Prefer platform-provided IP. When behind a trusted reverse proxy that
  // overwrites X-Forwarded-For, the left-most hop is the client.
  const forwarded = request.headers.get("x-forwarded-for");
  const value =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return value.slice(0, 45);
}
