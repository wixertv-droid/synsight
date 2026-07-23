"use client";

import type { IntelligenceReport } from "@/lib/analysis/types";
import type { RiskLevel } from "@/types/platform";

const riskUi: Record<RiskLevel, { label: string; ring: string; glow: string }> =
  {
    low: {
      label: "Niedrig",
      ring: "stroke-emerald-300/70",
      glow: "shadow-[0_0_40px_rgba(52,211,153,.15)]",
    },
    medium: {
      label: "Mittel",
      ring: "stroke-amber-300/75",
      glow: "shadow-[0_0_40px_rgba(251,191,36,.15)]",
    },
    high: {
      label: "Hoch",
      ring: "stroke-rose-400/80",
      glow: "shadow-[0_0_40px_rgba(251,113,133,.18)]",
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

  const radarPoints = [
    buckets.relevant,
    buckets.neutral,
    buckets.low,
    executive?.criticalHits ?? 0,
    queries.length,
  ];
  const maxRadar = Math.max(...radarPoints, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-5">
        <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
          TREFFER-VERTEILUNG
        </p>
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
              className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
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

        <div className="mt-5 flex items-end justify-center gap-2">
          {radarPoints.map((value, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className="w-5 rounded-t bg-gradient-to-t from-cyber-cyan/10 to-cyber-cyan/70"
                style={{ height: `${Math.max(8, (value / maxRadar) * 72)}px` }}
              />
              <span className="font-mono text-[6px] text-white/20">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#060d16] p-5 ${ui.glow}`}
      >
        <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
          THREAT HEAT
        </p>
        <div className="relative mt-3 h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className={ui.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-semibold text-white/90">
              {report.riskScore}
            </p>
            <p className="font-mono text-[8px] tracking-[.12em] text-white/35">
              {ui.label.toUpperCase()}
            </p>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/40">
          SOC-Bewertung aus verifizierten Treffern
        </p>
      </div>
    </div>
  );
}
