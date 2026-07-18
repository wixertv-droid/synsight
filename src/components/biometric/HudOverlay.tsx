import type { BiometricMode, BiometricView } from "./BiometricAnimations";
import { BIOMETRIC_VIEW_LABELS } from "./BiometricAnimations";

function Corner({
  x,
  y,
  flipX,
  flipY,
}: {
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return (
    <path
      className="bio-hud-corner"
      d={`M ${x} ${y + 12 * sy} V ${y} H ${x + 12 * sx}`}
    />
  );
}

export default function HudOverlay({
  view,
  mode,
  progress = 0,
}: {
  view: BiometricView;
  mode: BiometricMode;
  /** 0–100 analysis progress */
  progress?: number;
}) {
  const dashOffset = 120 - (Math.min(100, Math.max(0, progress)) / 100) * 120;
  const showLandmarks = mode === "analyzing";

  return (
    <g className="bio-hud" aria-hidden="true">
      <Corner x={28} y={28} />
      <Corner x={172} y={28} flipX />
      <Corner x={28} y={212} flipY />
      <Corner x={172} y={212} flipX flipY />

      <text className="bio-hud-label" x="34" y="24">
        BIO / {BIOMETRIC_VIEW_LABELS[view].toUpperCase()}
      </text>
      <text className="bio-hud-label" x="132" y="24">
        ID-SCAN
      </text>

      <circle className="bio-progress-track" cx="100" cy="108" r="86" />
      {(mode === "analyzing" || progress > 0) && (
        <circle
          className="bio-progress-bar"
          cx="100"
          cy="108"
          r="86"
          transform="rotate(-90 100 108)"
          style={{ strokeDashoffset: dashOffset }}
        />
      )}

      {showLandmarks && (
        <g>
          <text className="bio-landmark-tag" x="72" y="90">
            EYE
          </text>
          <text className="bio-landmark-tag" x="118" y="90">
            EYE
          </text>
          <text className="bio-landmark-tag" x="94" y="122">
            NOSE
          </text>
          <text className="bio-landmark-tag" x="92" y="148">
            MOUTH
          </text>
        </g>
      )}
    </g>
  );
}
