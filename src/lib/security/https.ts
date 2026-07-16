/**
 * HTTPS detection for cookies and optional explicit overrides.
 *
 * Request-protocol checks live in middleware (Edge). Cookie Secure flags are
 * set in Node route handlers and follow APP_URL / explicit env overrides.
 */

export function isHttpsEnforced(): boolean {
  if (process.env.FORCE_HTTPS === "true") return true;
  if (process.env.FORCE_HTTPS === "false") return false;
  const appUrl = process.env.APP_URL?.trim() ?? "";
  return appUrl.startsWith("https://");
}

/** Session cookies may only set Secure when the site is actually served via HTTPS. */
export function isSecureCookieRequired(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return isHttpsEnforced();
}

/**
 * True when this HTTP request reached the app as HTTPS
 * (direct TLS or reverse-proxy via X-Forwarded-Proto).
 */
export function isHttpsRequest(request: {
  headers: { get(name: string): string | null };
  nextUrl: { protocol: string };
}): boolean {
  if (process.env.FORCE_HTTPS === "true") return true;
  if (process.env.FORCE_HTTPS === "false") return false;

  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
  }

  return request.nextUrl.protocol === "https:";
}
