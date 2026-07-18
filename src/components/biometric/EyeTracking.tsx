import type { BiometricView } from "./BiometricAnimations";

const EYES: Record<
  BiometricView,
  { cx: number; cy: number; rx: number; ry: number }[]
> = {
  front: [
    { cx: 84, cy: 102, rx: 8, ry: 4.2 },
    { cx: 116, cy: 102, rx: 8, ry: 4.2 },
  ],
  left_profile: [{ cx: 95, cy: 97, rx: 6, ry: 3.8 }],
  right_profile: [{ cx: 105, cy: 97, rx: 6, ry: 3.8 }],
  angled: [
    { cx: 89, cy: 100, rx: 7, ry: 4 },
    { cx: 124, cy: 98, rx: 6, ry: 3.6 },
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
            rx={eye.rx + 3.5}
            ry={eye.ry + 3}
          />
          <ellipse
            className="bio-eye-ring"
            cx={eye.cx}
            cy={eye.cy}
            rx={eye.rx}
            ry={eye.ry}
          />
          <circle className="bio-eye-dot" cx={eye.cx} cy={eye.cy} r="1.5" />
          <line
            x1={eye.cx - eye.rx - 7}
            y1={eye.cy}
            x2={eye.cx - eye.rx - 1.5}
            y2={eye.cy}
            stroke="var(--bio-primary)"
            strokeWidth="0.65"
            opacity="0.5"
          />
          <line
            x1={eye.cx + eye.rx + 1.5}
            y1={eye.cy}
            x2={eye.cx + eye.rx + 7}
            y2={eye.cy}
            stroke="var(--bio-primary)"
            strokeWidth="0.65"
            opacity="0.5"
          />
        </g>
      ))}
    </g>
  );
}
