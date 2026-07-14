import type { Metadata } from "next";
import AnalysisWidget from "@/components/dashboard/AnalysisWidget";
import RecommendationsPanel from "@/components/dashboard/RecommendationsPanel";
import RiskCard from "@/components/dashboard/RiskCard";
import SecurityPanel from "@/components/dashboard/SecurityPanel";
import StatusCard from "@/components/dashboard/StatusCard";
import { dashboardMetrics, riskSignals } from "@/lib/platform-data";

export const metadata: Metadata = {
  title: "Dashboard — SynSight Command Center",
  description: "Ihre persönliche SynSight Sicherheitszentrale.",
};

export default function DashboardPage() {
  return (
    <main id="synsight-dashboard" className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="hud-label">Command Center / Übersicht</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
            Guten Tag, Alex.
          </h1>
          <p className="mt-2 text-sm text-white/32">
            Ihre digitale Sicherheitslage auf einen Blick.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[8px] tracking-[.13em] text-white/22">
          <span>DIENSTAG / 14 JUL 2026</span>
          <span className="h-3 w-px bg-white/[0.07]" />
          <span>12:16 UTC</span>
        </div>
      </div>

      <SecurityPanel />

      <section
        id="digital-traces"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Sicherheitskennzahlen"
      >
        {dashboardMetrics.map((metric, index) => (
          <StatusCard key={metric.label} metric={metric} index={index} />
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <AnalysisWidget />

        <div className="space-y-6">
          <section
            id="risk-analysis"
            className="glass hardware-panel rounded-[1.4rem] p-5 md:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
                  RISIKOANALYSE
                </p>
                <p className="mt-2 text-xs text-white/28">
                  Nach Priorität geordnet
                </p>
              </div>
              <span className="rounded border border-rose-300/10 bg-rose-300/[0.02] px-2 py-1 font-mono text-[7px] tracking-[.1em] text-rose-100/55">
                3 SIGNALE
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {riskSignals.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </section>

          <RecommendationsPanel />
        </div>
      </div>

      <section
        id="monitoring"
        className="mt-6 grid gap-px overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
      >
        {[
          ["MONITORING", "Aktiv", "Neue Signale werden kontinuierlich bewertet."],
          ["BERICHTE", "1 verfügbar", "Ihr monatlicher Schutzbericht ist bereit."],
          ["NÄCHSTER SCAN", "In 06:42 h", "Automatischer Analysezyklus geplant."],
        ].map(([label, value, detail]) => (
          <article key={label} className="bg-[#050a13]/95 p-5 md:p-6">
            <p className="font-mono text-[8px] tracking-[.16em] text-white/22">
              {label}
            </p>
            <p className="mt-3 text-lg font-medium text-white/75">{value}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/25">
              {detail}
            </p>
          </article>
        ))}
      </section>
      <span id="reports" className="block scroll-mt-24" />
    </main>
  );
}
