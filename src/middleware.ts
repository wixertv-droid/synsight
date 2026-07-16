import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PROTECTED_ROUTE_PREFIXES,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session-token";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { isHttpsRequest } from "@/lib/security/https";

/**
 * 1) Auth guard for platform routes
 * 2) Runtime HTTPS headers — only when the request is actually HTTPS
 *
 * Never bake upgrade-insecure-requests into the build: HTTP VPS access
 * (e.g. http://159.x.x.x:3000) must keep loading CSS/JS/fonts over HTTP.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let response: NextResponse;

  if (isProtectedRoute) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  if (isHttpsRequest(request)) {
    // Replace the build-time HTTP-safe CSP with the HTTPS-enforcing policy.
    response.headers.set(
      "Content-Security-Policy",
      buildContentSecurityPolicy(true)
    );
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on pages and API — skip Next internals and common static files.
     * Document CSP on HTML responses is what controls asset upgrades.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
