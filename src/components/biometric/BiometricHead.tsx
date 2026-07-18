"use client";

import { useId, useState } from "react";
import type { BiometricMode, BiometricView } from "./BiometricAnimations";
import {
  BIOMETRIC_VIEW_LABELS,
  biometricModeClass,
  BIOMETRIC_CLASS,
} from "./BiometricAnimations";
import HologramScanlines from "./HologramScanlines";
import HudOverlay from "./HudOverlay";
import ScannerLine from "./ScannerLine";
import { buildSilhouettePath } from "./scanlineGeometry";

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
  const reactId = useId().replace(/:/g, "");
  const mode: BiometricMode =
    controlledMode ?? (hover && interactive ? "hover" : "idle");
  const clipId = `bio-holo-clip-${view}-${reactId}`;

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
          <clipPath id={clipId}>
            <path d={buildSilhouettePath(view)} />
          </clipPath>
        </defs>

        <g className={BIOMETRIC_CLASS.head}>
          <HologramScanlines view={view} />
          <g clipPath={`url(#${clipId})`}>
            <ScannerLine />
          </g>
        </g>

        <HudOverlay view={view} mode={mode} progress={progress} />
      </svg>
    </div>
  );
}
