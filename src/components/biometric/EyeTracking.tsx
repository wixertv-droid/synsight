import type { BiometricView } from "./BiometricAnimations";

const EYES: Record<
  BiometricView,
  { cx: number; cy: number; rx: number; ry: number }[]
> = {
  front: [
    { cx: 84, cy: 98, rx: 7, ry: 4.5 },
    { cx: 116, cy: 98, rx: 7, ry: 4.5 },
  ],
  left_profile: [{ cx: 108, cy: 96, rx: 5.5, ry: 4 }],
  right_profile: [{ cx: 92, cy: 96, rx: 5.5, ry: 4 }],
  angled: [
    { cx: 90, cy: 97, rx: 6, ry: 4.2 },
    { cx: 118, cy: 96, rx: 5.2, ry: 3.8 },
  ],
};

export default function EyeTracking({ view }: { view: BiometricView }) {
  return (
    <g className="bio-eye" aria-hidden="true">
      {EYES[view].map((eye, index) => (
        <g key={`${view}-eye-${index}`}>
          <ellipse
            className="bio-eye-ring"
            cx={eye.cx}
            cy={eye.cy}
            rx={eye.rx + 3}
            ry={eye.ry + 3}
          />
          <ellipse
            className="bio-eye-ring"
            cx={eye.cx}
            cy={eye.cy}
            rx={eye.rx}
            ry={eye.ry}
          />
          <circle className="bio-eye-dot" cx={eye.cx} cy={eye.cy} r="1.4" />
          <line
            x1={eye.cx - eye.rx - 6}
            y1={eye.cy}
            x2={eye.cx - eye.rx - 1}
            y2={eye.cy}
            stroke="var(--bio-primary)"
            strokeWidth="0.6"
            opacity="0.45"
          />
          <line
            x1={eye.cx + eye.rx + 1}
            y1={eye.cy}
            x2={eye.cx + eye.rx + 6}
            y2={eye.cy}
            stroke="var(--bio-primary)"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </g>
      ))}
    </g>
  );
}
