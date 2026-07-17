import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("home launch screen session gating", () => {
  it("stores launch completion in sessionStorage", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf8"
    );
    expect(source).toContain("synsight.launch.seen");
    expect(source).toContain("sessionStorage");
    expect(source).toContain('hasSeenLaunchThisSession() ? "ready" : "launch"');
  });
});
