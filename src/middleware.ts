import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PROTECTED_ROUTE_PREFIXES,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * Route guard for the protected platform area (`/dashboard`, `/profile`,
 * `/settings`). Runs on the Edge runtime, so it only uses
 * `verifySessionToken`, which is implemented with the Web Crypto API and
 * has no Node-only dependencies.
 *
 * This is the first line of defense; `(platform)/layout.tsx` additionally
 * calls `getCurrentUser()` server-side as defense in depth.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
