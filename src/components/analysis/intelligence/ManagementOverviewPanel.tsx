"use client";

import type { IntelligenceReport } from "@/lib/analysis/types";

export default function ManagementOverviewPanel({
  report,
}: {
  report: IntelligenceReport;
}) {
  const overview = report.managementOverview;
  const items = [
    { label: "Google Treffer", value: report.executive.totalPublicHits },
    { label: "Webseiten", value: overview.websites },
    { label: "Erwähnungen", value: overview.mentions },
    { label: "Bilder", value: overview.images },
    { label: "Telefonnummern", value: overview.phones },
    { label: "E-Mail-Adressen", value: overview.emails },
    { label: "Social Media Profile", value: overview.social },
    { label: "Firmeneinträge", value: overview.companies },
    { label: "Dokumente", value: overview.documents },
  ];

  const riskTone =
    report.riskLevel === "high"
      ? "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]"
      : report.riskLevel === "medium"
        ? "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.06]"
        : "text-emerald-100/85 border-emerald-300/25 bg-emerald-300/[0.06]";

  const riskLabel =
    report.riskLevel === "high"
      ? "Hoch"
      : report.riskLevel === "medium"
        ? "Mittel"
        : "Niedrig";

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6">
      <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
        MANAGEMENT SUMMARY
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">
        Mit den von Ihnen angegebenen Daten konnten folgende öffentlich
        erreichbare Informationen gefunden werden.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
          >
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              {item.label.toUpperCase()}
            </p>
            <p className="mt-1 text-lg font-semibold text-white/80">
              {item.value}
            </p>
          </div>
        ))}
        <div className={`rounded-xl border px-3 py-3 ${riskTone}`}>
          <p className="font-mono text-[7px] tracking-[.1em] opacity-70">
            GESAMTRISIKO
          </p>
          <p className="mt-1 text-lg font-semibold">{riskLabel}</p>
        </div>
      </div>
    </section>
  );
}
