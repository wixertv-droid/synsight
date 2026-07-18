import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  BIOMETRIC_VIEWS,
  BIOMETRIC_VIEW_LABELS,
  biometricModeClass,
} from "@/components/biometric/BiometricAnimations";

describe("biometric design system 2.0", () => {
  const bioDir = path.join(process.cwd(), "src/components/biometric");

  it("ships the central biometric component set", () => {
    const files = readdirSync(bioDir).sort();
    for (const required of [
      "BiometricHead.tsx",
      "BiometricScanner.tsx",
      "FaceMesh.tsx",
      "HudOverlay.tsx",
      "ScannerLine.tsx",
      "EyeTracking.tsx",
      "BiometricGlow.tsx",
      "BiometricFrame.tsx",
      "BiometricAnimations.ts",
      "biometric.css",
      "index.ts",
    ]) {
      expect(files).toContain(required);
      expect(existsSync(path.join(bioDir, required))).toBe(true);
    }
  });

  it("defines all four holographic views", () => {
    expect(BIOMETRIC_VIEWS).toEqual([
      "front",
      "left_profile",
      "right_profile",
      "angled",
    ]);
    expect(BIOMETRIC_VIEW_LABELS.angled).toContain("45");
    expect(biometricModeClass("hover")).toBe("bio-mode-hover");
    expect(biometricModeClass("analyzing")).toBe("bio-mode-analyzing");
  });

  it("wires holograms into profile slots and CSS tokens", () => {
    const slots = readFileSync(
      path.join(
        process.cwd(),
        "src/components/profile/ReferenceImageSlots.tsx"
      ),
      "utf8"
    );
    const css = readFileSync(
      path.join(process.cwd(), "src/components/biometric/biometric.css"),
      "utf8"
    );
    const globals = readFileSync(
      path.join(process.cwd(), "src/app/globals.css"),
      "utf8"
    );
    expect(slots).toContain("BiometricHead");
    expect(slots).not.toContain("function Silhouette");
    expect(css).toContain("--bio-primary: #00d4ff");
    expect(css).toContain("prefers-reduced-motion");
    expect(globals).toContain("biometric.css");
  });
});
