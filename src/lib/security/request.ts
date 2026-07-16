import { apiError } from "@/lib/api/response";
import { NextResponse } from "next/server";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function hostnameOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function addOriginVariants(target: Set<string>, origin: string | null): void {
  if (!origin) return;
  target.add(origin);
  try {
    const url = new URL(origin);
    const altProto = url.protocol === "https:" ? "http:" : "https:";
    target.add(`${altProto}//${url.host}`);
  } catch {
    // ignore malformed origins
  }
}

/**
 * Derive public host/origin hints from reverse-proxy headers.
 * Nginx often forwards Host + X-Forwarded-Proto; some setups only set one.
 */
function originsFromProxyHeaders(request: Request): string[] {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!host) return [];

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto === "https" || forwardedProto === "http") {
    const origin = normalizeOrigin(`${forwardedProto}://${host}`);
    return origin ? [origin] : [];
  }

  // Proto unknown: accept both schemes so HTTPS frontends behind HTTP upstreams work.
  return [`https://${host}`, `http://${host}`]
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value));
}

function collectTrustedOrigins(request: Request): {
  origins: Set<string>;
  hosts: Set<string>;
} {
  const origins = new Set<string>();
  addOriginVariants(origins, normalizeOrigin(request.url));
  for (const proxyOrigin of originsFromProxyHeaders(request)) {
    addOriginVariants(origins, proxyOrigin);
  }
  if (process.env.APP_URL) {
    addOriginVariants(origins, normalizeOrigin(process.env.APP_URL));
  }

  const hosts = new Set<string>();
  for (const origin of origins) {
    const host = hostnameOf(origin);
    if (host) hosts.add(host);
  }
  return { origins, hosts };
}

function isCsrfStrict(): boolean {
  if (process.env.CSRF_STRICT === "true") return true;
  if (process.env.CSRF_STRICT === "false") return false;
  // Production defaults to strict missing-Origin handling; tests/dev stay open.
  return (process.env.NODE_ENV ?? "development") === "production";
}

function isTrustedOrigin(
  candidate: string,
  trusted: { origins: Set<string>; hosts: Set<string> }
): boolean {
  const normalized = normalizeOrigin(candidate);
  if (!normalized) return false;
  if (trusted.origins.has(normalized)) return true;

  // Protocol-tolerant host match (https://synsight.de vs http://synsight.de:3000 upstream).
  const host = hostnameOf(normalized);
  return Boolean(host && trusted.hosts.has(host));
}

/**
 * Origin-based CSRF protection for cookie-authenticated mutations.
 *
 * Defense in depth with SameSite=Lax cookies:
 * 1. Trust browser Sec-Fetch-Site same-origin (and same-site with Origin check)
 * 2. Reject cross-site
 * 3. Allowlist Origin/Referer against APP_URL + proxy Host (http/https tolerant)
 * 4. Missing Origin: reject only when CSRF_STRICT (default on in production)
 */
export function validateMutationOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");
  const trusted = collectTrustedOrigins(request);

  const reject = () =>
    NextResponse.json(
      apiError("CSRF_REJECTED", "Die Anfrage konnte nicht bestätigt werden."),
      { status: 403 }
    );

  // Browser asserts the request URL matches the page origin — safe behind proxies
  // even when Node sees http://127.0.0.1:3000 while the public site is HTTPS.
  if (fetchSite === "same-origin") {
    return null;
  }

  if (fetchSite === "cross-site") {
    return reject();
  }

  const candidate = origin ?? (referer ? normalizeOrigin(referer) : null);
  if (candidate) {
    if (!isTrustedOrigin(candidate, trusted)) {
      return reject();
    }
    return null;
  }

  // No Origin/Referer (curl, some proxies, older clients).
  if (isCsrfStrict()) {
    return reject();
  }

  if (fetchSite && !["same-site", "none"].includes(fetchSite)) {
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
