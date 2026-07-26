"use client";

import type { HitSeverity } from "@/lib/analysis/hit-intel";

export const SEVERITY_RISK_FILTERS: Array<{
  id: "all" | HitSeverity;
  label: string;
}> = [
  { id: "all", label: "Alle" },
  { id: "critical", label: "Kritisch" },
  { id: "high", label: "Hoch" },
  { id: "medium", label: "Mittel" },
  { id: "low", label: "Niedrig" },
];

export type SeverityRiskFilterId = (typeof SEVERITY_RISK_FILTERS)[number]["id"];

export function SeverityRiskFilterBar({
  value,
  counts,
  onChange,
}: {
  value: SeverityRiskFilterId;
  counts: Record<SeverityRiskFilterId, number>;
  onChange: (next: SeverityRiskFilterId) => void;
}) {
  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
      <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
        FILTER · RISIKO
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEVERITY_RISK_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
              value === item.id
                ? "border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan"
                : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
            }`}
          >
            {item.label} ({counts[item.id] ?? 0})
          </button>
        ))}
      </div>
    </section>
  );
}

export function countSeverities(
  severities: Array<HitSeverity | undefined>
): Record<SeverityRiskFilterId, number> {
  const counts: Record<SeverityRiskFilterId, number> = {
    all: severities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const severity of severities) {
    const key = severity ?? "low";
    counts[key] += 1;
  }
  return counts;
}

export function matchesSeverityFilter(
  severity: HitSeverity | undefined,
  filter: SeverityRiskFilterId
): boolean {
  if (filter === "all") return true;
  return (severity ?? "low") === filter;
}
