/**
 * HTTPS enforcement helpers.
 *
 * Production builds previously toggled CSP `upgrade-insecure-requests` and
 * HSTS purely on `NODE_ENV === "production"`. That breaks HTTP deployments
 * (IP/hostname without TLS): browsers upgrade CSS/JS/font requests to HTTPS,
 * assets fail, and the UI falls back to unstyled defaults.
 *
 * Enforce HTTPS only when explicitly configured.
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
