import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("SynSight favicon brand mark", () => {
  it("ships app-router and public favicon assets", () => {
    const required = [
      "src/app/favicon.ico",
      "src/app/icon.svg",
      "src/app/icon.png",
      "src/app/apple-icon.png",
      "public/favicon.ico",
      "public/favicon.svg",
      "public/apple-icon.png",
      "public/icon-192.png",
    ];
    for (const relative of required) {
      expect(existsSync(path.join(root, relative)), relative).toBe(true);
    }
  });

  it("uses SynSight cyan brand colors in the SVG mark", () => {
    const svg = readFileSync(path.join(root, "src/app/icon.svg"), "utf8");
    expect(svg).toContain("#70E7FF");
    expect(svg).toContain("#29B6F6");
    expect(svg).toContain("#04070C");
  });

  it("registers icons and dark theme color in root layout", () => {
    const layout = readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("favicon.svg");
    expect(layout).toContain("apple-icon.png");
    expect(layout).toContain('themeColor: "#04070C"');
    expect(layout).toContain('colorScheme: "dark"');
  });
});
