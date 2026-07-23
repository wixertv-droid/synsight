"use client";

import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";

export default function CategoryVisualPanel({
  title,
  hits: rawHits,
  report,
}: {
  title: string;
  hits: IntelligenceHit[];
  report: IntelligenceReport;
}) {
  const hits = Array.isArray(rawHits) ? rawHits : [];
  const riskCounts = {
    none: hits.filter((hit) => hit.risk === "none").length,
    watch: hits.filter((hit) => hit.risk === "watch").length,
    review: hits.filter((hit) => hit.risk === "review").length,
    action: hits.filter((hit) => hit.risk === "action").length,
  };
  const maxBar = Math.max(
    riskCounts.none,
    riskCounts.watch,
    riskCounts.review,
    riskCounts.action,
    1
  );

  const reportHits = Array.isArray(report.hits) ? report.hits : [];
  const ringPercent = Math.round(
    (hits.length / Math.max(1, reportHits.length)) * 100
  );

  return (
    <aside className="hardware-panel h-fit rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-4">
      <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/50">
        VISUAL · {title.toUpperCase()}
      </p>

      <div className="relative mx-auto mt-4 h-24 w-24">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#72e7ff ${ringPercent}%, rgba(255,255,255,0.08) 0)`,
          }}
        />
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[#070d16]">
          <div className="text-center">
            <p className="text-lg font-semibold text-white/85">{hits.length}</p>
            <p className="font-mono text-[7px] text-white/30">TREFFER</p>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
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

      <p className="mt-3 font-mono text-[8px] tracking-[.1em] text-white/25">
        ANTEIL · {ringPercent} % GESAMT
      </p>
    </aside>
  );
}
