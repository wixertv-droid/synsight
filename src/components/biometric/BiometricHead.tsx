"use client";

import { useState } from "react";
import type { BiometricMode, BiometricView } from "./BiometricAnimations";
import {
  BIOMETRIC_VIEW_LABELS,
  biometricModeClass,
  BIOMETRIC_CLASS,
} from "./BiometricAnimations";
import BiometricGlow from "./BiometricGlow";
import BiometricScanner from "./BiometricScanner";
import FaceMesh from "./FaceMesh";
import HudOverlay from "./HudOverlay";
import ScannerLine from "./ScannerLine";
import EyeTracking from "./EyeTracking";

/** Holographic head silhouettes — premium biometric subject per angle. */
const HEAD_PATH: Record<BiometricView, string> = {
  front:
    "M100 46c-18 0-34 14-36 34-1 10 1 20 4 28 2 6 3 12 2 18-2 14 4 28 14 36 6 5 12 10 16 18h0c4-8 10-13 16-18 10-8 16-22 14-36-1-6 0-12 2-18 3-8 5-18 4-28-2-20-18-34-36-34z",
  left_profile:
    "M122 48c-14 2-26 14-28 30-1 8 0 16 3 22 2 5 1 11-1 16-4 12 2 26 12 34 6 5 10 12 11 20h8c2-8 6-14 12-20 8-8 12-20 10-32-1-6 1-12 4-17 4-7 6-16 4-26-3-16-14-28-27-27z",
  right_profile:
    "M78 48c14 2 26 14 28 30 1 8 0 16-3 22-2 5-1 11 1 16 4 12-2 26-12 34-6 5-10 12-11 20h-8c-2-8-6-14-12-20-8-8-12-20-10-32 1-6-1-12-4-17-4-7-6-16-4-26 3-16 14-28 27-27z",
  angled:
    "M106 47c-16 1-30 13-34 30-2 9 0 18 3 26 2 6 2 12 1 18-2 13 5 26 15 34 5 4 10 10 13 17h6c4-7 10-12 16-17 9-8 15-21 13-34 0-6 1-12 3-18 3-8 5-17 3-26-3-18-18-31-39-30z",
};

const INNER_PATH: Record<BiometricView, string> = {
  front:
    "M100 58c-12 0-22 10-23 23-1 8 1 15 3 21 2 5 2 10 1 15-1 10 4 20 11 26 4 3 8 7 11 12 3-5 7-9 11-12 7-6 12-16 11-26-1-5-1-10 1-15 2-6 4-13 3-21-1-13-11-23-23-23z",
  left_profile:
    "M118 62c-9 1-17 9-18 19 0 6 1 11 3 15 1 4 0 8-1 12-2 8 2 16 8 21 3 3 6 8 7 13h4c1-5 4-9 8-13 5-5 8-13 7-21 0-4 1-8 3-12 2-5 3-11 2-17-2-11-9-18-18-17z",
  right_profile:
    "M82 62c9 1 17 9 18 19 0 6-1 11-3 15-1 4 0 8 1 12 2 8-2 16-8 21-3 3-6 8-7 13h-4c-1-5-4-9-8-13-5-5-8-13-7-21 0-4-1-8-3-12-2-5-3-11-2-17 2-11 9-18 18-17z",
  angled:
    "M106 60c-11 1-20 9-22 20-1 7 0 14 2 19 1 5 1 9 0 14-1 9 4 18 11 23 3 3 7 7 9 11h4c3-4 7-8 11-11 6-5 10-14 9-23 0-5 1-9 2-14 2-5 3-12 2-19-2-12-10-20-18-20z",
};

export interface BiometricHeadProps {
  view: BiometricView;
  mode?: BiometricMode;
  /** Controlled mode — skips internal hover state when set with onModeChange omit */
  interactive?: boolean;
  progress?: number;
  className?: string;
  label?: string;
}

export default function BiometricHead({
  view,
  mode: controlledMode,
  interactive = true,
  progress = 0,
  className = "",
  label,
}: BiometricHeadProps) {
  const [hover, setHover] = useState(false);
  const mode: BiometricMode =
    controlledMode ?? (hover && interactive ? "hover" : "idle");

  return (
    <div
      className={`${BIOMETRIC_CLASS.root} ${biometricModeClass(mode)} ${className}`}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      role="img"
      aria-label={
        label ?? `Biometrisches Hologramm — ${BIOMETRIC_VIEW_LABELS[view]}`
      }
    >
      <svg
        className="bio-svg"
        viewBox="0 0 200 240"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`bio-fill-${view}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#5CE1FF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#A7F3FF" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`bio-clip-${view}`}>
            <path d={HEAD_PATH[view]} />
          </clipPath>
        </defs>

        <BiometricGlow />
        <BiometricScanner />

        <g className={BIOMETRIC_CLASS.head}>
          <path
            className="bio-head-outline"
            d={HEAD_PATH[view]}
            fill={`url(#bio-fill-${view})`}
          />
          <path className="bio-head-inner" d={INNER_PATH[view]} />
          <g clipPath={`url(#bio-clip-${view})`}>
            <FaceMesh view={view} />
            <ScannerLine />
          </g>
          <EyeTracking view={view} />
        </g>

        <HudOverlay view={view} mode={mode} progress={progress} />
      </svg>
    </div>
  );
}
