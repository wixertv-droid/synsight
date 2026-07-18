import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("email verification spam hint", () => {
  it("asks users to check spam/junk folders", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/auth/EmailVerificationCard.tsx"),
      "utf8"
    );
    expect(source).toContain("Spam");
    expect(source).toContain("Junk");
  });
});
