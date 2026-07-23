"use client";

import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";

export default function CategoryVisualPanel({
  title,
  hits,
  report,
}: {
  title: string;
  hits: IntelligenceHit[];
  report: IntelligenceReport;
}) {
  const riskCounts = {
    none: hits.filter((hit) => hit.risk === "none").length,
    watch: hits.filter((hit) => hit.risk === "watch").length,
    review: hits.filter((hit) => hit.risk === "review").length,
    action: hits.filter((hit) => hit.risk === "action").length,
  };
  const total = Math.max(1, hits.length);
  const maxBar = Math.max(
    riskCounts.none,
    riskCounts.watch,
    riskCounts.review,
    riskCounts.action,
    1
  );

  const ringPercent = Math.round(
    (hits.length / Math.max(1, report.hits.length)) * 100
  );

  return (
    <aside className="hardware-panel rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-4 lg:sticky lg:top-6 lg:self-start">
      <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/50">
        VISUAL · {title.toUpperCase()}
      </p>

      <div className="relative mx-auto mt-5 h-28 w-28">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#72e7ff ${ringPercent}%, rgba(255,255,255,0.08) 0)`,
          }}
        />
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[#070d16]">
          <div className="text-center">
            <p className="text-xl font-semibold text-white/85">{hits.length}</p>
            <p className="font-mono text-[7px] text-white/30">TREFFER</p>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {(
          [
            ["none", "Keine Auffälligkeit", riskCounts.none, "#6ee7b7"],
            ["watch", "Beobachten", riskCounts.watch, "#fcd34d"],
            ["review", "Empfohlen", riskCounts.review, "#fb923c"],
            ["action", "Sofort handeln", riskCounts.action, "#fb7185"],
          ] as const
        ).map(([key, label, count, color]) => (
          <li key={key}>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="text-white/45">{label}</span>
              <span className="font-mono text-white/35">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((count / maxBar) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-mono text-[8px] tracking-[.1em] text-white/25">
        ANTEIL AM REPORT · {Math.round((hits.length / total) * 100)} % DIESER
        KATEGORIE · {ringPercent} % GESAMT
      </p>
    </aside>
  );
}
