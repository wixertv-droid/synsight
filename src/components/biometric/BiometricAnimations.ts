/**
 * SynSight Biometric Design System 2.0 — animation contracts.
 * CSS keyframes live in biometric.css; components only toggle classes/modes.
 */

export type BiometricView =
  "front" | "left_profile" | "right_profile" | "angled";

export type BiometricMode = "idle" | "hover" | "analyzing" | "captured";

export const BIOMETRIC_VIEWS: BiometricView[] = [
  "front",
  "left_profile",
  "right_profile",
  "angled",
];

export const BIOMETRIC_VIEW_LABELS: Record<BiometricView, string> = {
  front: "Front",
  left_profile: "Linkes Profil",
  right_profile: "Rechtes Profil",
  angled: "45° Ansicht",
};

/** Max animation cycle for interactive hover/scan (seconds). */
export const BIOMETRIC_SCAN_DURATION_S = 1.8;

export const BIOMETRIC_CLASS = {
  root: "bio-root",
  idle: "bio-mode-idle",
  hover: "bio-mode-hover",
  analyzing: "bio-mode-analyzing",
  captured: "bio-mode-captured",
  glow: "bio-glow",
  mesh: "bio-mesh",
  scanner: "bio-scanner",
  scanLine: "bio-scan-line",
  eye: "bio-eye",
  hud: "bio-hud",
  head: "bio-head",
  frame: "bio-frame",
} as const;

export function biometricModeClass(mode: BiometricMode): string {
  switch (mode) {
    case "hover":
      return BIOMETRIC_CLASS.hover;
    case "analyzing":
      return BIOMETRIC_CLASS.analyzing;
    case "captured":
      return BIOMETRIC_CLASS.captured;
    default:
      return BIOMETRIC_CLASS.idle;
  }
}
