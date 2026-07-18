"use client";

import Image from "next/image";
import { useState } from "react";
import type { BiometricMode, BiometricView } from "./BiometricAnimations";
import {
  BIOMETRIC_VIEW_LABELS,
  biometricModeClass,
  BIOMETRIC_CLASS,
} from "./BiometricAnimations";
import HudOverlay from "./HudOverlay";
import ScannerLine from "./ScannerLine";

const ASSET: Record<BiometricView, string> = {
  front: "/biometric/front.png",
  left_profile: "/biometric/left_profile.png",
  right_profile: "/biometric/right_profile.png",
  angled: "/biometric/angled.png",
};

export interface BiometricHeadProps {
  view: BiometricView;
  mode?: BiometricMode;
  interactive?: boolean;
  progress?: number;
  className?: string;
  label?: string;
}

/**
 * Biometric reference head — real holographic scan artwork
 * inside the SynSight HUD/scanner chrome.
 */
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
      <div className="bio-photo-stage">
        <Image
          src={ASSET[view]}
          alt=""
          fill
          sizes="220px"
          className="bio-photo-asset"
          priority={false}
        />
        <svg
          className="bio-photo-hud"
          viewBox="0 0 200 240"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <ScannerLine />
          <HudOverlay view={view} mode={mode} progress={progress} />
        </svg>
      </div>
    </div>
  );
}
