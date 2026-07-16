import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isHttpsEnforced, isSecureCookieRequired } from "@/lib/security/https";

describe("security headers configuration", () => {
  const source = readFileSync(
    path.join(process.cwd(), "next.config.ts"),
    "utf8"
  );

  it("gates HSTS and upgrade-insecure-requests on HTTPS config, not NODE_ENV alone", () => {
    expect(source).toContain("upgrade-insecure-requests");
    expect(source).toContain("Strict-Transport-Security");
    expect(source).toContain("FORCE_HTTPS");
    expect(source).toContain("APP_URL");
    expect(source).not.toMatch(
      /const isProduction = process\.env\.NODE_ENV === "production"/
    );
    expect(source).toMatch(/enforceHttps \? \["upgrade-insecure-requests"\]/);
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
    process.env.APP_URL = "http://synsight.local:3000";
    expect(isHttpsEnforced()).toBe(false);
    expect(isSecureCookieRequired()).toBe(false);
  });

  it("enforces HTTPS for https APP_URL", () => {
    delete process.env.FORCE_HTTPS;
    delete process.env.COOKIE_SECURE;
    process.env.APP_URL = "https://synsight.de";
    expect(isHttpsEnforced()).toBe(true);
    expect(isSecureCookieRequired()).toBe(true);
  });

  it("respects FORCE_HTTPS override", () => {
    process.env.APP_URL = "http://example.com";
    process.env.FORCE_HTTPS = "true";
    expect(isHttpsEnforced()).toBe(true);
  });
});
