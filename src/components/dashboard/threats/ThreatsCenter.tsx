import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import {
  demoThreats,
  threatLevelMeta,
} from "@/lib/dashboard/threats-demo-data";
import type { RiskLevel } from "@/types/platform";

const levelTone: Record<
  RiskLevel,
  {
    tone: "online" | "warning" | "danger";
    panel: string;
  }
> = {
  low: {
    tone: "online",
    panel: "border-emerald-300/12 bg-emerald-300/[0.03]",
  },
  medium: {
    tone: "warning",
    panel: "border-amber-300/12 bg-amber-300/[0.03]",
  },
  high: {
    tone: "danger",
    panel: "border-rose-300/12 bg-rose-300/[0.03]",
  },
};

const levels: RiskLevel[] = ["low", "medium", "high"];

export default function ThreatsCenter() {
  const counts = levels.map((level) => ({
    level,
    count: demoThreats.filter((threat) => threat.level === level).length,
  }));

  return (
    <main id="threats-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Schutz"
        title="Bedrohungen & Schutzmaßnahmen"
        description="Priorisierte Risiken mit klarer Erklärung und konkreten Handlungsschritten — Demo-Inhalt zur Architekturvorbereitung."
        helpLabel="Was sind Bedrohungen?"
        helpText="Jede Karte beschreibt einen Fund, warum er relevant ist und was Sie tun können. Später gespeist aus echten Analyse-Ergebnissen."
      />

      <section
        aria-label="Risiko-Level Übersicht"
        className="grid gap-4 md:grid-cols-3"
      >
        {counts.map(({ level, count }) => {
          const meta = threatLevelMeta[level];
          const style = levelTone[level];
          return (
            <article
              key={level}
              className={`glass hardware-panel rounded-[1.4rem] border p-5 ${style.panel}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[9px] tracking-[.16em]">
                  <StatusDot tone={style.tone} />
                  {meta.short}
                </span>
                <InfoTooltip label={`Level ${meta.label}`}>
                  {meta.description}
                </InfoTooltip>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-.03em] text-white/85">
                {meta.label}
              </h2>
              <p className="mt-2 text-xs text-white/35">
                {count} Bedrohung{count === 1 ? "" : "en"} (Demo)
              </p>
            </article>
          );
        })}
      </section>

      <section aria-label="Bedrohungsliste" className="mt-8 space-y-4">
        {demoThreats.map((threat) => {
          const meta = threatLevelMeta[threat.level];
          const style = levelTone[threat.level];
          return (
            <article
              key={threat.id}
              className="glass-strong hardware-panel overflow-hidden rounded-[1.4rem] border border-white/[0.08] transition duration-300 hover:border-cyber-blue/20"
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-white/25">
                    <StatusDot tone={style.tone} />
                    {meta.label.toUpperCase()} · {threat.source}
                  </p>
                  <h3 className="mt-2 text-lg font-medium text-white/88">
                    {threat.title}
                  </h3>
                </div>
                <span
                  className={`inline-flex rounded-lg border px-3 py-1.5 font-mono text-[8px] tracking-[.14em] ${style.panel}`}
                >
                  LEVEL / {meta.short}
                </span>
              </div>

              <div className="grid gap-px bg-white/[0.05] md:grid-cols-3">
                <div className="bg-[#050a13]/95 p-5">
                  <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
                    WAS WURDE GEFUNDEN?
                    <InfoTooltip label="Fund erklären">
                      Später der Roh- oder aggregierte Treffer aus der Analyse.
                    </InfoTooltip>
                  </p>
                  <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                    {threat.found}
                  </p>
                </div>
                <div className="bg-[#050a13]/95 p-5">
                  <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-amber-100/45">
                    WARUM IST ES WICHTIG?
                    <InfoTooltip label="Risiko erklären">
                      Kontext für unerfahrene Nutzer — warum Handlungsbedarf
                      besteht.
                    </InfoTooltip>
                  </p>
                  <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                    {threat.whyItMatters}
                  </p>
                </div>
                <div className="bg-[#050a13]/95 p-5">
                  <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-emerald-100/45">
                    WAS KÖNNEN SIE TUN?
                    <InfoTooltip label="Maßnahmen erklären">
                      Konkrete Schutzmaßnahmen, die der Nutzer selbst umsetzen
                      kann.
                    </InfoTooltip>
                  </p>
                  <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                    {threat.userAction}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
