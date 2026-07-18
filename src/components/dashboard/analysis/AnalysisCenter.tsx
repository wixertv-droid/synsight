import AnalysisTypeCard from "@/components/dashboard/analysis/AnalysisTypeCard";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { analysisModules } from "@/lib/dashboard/analysis-center-data";

export default function AnalysisCenter() {
  return (
    <main id="analysis-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Analyse"
        title="Analyse Center"
        description="Starten Sie gezielte Prüfungen Ihrer digitalen Identität. Die Karten bereiten die spätere Analyse-Pipeline vor — aktuell ohne Live-Anbindung."
        helpLabel="Was ist das Analyse Center?"
        helpText="Hier wählen Sie später einzelne Analyse-Module. Buttons öffnen vorerst Demo-Ergebnisse. Es werden keine Daten an externe Dienste gesendet."
      />

      <section
        aria-label="Analyse-Module"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {analysisModules.map((module) => (
          <AnalysisTypeCard key={module.id} module={module} />
        ))}
      </section>

      <section className="glass-strong hardware-panel mt-8 rounded-[1.4rem] border border-white/[0.08] p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
          ARCHITEKTUR / NÄCHSTE SCHRITTE
        </p>
        <ul className="mt-4 grid gap-3 text-[12px] text-white/40 md:grid-cols-3">
          <li className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Analyse-Jobs an echte Worker anbinden
          </li>
          <li className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            SynCredits-Abbuchung vor Start bestätigen
          </li>
          <li className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Ergebnisse in Ergebnis Center persistieren
          </li>
        </ul>
      </section>
    </main>
  );
}
