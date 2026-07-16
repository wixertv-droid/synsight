import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import {
  isHttpsEnforced,
  isHttpsRequest,
  isSecureCookieRequired,
} from "@/lib/security/https";

describe("security headers configuration", () => {
  const nextConfig = readFileSync(
    path.join(process.cwd(), "next.config.ts"),
    "utf8"
  );
  const middleware = readFileSync(
    path.join(process.cwd(), "src/middleware.ts"),
    "utf8"
  );

  it("keeps build-time CSP free of protocol upgrades", () => {
    expect(nextConfig).toContain("buildContentSecurityPolicy(false)");
    expect(nextConfig).not.toContain("Strict-Transport-Security");
    expect(buildContentSecurityPolicy(false)).not.toContain(
      "upgrade-insecure-requests"
    );
  });

  it("applies HTTPS upgrades only at runtime in middleware", () => {
    expect(middleware).toContain("isHttpsRequest");
    expect(middleware).toContain("buildContentSecurityPolicy(true)");
    expect(middleware).toContain("Strict-Transport-Security");
  });
});

describe("CSP builder", () => {
  it("omits upgrade directive for HTTP", () => {
    expect(buildContentSecurityPolicy(false)).not.toContain(
      "upgrade-insecure-requests"
    );
  });

  it("includes upgrade directive for HTTPS", () => {
    expect(buildContentSecurityPolicy(true)).toContain(
      "upgrade-insecure-requests"
    );
  });
});

describe("https helpers", () => {
  const original = {
    FORCE_HTTPS: process.env.FORCE_HTTPS,
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    APP_URL: process.env.APP_URL,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does not enforce HTTPS for http APP_URL", () => {
    process.env.FORCE_HTTPS = "false";
    process.env.APP_URL = "http://159.195.157.24:3000";
    expect(isHttpsEnforced()).toBe(false);
    expect(isSecureCookieRequired()).toBe(false);
  });

  it("detects HTTP requests without upgrade", () => {
    delete process.env.FORCE_HTTPS;
    const https = isHttpsRequest({
      headers: { get: () => null },
      nextUrl: { protocol: "http:" },
    });
    expect(https).toBe(false);
  });

  it("detects HTTPS via x-forwarded-proto", () => {
    delete process.env.FORCE_HTTPS;
    const https = isHttpsRequest({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "x-forwarded-proto" ? "https" : null,
      },
      nextUrl: { protocol: "http:" },
    });
    expect(https).toBe(true);
  });
});
