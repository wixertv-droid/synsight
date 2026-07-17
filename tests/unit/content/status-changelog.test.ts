import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPublicSystemStatus } from "@/lib/content/system-status";
import { getChangelogCatalog } from "@/lib/content/changelog";

const root = process.cwd();

describe("Sprint 7 status & changelog", () => {
  it("ships status and changelog routes", () => {
    expect(existsSync(path.join(root, "src/app/status/page.tsx"))).toBe(true);
    expect(existsSync(path.join(root, "src/app/changelog/page.tsx"))).toBe(
      true
    );
  });

  it("exposes static public system status with core components", () => {
    const status = getPublicSystemStatus();
    expect(status.overall).toBe("online");
    expect(status.components.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        "platform",
        "auth",
        "accounts",
        "dashboard",
        "syncredits",
        "database",
        "ai-engine",
        "image-analysis",
      ])
    );
    expect(status.components.find((c) => c.id === "ai-engine")?.status).toBe(
      "in_development"
    );
    expect(
      status.components.find((c) => c.id === "image-analysis")?.status
    ).toBe("preparing");
  });

  it("includes v1.0.0 published and future planned releases", () => {
    const catalog = getChangelogCatalog();
    const v1 = catalog.releases.find((r) => r.version === "v1.0.0");
    const v2 = catalog.releases.find((r) => r.version === "v2.0.0");
    expect(v1?.status).toBe("published");
    expect(v1?.features).toContain("SynCredits Verwaltung");
    expect(v2?.status).toBe("planned");
    expect(v2?.features).toContain("KI Analyse Engine");
  });

  it("links status, changelog and support from the Footer", () => {
    const footer = readFileSync(
      path.join(root, "src/components/layout/Footer.tsx"),
      "utf8"
    );
    expect(footer).toContain('href: "/status"');
    expect(footer).toContain('href: "/changelog"');
    expect(footer).toContain("mailto:support@synsight.de");
    expect(footer).toContain("mailto:contact@synsight.de");
  });
});
