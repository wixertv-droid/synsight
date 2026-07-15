import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("security headers configuration", () => {
  const source = readFileSync(
    path.join(process.cwd(), "next.config.ts"),
    "utf8"
  );

  it("gates HSTS and upgrade-insecure-requests behind production", () => {
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("upgrade-insecure-requests");
    expect(source).toContain("Strict-Transport-Security");
    expect(source).toMatch(
      /\.\.\.\(isProduction \? \["upgrade-insecure-requests"\] : \[\]\)/
    );
    expect(source).toMatch(
      /if \(isProduction\)[\s\S]*Strict-Transport-Security/
    );
  });
});
