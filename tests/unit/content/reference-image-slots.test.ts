import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

describe("reference image slots", () => {
  it("defines the four silhouette angles", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/components/profile/ReferenceImageSlots.tsx"
      ),
      "utf8"
    );
    expect(source).toContain('type: "front"');
    expect(source).toContain('type: "left_profile"');
    expect(source).toContain('type: "right_profile"');
    expect(source).toContain('type: "angled"');
    expect(source).toContain("Von vorn");
    expect(source).toContain("Silhouette");
  });

  it("wires slots and mobile upload into the profile panel", () => {
    const panel = readFileSync(
      path.join(
        process.cwd(),
        "src/components/profile/IdentityProfilePanel.tsx"
      ),
      "utf8"
    );
    expect(panel).toContain("ReferenceImageSlots");
    expect(panel).toContain("QR-Code für Handy");
    expect(panel).toContain("/api/identity/images/mobile-session");
    expect(
      existsSync(path.join(process.cwd(), "src/app/m/upload/page.tsx"))
    ).toBe(true);
  });
});
