import AnalysisTypeCard from "@/components/dashboard/analysis/AnalysisTypeCard";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  analysisTierMeta,
  analysisTiers,
} from "@/lib/dashboard/analysis-center-data";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import Link from "next/link";

export default async function AnalysisCenter() {
  const catalog = await getPublicPricingCatalog();
  const modules = resolveActiveAnalyses(catalog.analyses);

  const premium = modules.filter((module) => module.tier === "premium");
  const byTier = analysisTiers
    .filter((tier) => tier !== "premium")
    .map((tier) => ({
      tier,
      meta: analysisTierMeta[tier],
      modules: modules.filter((module) => module.tier === tier),
    }))
    .filter((group) => group.modules.length > 0);

  return (
    <main id="analysis-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Analyse"
        title="Analyse Center"
        description="Wählen Sie gezielt, was geprüft werden soll. Angezeigt werden nur Analysen, die in der Administration aktiv sind — inkl. aktueller Preise und Bezeichnungen."
        helpLabel="Wie funktioniert das Analyse Center?"
        helpText="Jede Karte entspricht einem aktiven Eintrag in der Admin-Preisverwaltung. Wird eine Analyse dort deaktiviert, verschwindet sie hier und in der Dashboard-Preisliste."
      />

      {modules.length === 0 ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-amber-300/20 p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-amber-100/55">
            KEINE AKTIVEN ANALYSEN
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/85">
            Derzeit sind keine Analysen freigeschaltet.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/40">
            Sobald ein Administrator Analysen in der Preisverwaltung aktiviert,
            erscheinen sie hier automatisch mit Preis und Beschreibung.
          </p>
        </section>
      ) : (
        <>
          <section className="glass-strong hardware-panel mb-8 rounded-[1.4rem] border border-cyber-cyan/20 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/55">
                  NEU HIER? SO STARTEN SIE
                </p>
                <h2 className="mt-3 text-xl font-medium tracking-[-.02em] text-white/90">
                  Unsicher, welche Analyse passt? Beginnen Sie mit einem
                  Komplettpaket oder einem günstigen Einstiegs-Check.
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
                    <p className="mt-1">
                      Ergebnis verstehen & Maßnahmen umsetzen
                    </p>
                  </li>
                </ol>
              </div>
              {premium.length > 0 ? (
                <Link
                  href="#tier-premium"
                  className="inline-flex items-center justify-center rounded-lg border border-cyber-cyan/40 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_14px_35px_rgba(41,182,246,.22)] transition hover:brightness-110"
                >
                  Zu den Paketen
                </Link>
              ) : null}
            </div>
          </section>

          {premium.length > 0 ? (
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
                  Pakete bündeln mehrere Prüfungen. Sie sparen Entscheidungen
                  und erhalten ein Gesamtbild statt vieler Einzelteile.
                </InfoTooltip>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {premium.map((module) => (
                  <AnalysisTypeCard
                    key={module.id}
                    module={module}
                    featured
                    credits={module.credits}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {byTier.map(({ tier, meta, modules: tierModules }) => (
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
                {tierModules.map((module) => (
                  <AnalysisTypeCard
                    key={module.id}
                    module={module}
                    credits={module.credits}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <section className="glass hardware-panel rounded-[1.4rem] border border-white/[0.08] p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
          SYNC MIT ADMIN
        </p>
        <div className="mt-4 grid gap-3 text-[12px] text-white/40 md:grid-cols-3">
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Name, Beschreibung und SynCredits kommen aus der Preisverwaltung.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            „Aktiv“ aus = Analyse verschwindet im Analyse Center und in der
            Dashboard-Preisliste.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Neue Analysen im Admin erscheinen hier automatisch, sobald sie aktiv
            sind.
          </p>
        </div>
      </section>
    </main>
  );
}
