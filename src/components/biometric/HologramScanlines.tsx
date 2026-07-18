import type { BiometricView } from "./BiometricAnimations";
import {
  buildHologramScanlines,
  buildSilhouettePath,
} from "./scanlineGeometry";

/**
 * Contour-scanline hologram — dense horizontal cyan lines forming a
 * realistic human head (Face-ID / JARVIS style), not outline cartoons.
 */
export default function HologramScanlines({ view }: { view: BiometricView }) {
  const lines = buildHologramScanlines(view, 1.7);
  const silhouette = buildSilhouettePath(view);

  return (
    <g className="bio-hologram" aria-hidden="true">
      <defs>
        <filter
          id={`bio-bloom-${view}`}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft body fill for volume */}
      <path
        className="bio-holo-body"
        d={silhouette}
        filter={`url(#bio-bloom-${view})`}
      />

      {/* Rim glow */}
      <path
        className="bio-holo-rim"
        d={silhouette}
        filter={`url(#bio-bloom-${view})`}
      />

      {/* Contour scanlines */}
      <g className="bio-holo-lines" filter={`url(#bio-bloom-${view})`}>
        {lines.map((line) => (
          <line
            key={`${view}-${line.y}`}
            className="bio-holo-line"
            x1={line.x1}
            y1={line.y}
            x2={line.x2}
            y2={line.y}
            strokeOpacity={line.opacity}
            strokeWidth={line.weight}
          />
        ))}
      </g>
    </g>
  );
}
