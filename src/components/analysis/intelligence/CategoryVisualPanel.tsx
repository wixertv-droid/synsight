"use client";

import { useMemo } from "react";
import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";

type CategorySlice = {
  id: string;
  title: string;
  hits: IntelligenceHit[];
};

const CODE_FRAGMENTS = [
  "SCAN::PUBLIC_INDEX",
  "NODE.LINK.verify()",
  "SIG.MATCH > 0.72",
  "TTL=ACTIVE",
  "OSINT.CHANNEL.OPEN",
];

function nodePositions(count: number): Array<{ x: number; y: number }> {
  const nodes = Math.min(8, Math.max(3, count || 3));
  return Array.from({ length: nodes }, (_, index) => {
    const angle = (Math.PI * 2 * index) / nodes - Math.PI / 2;
    const radius = 34 + (index % 2) * 8;
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
}

export default function CategoryVisualPanel({
  title,
  hits: rawHits,
  report,
  categories = [],
}: {
  title?: string;
  hits?: IntelligenceHit[];
  report: IntelligenceReport;
  categories?: CategorySlice[];
}) {
  const hits = useMemo(
    () => (Array.isArray(rawHits) ? rawHits : []),
    [rawHits]
  );
  const reportHits = Array.isArray(report.hits) ? report.hits : [];
  const liveHits = useMemo(
    () => reportHits.filter((hit) => hit.sourceType !== "identity_profile"),
    [reportHits]
  );

  const riskCounts = useMemo(() => {
    const source = hits.length > 0 ? hits : liveHits;
    return {
      none: source.filter((hit) => hit.risk === "none").length,
      watch: source.filter((hit) => hit.risk === "watch").length,
      review: source.filter((hit) => hit.risk === "review").length,
      action: source.filter((hit) => hit.risk === "action").length,
    };
  }, [hits, liveHits]);

  const nodes = useMemo(
    () => nodePositions(hits.length || liveHits.length || 4),
    [hits.length, liveHits.length]
  );

  const actionRatio = Math.round(
    (riskCounts.action / Math.max(1, hits.length || liveHits.length)) * 100
  );

  const categoryRows =
    categories.length > 0
      ? categories
      : [{ id: "all", title: title || "Treffer", hits }];

  return (
    <aside className="intel-cyber-hud hardware-panel relative overflow-hidden rounded-[1.2rem] border border-cyber-cyan/20 bg-[#050b14]/95 p-4">
      <div className="intel-cyber-earth" aria-hidden="true" />
      <div className="intel-cyber-hex" aria-hidden="true" />
      <div className="intel-cyber-scanlines" aria-hidden="true" />

      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/70">
            SOC HUD · LIVE GRAPH
          </p>
          <span className="rounded border border-emerald-300/25 px-1.5 py-0.5 font-mono text-[7px] tracking-[.12em] text-emerald-100/70">
            ONLINE
          </span>
        </div>

        <div className="relative mx-auto mt-4 h-44 w-full max-w-[220px]">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="intelCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(114,231,255,0.35)" />
                <stop offset="55%" stopColor="rgba(41,182,246,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            <circle
              cx="50"
              cy="50"
              r="46"
              fill="url(#intelCoreGlow)"
              className="intel-cyber-pulse"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(114,231,255,0.18)"
              strokeWidth="0.4"
              strokeDasharray="1.2 1.8"
              className="intel-cyber-orbit"
            />
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="rgba(114,231,255,0.28)"
              strokeWidth="0.5"
            />
            <circle
              cx="50"
              cy="50"
              r="18"
              fill="none"
              stroke="rgba(114,231,255,0.45)"
              strokeWidth="0.6"
              className="intel-cyber-pulse"
            />

            {nodes.map((node, index) => {
              const next = nodes[(index + 1) % nodes.length];
              return (
                <g key={`link-${index}`}>
                  <line
                    x1={50}
                    y1={50}
                    x2={node.x}
                    y2={node.y}
                    stroke="rgba(114,231,255,0.22)"
                    strokeWidth="0.35"
                  />
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="rgba(114,231,255,0.12)"
                    strokeWidth="0.3"
                    strokeDasharray="0.8 1.2"
                  />
                </g>
              );
            })}

            {nodes.map((node, index) => (
              <g key={`node-${index}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="1.8"
                  fill="#72e7ff"
                  className="intel-cyber-node"
                  style={{ animationDelay: `${index * 0.18}s` }}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="3.2"
                  fill="none"
                  stroke="rgba(114,231,255,0.35)"
                  strokeWidth="0.35"
                  className="intel-cyber-pulse"
                  style={{ animationDelay: `${index * 0.18}s` }}
                />
              </g>
            ))}

            <circle cx="50" cy="50" r="2.4" fill="#70E7FF" />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold tracking-tight text-white/90">
              {hits.length || liveHits.length}
            </p>
            <p className="font-mono text-[7px] tracking-[.14em] text-cyber-cyan/55">
              SIGNAL NODES
            </p>
          </div>

          <div className="pointer-events-none absolute left-1 top-2 font-mono text-[6px] text-cyber-cyan/40">
            LAT {actionRatio}%
          </div>
          <div className="pointer-events-none absolute bottom-2 right-1 font-mono text-[6px] text-white/25">
            GRID // SECURE
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {(
            [
              ["action", "Kritisch", riskCounts.action, "#fb7185"],
              ["review", "Prüfen", riskCounts.review, "#fb923c"],
              ["watch", "Beobachten", riskCounts.watch, "#fcd34d"],
              ["none", "Neutral", riskCounts.none, "#6ee7b7"],
            ] as const
          ).map(([key, label, count, color]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-2 rounded border border-white/[0.05] bg-black/25 px-2 py-1.5"
            >
              <span className="flex items-center gap-2 font-mono text-[9px] text-white/45">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
                {label}
              </span>
              <span className="font-mono text-[10px] text-white/70">
                {count}
              </span>
            </li>
          ))}
        </ul>

        {categoryRows.length > 0 ? (
          <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
            <p className="font-mono text-[7px] tracking-[.14em] text-white/30">
              KANÄLE
            </p>
            {categoryRows.slice(0, 6).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 font-mono text-[9px]"
              >
                <span className="truncate text-white/40">
                  {row.title.toUpperCase()}
                </span>
                <span className="text-cyber-cyan/70">{row.hits.length}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 space-y-0.5 overflow-hidden border-t border-white/[0.06] pt-2">
          {CODE_FRAGMENTS.map((line, index) => (
            <p
              key={line}
              className="intel-cyber-code font-mono text-[7px] tracking-[.04em] text-emerald-100/35"
              style={{ animationDelay: `${index * 0.35}s` }}
            >
              {`> ${line}`}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
