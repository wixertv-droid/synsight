"use client";

/**
 * Landing-page-identical mission progress bar (LaunchScreen).
 * Used inside IntelligenceScanSequence — only replaces the bar, not the theater.
 */
export default function MissionProgressBar({
  progress,
  markers = [18, 42, 66, 88],
  leftLabel = "PIPELINE",
  rightLabel,
}: {
  progress: number;
  markers?: number[];
  leftLabel?: string;
  rightLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="mt-5">
      <div className="mission-progress relative h-[7px] overflow-hidden rounded-[2px] bg-white/[0.065]">
        <div
          className="mission-progress-fill absolute inset-y-0 left-0 transition-[width] duration-200 ease-out"
          style={{ width: `${clamped}%` }}
        >
          <span className="mission-progress-head absolute right-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-cyan-50" />
        </div>
        {markers.map((mark) => (
          <span
            key={mark}
            className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-white/10"
            style={{ left: `${mark}%` }}
            aria-hidden="true"
          />
        ))}
        {/* Subtle energy particles along the track */}
        <span
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(112,231,255,0.08) 40%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "mission-energy-flow 2.8s linear infinite",
          }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[8px] tracking-[.12em] text-white/35">
        <span>{leftLabel}</span>
        <span className="text-sky-300/80">
          {rightLabel ?? `${String(clamped).padStart(3, "0")}%`}
        </span>
      </div>
    </div>
  );
}
