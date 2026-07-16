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
 * Derive the public origin from proxy/host headers so login/register work
 * even when APP_URL does not exactly match the browser address.
 */
function originFromRequestHeaders(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!host) return null;

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const proto =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : normalizeOrigin(request.url)?.startsWith("https:")
        ? "https"
        : "http";

  return normalizeOrigin(`${proto}://${host}`);
}

/**
 * Origin-based CSRF protection for cookie-authenticated mutations.
 * SameSite=Lax remains the first layer; this rejects cross-origin POSTs.
 */
export function validateMutationOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = normalizeOrigin(request.url);
  const hostOrigin = originFromRequestHeaders(request);
  const configuredOrigin = process.env.APP_URL
    ? normalizeOrigin(process.env.APP_URL)
    : null;
  const allowed = new Set(
    [requestOrigin, hostOrigin, configuredOrigin].filter(
      (value): value is string => Boolean(value)
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

  // No Origin/Referer: strict only when CSRF_STRICT=true.
  // Production browser navigations normally send Origin; missing Origin is
  // tolerated so reverse-proxy / API tests against the DB still work.
  if (process.env.CSRF_STRICT === "true") {
    return reject();
  }

  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return reject();
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
