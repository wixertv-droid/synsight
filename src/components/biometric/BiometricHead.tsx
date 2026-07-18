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
import FacialFeatures from "./FacialFeatures";
import HudOverlay from "./HudOverlay";
import ScannerLine from "./ScannerLine";
import EyeTracking from "./EyeTracking";
import { FACE_PLATE, HEAD_OUTLINE } from "./headGeometry";

export interface BiometricHeadProps {
  view: BiometricView;
  mode?: BiometricMode;
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
        label ?? `Biometrischer Humankopf — ${BIOMETRIC_VIEW_LABELS[view]}`
      }
    >
      <svg
        className="bio-svg"
        viewBox="0 0 200 240"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id={`bio-fill-${view}`}
            x1="0.2"
            y1="0"
            x2="0.8"
            y2="1"
          >
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#5CE1FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#A7F3FF" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`bio-clip-${view}`}>
            <path d={HEAD_OUTLINE[view]} />
          </clipPath>
        </defs>

        <BiometricGlow />
        <BiometricScanner />

        <g className={BIOMETRIC_CLASS.head}>
          {/* Base anatomy first — human silhouette */}
          <path
            className="bio-head-outline"
            d={HEAD_OUTLINE[view]}
            fill={`url(#bio-fill-${view})`}
          />
          <path className="bio-head-inner" d={FACE_PLATE[view]} />

          {/* Explicit facial anatomy */}
          <FacialFeatures view={view} />

          {/* Futuristic layers on top of anatomy */}
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
