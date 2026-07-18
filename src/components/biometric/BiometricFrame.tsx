import type { ReactNode } from "react";
import { BIOMETRIC_CLASS } from "./BiometricAnimations";

/**
 * Result / match frame — biometric HUD chrome around found imagery.
 * Reuse in analysis results, dashboard cards, admin previews.
 */
export default function BiometricFrame({
  children,
  score,
  label = "MATCH",
  className = "",
}: {
  children: ReactNode;
  /** 0–100 recognition confidence */
  score?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`${BIOMETRIC_CLASS.frame} bio-frame ${className}`}>
      <svg
        className="bio-frame-corners absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M8 22 V8 H22"
          fill="none"
          stroke="var(--bio-secondary)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M78 8 H92 V22"
          fill="none"
          stroke="var(--bio-secondary)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M8 78 V92 H22"
          fill="none"
          stroke="var(--bio-secondary)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M78 92 H92 V78"
          fill="none"
          stroke="var(--bio-secondary)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        {[
          [20, 20],
          [80, 20],
          [20, 80],
          [80, 80],
          [50, 16],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="1.1"
            fill="var(--bio-accent)"
            opacity="0.7"
          />
        ))}
      </svg>
      <div className="relative z-[1]">{children}</div>
      {(score !== undefined || label) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between bg-gradient-to-t from-[#04070c]/90 to-transparent px-3 pb-2.5 pt-8">
          <span className="font-mono text-[8px] tracking-[.16em] text-[var(--bio-accent)]/70">
            {label}
          </span>
          {score !== undefined && (
            <span className="font-mono text-[10px] tracking-[.12em] text-[var(--bio-primary)]">
              {Math.round(score)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
