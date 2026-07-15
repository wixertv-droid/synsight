import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/auth/config";

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

describe("route guards", () => {
  it("protects platform and onboarding areas", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/reports")).toBe(true);
    expect(isProtectedRoute("/profile")).toBe(true);
    expect(isProtectedRoute("/settings/security")).toBe(true);
    expect(isProtectedRoute("/onboarding")).toBe(true);
  });

  it("leaves public auth and marketing routes open", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/register")).toBe(false);
    expect(isProtectedRoute("/verify-email")).toBe(false);
    expect(isProtectedRoute("/api/health")).toBe(false);
  });
});
