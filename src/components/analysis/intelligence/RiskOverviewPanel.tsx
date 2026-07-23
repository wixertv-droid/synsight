"use client";

import type { IntelligenceReport } from "@/lib/analysis/types";
import type { RiskLevel } from "@/types/platform";

const riskUi: Record<
  RiskLevel,
  { label: string; ring: string; glow: string; tone: string }
> = {
  low: {
    label: "Niedrig",
    ring: "stroke-emerald-300/70",
    glow: "shadow-[0_0_40px_rgba(52,211,153,.15)]",
    tone: "text-emerald-100/80",
  },
  medium: {
    label: "Mittel",
    ring: "stroke-amber-300/75",
    glow: "shadow-[0_0_40px_rgba(251,191,36,.15)]",
    tone: "text-amber-100/80",
  },
  high: {
    label: "Hoch",
    ring: "stroke-rose-400/80",
    glow: "shadow-[0_0_40px_rgba(251,113,133,.18)]",
    tone: "text-rose-100/85",
  },
};

export default function RiskOverviewPanel({
  report,
}: {
  report: IntelligenceReport;
}) {
  const ui = riskUi[report.riskLevel] ?? riskUi.low;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (report.riskScore / 100) * circumference;
  const buckets = report.buckets ?? {
    total: 0,
    relevant: 0,
    neutral: 0,
    low: 0,
    stale: 0,
  };
  const queries = report.queries ?? [];
  const executive = report.executive;

  const signalBars = [
    { label: "REL", value: buckets.relevant },
    { label: "NEU", value: buckets.neutral },
    { label: "LOW", value: buckets.low },
    { label: "CRT", value: executive?.criticalHits ?? 0 },
    { label: "QRY", value: queries.length },
  ];
  const maxBar = Math.max(...signalBars.map((item) => item.value), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="intel-cyber-hud relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060d16] p-4 md:p-5">
        <div className="intel-cyber-hex opacity-40" aria-hidden="true" />
        <div className="intel-cyber-scanlines" aria-hidden="true" />
        <div className="relative z-[1]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
              TREFFER-VERTEILUNG · SIGNAL MATRIX
            </p>
            <span className="font-mono text-[7px] tracking-[.12em] text-white/25">
              HUD // JARVIS
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Relevant",
                value: buckets.relevant,
                tone: "text-cyber-cyan",
              },
              {
                label: "Neutral",
                value: buckets.neutral,
                tone: "text-white/70",
              },
              {
                label: "Gering",
                value: buckets.low,
                tone: "text-white/45",
              },
              {
                label: "Veraltet",
                value: buckets.stale,
                tone: "text-white/30",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3"
              >
                <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                  {item.label.toUpperCase()}
                </p>
                <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-5 items-end gap-2 rounded-xl border border-cyber-cyan/10 bg-black/20 px-3 py-3">
            {signalBars.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-full max-w-[18px] rounded-sm bg-gradient-to-t from-cyber-cyan/10 via-cyber-cyan/55 to-white/80 intel-cyber-bar"
                  style={{
                    height: `${Math.max(10, (item.value / maxBar) * 64)}px`,
                  }}
                />
                <span className="font-mono text-[6px] tracking-[.08em] text-white/30">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`intel-cyber-hud relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060d16] p-5 ${ui.glow}`}
      >
        <div className="intel-cyber-earth opacity-50" aria-hidden="true" />
        <div className="intel-cyber-scanlines" aria-hidden="true" />
        <div className="relative z-[1] flex flex-col items-center">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            THREAT HEAT · NASA MODE
          </p>
          <div className="relative mt-3 h-40 w-40">
            <div className="intel-cyber-pulse absolute inset-2 rounded-full border border-cyber-cyan/15" />
            <div className="intel-cyber-orbit absolute inset-0 rounded-full border border-dashed border-cyber-cyan/20" />
            <svg
              viewBox="0 0 120 120"
              className="relative h-full w-full -rotate-90"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className={ui.ring}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x = 60 + Math.cos(rad) * 46;
                const y = 60 + Math.sin(rad) * 46;
                return (
                  <circle
                    key={deg}
                    cx={x}
                    cy={y}
                    r="1.4"
                    fill="rgba(114,231,255,0.75)"
                    className="intel-cyber-node"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-semibold text-white/90">
                {report.riskScore}
              </p>
              <p className={`font-mono text-[8px] tracking-[.12em] ${ui.tone}`}>
                {ui.label.toUpperCase()}
              </p>
            </div>
          </div>
          <p className="mt-2 text-center font-mono text-[9px] tracking-[.08em] text-white/35">
            SOC SCORE · VERIFIED HITS ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
