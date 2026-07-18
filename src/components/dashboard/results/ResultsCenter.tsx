import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import {
  demoAnalysisResults,
  resultsOverview,
} from "@/lib/dashboard/results-demo-data";
import type { RiskLevel } from "@/types/platform";

const riskStyles: Record<
  RiskLevel,
  { badge: string; bar: string; tone: "online" | "warning" | "danger" }
> = {
  low: {
    badge: "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-100/70",
    bar: "from-emerald-400 to-cyber-cyan",
    tone: "online",
  },
  medium: {
    badge: "border-amber-300/15 bg-amber-300/[0.04] text-amber-100/70",
    bar: "from-amber-300 to-orange-400",
    tone: "warning",
  },
  high: {
    badge: "border-rose-300/15 bg-rose-300/[0.04] text-rose-100/70",
    bar: "from-rose-400 to-amber-300",
    tone: "danger",
  },
};

const statusLabel: Record<string, string> = {
  completed: "Abgeschlossen",
  partial: "Teilweise",
  queued: "In Warteschlange",
};

export default function ResultsCenter() {
  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Professionelle Übersicht Ihrer Analyse-Ausgaben — derzeit mit Demo-Daten zur UI- und Architekturvorbereitung."
        helpLabel="Was zeigt das Ergebnis Center?"
        helpText="Hier erscheinen später echte Analyse-Reports. Status, Funde, Risiko und Empfehlungen sind bereits als Struktur vorbereitet."
      />

      <section
        aria-label="Analyse Status Übersicht"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ["ANALYSEN", String(resultsOverview.analysesRun), "Demo-Läufe"],
          ["FUNDE", String(resultsOverview.findingsTotal), "Gefundene Signale"],
          [
            "EMPFEHLUNGEN",
            String(resultsOverview.openRecommendations),
            "Offene Maßnahmen",
          ],
          ["STAND", "Demo", resultsOverview.lastUpdatedLabel],
        ].map(([label, value, detail]) => (
          <article
            key={label}
            className="glass hardware-panel rounded-[1.4rem] border border-white/[0.07] p-5"
          >
            <p className="font-mono text-[8px] tracking-[.16em] text-white/22">
              {label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-.03em] text-white/85">
              {value}
            </p>
            <p className="mt-2 text-[11px] text-white/30">{detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-8 space-y-6">
        {demoAnalysisResults.map((result) => {
          const risk = riskStyles[result.riskLevel];
          return (
            <section
              key={result.id}
              id={result.id}
              className="glass-strong hardware-panel scroll-mt-24 overflow-hidden rounded-[1.4rem] border border-white/[0.08]"
            >
              <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                <div>
                  <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
                    ANALYSE STATUS
                  </p>
                  <h2 className="mt-2 flex flex-wrap items-center text-xl font-medium text-white/88">
                    {result.title}
                    <InfoTooltip label={`Status ${result.title}`}>
                      {result.summary}
                    </InfoTooltip>
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
                    <StatusDot
                      tone={risk.tone}
                      pulse={result.status !== "completed"}
                    />
                    {statusLabel[result.status]} · {result.statusLabel}
                  </p>
                </div>
                <div
                  className={`rounded-xl border px-4 py-3 text-right ${risk.badge}`}
                >
                  <p className="font-mono text-[8px] tracking-[.14em]">
                    RISIKO BEWERTUNG
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {result.riskScore}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
                    {result.riskLevel}
                  </p>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[1.2fr_.8fr]">
                <div className="bg-[#050a13]/95 p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      GEFUNDENE INFORMATIONEN
                    </h3>
                    <InfoTooltip label="Funde erklären">
                      Jeder Eintrag steht für ein späteres Report-Item aus der
                      Analyse-Pipeline.
                    </InfoTooltip>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {result.findings.map((finding) => (
                      <li
                        key={finding.id}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-cyber-blue/20"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white/78">
                            {finding.label}
                          </p>
                          <span className="font-mono text-[7px] tracking-[.12em] text-white/25">
                            {finding.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
                          {finding.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-6 bg-[#050a13]/95 p-5 md:p-6">
                  <div>
                    <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      RISIKO SKALA
                    </h3>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${risk.bar}`}
                        style={{ width: `${result.riskScore}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-white/32">
                      {result.summary}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                        EMPFEHLUNGEN
                      </h3>
                      <InfoTooltip label="Empfehlungen">
                        Maßnahmen, die der Nutzer manuell umsetzen kann — später
                        an Tickets oder Guided Actions koppelbar.
                      </InfoTooltip>
                    </div>
                    <ol className="mt-4 space-y-3">
                      {result.recommendations.map((item, index) => (
                        <li
                          key={item}
                          className="flex gap-3 text-[12px] leading-relaxed text-white/45"
                        >
                          <span className="font-mono text-[8px] text-cyber-cyan/45">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
