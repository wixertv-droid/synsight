import type { BiometricView } from "./BiometricAnimations";
import { FACIAL_FEATURES } from "./headGeometry";

/** Anatomical face strokes — brows, eyes, nose, lips, ears, jaw, cheeks. */
export default function FacialFeatures({ view }: { view: BiometricView }) {
  return (
    <g className="bio-features" aria-hidden="true">
      {FACIAL_FEATURES[view].map((feature, index) => (
        <path
          key={`${view}-${feature.kind}-${index}`}
          className={`bio-feature bio-feature-${feature.kind}`}
          d={feature.d}
          fill={
            feature.kind === "eye" || feature.kind === "ear"
              ? "rgba(0,212,255,0.06)"
              : "none"
          }
        />
      ))}
    </g>
  );
}
