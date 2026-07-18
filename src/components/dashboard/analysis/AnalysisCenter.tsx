import AnalysisTypeCard from "@/components/dashboard/analysis/AnalysisTypeCard";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  analysisModules,
  analysisTierMeta,
  analysisTiers,
  defaultCreditsFor,
} from "@/lib/dashboard/analysis-center-data";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import Link from "next/link";

export default async function AnalysisCenter() {
  const catalog = await getPublicPricingCatalog();
  const creditMap = new Map(
    catalog.analyses.map((entry) => [entry.key, entry.credits])
  );

  const premium = analysisModules.filter((module) => module.tier === "premium");
  const byTier = analysisTiers.map((tier) => ({
    tier,
    meta: analysisTierMeta[tier],
    modules: analysisModules.filter((module) => module.tier === tier),
  }));

  return (
    <main id="analysis-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Analyse"
        title="Analyse Center"
        description="Wählen Sie gezielt, was geprüft werden soll — von schnellen Einzelchecks bis zum kompletten Identitäts-Paket. Alle Texte sind für Einsteiger geschrieben."
        helpLabel="Wie funktioniert das Analyse Center?"
        helpText="Jede Karte ist eine eigene Prüfung. Sie sehen vorher Preis, Dauer und was Sie erhalten. Aktuell öffnen die Buttons Demo-Ergebnisse — die echte Pipeline folgt im nächsten Schritt."
      />

      <section className="glass-strong hardware-panel mb-8 rounded-[1.4rem] border border-cyber-cyan/20 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/55">
              NEU HIER? SO STARTEN SIE
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-.02em] text-white/90">
              Unsicher, welche Analyse passt? Beginnen Sie mit dem Komplettpaket
              oder einem günstigen Einstiegs-Check.
            </h2>
            <ol className="mt-4 grid gap-2 text-[12px] text-white/45 sm:grid-cols-3">
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  01
                </span>
                <p className="mt-1">Profilangaben ergänzen (freiwillig)</p>
              </li>
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  02
                </span>
                <p className="mt-1">Analyse wählen & Preis prüfen</p>
              </li>
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  03
                </span>
                <p className="mt-1">Ergebnis verstehen & Maßnahmen umsetzen</p>
              </li>
            </ol>
          </div>
          <Link
            href="#tier-premium"
            className="inline-flex items-center justify-center rounded-lg border border-cyber-cyan/40 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_14px_35px_rgba(41,182,246,.22)] transition hover:brightness-110"
          >
            Zum Komplettpaket
          </Link>
        </div>
      </section>

      <section
        id="tier-premium"
        aria-label="Premium Angebote"
        className="mb-10 scroll-mt-24"
      >
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
              BESTER WERT
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/90">
              Empfohlene Pakete
            </h2>
          </div>
          <InfoTooltip label="Warum Pakete?">
            Pakete bündeln mehrere Prüfungen. Sie sparen Entscheidungen und
            erhalten ein Gesamtbild statt vieler Einzelteile.
          </InfoTooltip>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {premium.map((module) => (
            <AnalysisTypeCard
              key={module.id}
              module={module}
              featured
              credits={creditMap.get(module.id) ?? defaultCreditsFor(module.id)}
            />
          ))}
        </div>
      </section>

      {byTier
        .filter(({ tier }) => tier !== "premium")
        .map(({ tier, meta, modules }) => (
          <section
            key={tier}
            id={`tier-${tier}`}
            aria-label={meta.label}
            className="mb-10 scroll-mt-24"
          >
            <div className="mb-4 max-w-3xl">
              <p className="font-mono text-[9px] tracking-[.16em] text-white/28">
                {meta.label.toUpperCase()}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.02em] text-white/88">
                {meta.headline}
              </h2>
              <p className="mt-2 text-sm text-white/35">{meta.blurb}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <AnalysisTypeCard
                  key={module.id}
                  module={module}
                  credits={
                    creditMap.get(module.id) ?? defaultCreditsFor(module.id)
                  }
                />
              ))}
            </div>
          </section>
        ))}

      <section className="glass hardware-panel rounded-[1.4rem] border border-white/[0.08] p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
          TRANSPARENZ
        </p>
        <div className="mt-4 grid gap-3 text-[12px] text-white/40 md:grid-cols-3">
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Preise in SynCredits — vor dem Start sichtbar. Keine versteckten
            Zusatzkosten in der UI.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Beschreibungen sind bewusst einfach gehalten. ⓘ erklärt Fachbegriffe
            bei Bedarf.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Nächster Schritt: echte Job-Pipeline & Abbuchungsbestätigung —
            aktuell Demo-Ergebnisse.
          </p>
        </div>
      </section>
    </main>
  );
}
