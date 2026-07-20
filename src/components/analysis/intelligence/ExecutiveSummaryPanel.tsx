"use client";

import type { IntelligenceReport } from "@/lib/analysis/types";

export default function ExecutiveSummaryPanel({
  report,
}: {
  report: IntelligenceReport;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6">
      <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
        EXECUTIVE SUMMARY
      </p>
      <h3 className="mt-2 text-lg font-medium text-white/90">
        Gesamteinschätzung — {report.subjectName}
      </h3>
      <p className="mt-2 text-[12px] leading-relaxed text-white/45">
        {report.executive.narrative}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Öffentliche Treffer",
            value: String(report.executive.totalPublicHits),
          },
          {
            label: "Kritische Treffer",
            value: String(report.executive.criticalHits),
          },
          {
            label: "Gesamtrisiko",
            value: report.executive.overallRisk.toUpperCase(),
          },
          {
            label: "Priorität",
            value: report.executive.priority,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
          >
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              {item.label.toUpperCase()}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {report.executive.recommendedActions.length > 0 ? (
        <div className="mt-5">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            EMPFOHLENE MASSNAHMEN
          </p>
          <ol className="mt-3 space-y-2">
            {report.executive.recommendedActions.map((action) => (
              <li
                key={action}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/55"
              >
                {action}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="mt-5 font-mono text-[8px] tracking-[.12em] text-white/20">
        DATENQUELLE · {report.dataSourceLabel}
      </p>
    </section>
  );
}
