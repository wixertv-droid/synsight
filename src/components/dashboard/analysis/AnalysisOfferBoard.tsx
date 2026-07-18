import Link from "next/link";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  analysisModules,
  defaultCreditsFor,
} from "@/lib/dashboard/analysis-center-data";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

/** Lucrative, scannable analysis catalog for the main dashboard. */
export default async function AnalysisOfferBoard() {
  const catalog = await getPublicPricingCatalog();
  const creditMap = new Map(
    catalog.analyses.map((entry) => [entry.key, entry.credits])
  );

  const featured = analysisModules.filter((module) =>
    ["full_identity_analysis", "deep_intelligence", "person_search"].includes(
      module.id
    )
  );
  const entry = analysisModules.filter((module) => module.tier === "quick");

  return (
    <section
      id="analysis-offers"
      aria-label="Analyseangebote mit Preisen"
      className="mt-6 overflow-hidden rounded-[1.4rem] border border-cyber-cyan/20 bg-[radial-gradient(circle_at_0%_0%,rgba(0,212,255,.1),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(41,182,246,.08),transparent_40%)]"
    >
      <div className="border-b border-white/[0.07] px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/55">
              ANALYSEANGEBOTE
            </p>
            <h2 className="mt-2 flex flex-wrap items-center text-2xl font-semibold tracking-[-.03em] text-white/90">
              Was möchten Sie prüfen?
              <InfoTooltip label="Analyseangebote erklären">
                Jede Analyse hat einen klaren Preis in SynCredits. Pakete geben
                Ihnen mehr Überblick — Einzelchecks eignen sich für den
                Einstieg.
              </InfoTooltip>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/38">
              Klare Preise. Verständliche Leistungen. Starten Sie mit einem
              Komplettpaket oder einem günstigen Einzelcheck.
            </p>
          </div>
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center justify-center rounded-lg border border-cyber-cyan/40 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_12px_30px_rgba(41,182,246,.2)] transition hover:brightness-110"
          >
            Alle 13 Analysen öffnen
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[1.35fr_.65fr]">
        <div className="bg-[#050a13]/95 p-5 md:p-6">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
            EMPFOHLEN FÜR DEN EINSTIEG
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {featured.map((module) => {
              const credits =
                creditMap.get(module.id) ?? defaultCreditsFor(module.id);
              return (
                <Link
                  key={module.id}
                  href={`/dashboard/analysis#tier-${module.tier === "premium" ? "premium" : "advanced"}`}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-cyber-cyan/35 hover:bg-cyber-cyan/[0.04]"
                >
                  {module.badge ? (
                    <span className="font-mono text-[7px] tracking-[.12em] text-cyber-cyan/60">
                      {module.badge.toUpperCase()}
                    </span>
                  ) : null}
                  <h3 className="mt-2 text-sm font-medium text-white/85 group-hover:text-white">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                    {module.tagline}
                  </p>
                  <p className="mt-4 text-lg font-semibold text-cyber-cyan">
                    {credits}
                    <span className="ml-1 text-[10px] font-medium text-cyber-cyan/55">
                      SynCredits
                    </span>
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-[#050a13]/95 p-5 md:p-6">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
            SCHNELLE CHECKS AB
          </p>
          <ul className="mt-4 space-y-2">
            {entry.map((module) => {
              const credits =
                creditMap.get(module.id) ?? defaultCreditsFor(module.id);
              return (
                <li key={module.id}>
                  <Link
                    href="/dashboard/analysis#tier-quick"
                    className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <span className="text-[12px] text-white/55">
                      {module.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-cyber-cyan/75">
                      {credits} Cr
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-white/28">
            Alle Preise sind SynCredits. Vor dem Start sehen Sie immer den
            genauen Betrag.
          </p>
        </div>
      </div>
    </section>
  );
}
