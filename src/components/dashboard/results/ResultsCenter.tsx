import Link from "next/link";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import ResultReportCard from "@/components/dashboard/results/ResultReportCard";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  analysisTierMeta,
  analysisTiers,
} from "@/lib/dashboard/analysis-center-data";
import {
  demoAnalysisResults,
  getResultsOverview,
} from "@/lib/dashboard/results-demo-data";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import type { AnalysisKey } from "@/lib/credits/pricing";

export default async function ResultsCenter() {
  const catalog = await getPublicPricingCatalog();
  const activeKeys = new Set(catalog.analyses.map((entry) => entry.key));

  // Prefer admin-active analyses; fall back to full demo catalogue for empty catalogs.
  const activeResults = demoAnalysisResults.filter((result) =>
    activeKeys.has(result.id)
  );
  const results =
    activeResults.length > 0 ? activeResults : demoAnalysisResults;

  // Keep admin sort order when available.
  const order = new Map(
    catalog.analyses.map((entry, index) => [
      entry.key,
      entry.sortOrder ?? index,
    ])
  );
  const sorted = [...results].sort((a, b) => {
    const ao = order.get(a.id) ?? 999;
    const bo = order.get(b.id) ?? 999;
    return ao - bo || a.title.localeCompare(b.title);
  });

  // Overlay admin labels when present.
  const labelByKey = new Map(
    catalog.analyses.map((entry) => [entry.key, entry.label])
  );
  const displayResults = sorted.map((result) => ({
    ...result,
    title: labelByKey.get(result.id) || result.title,
  }));

  const overview = getResultsOverview(displayResults);
  const premium = displayResults.filter((result) => result.tier === "premium");
  const byTier = analysisTiers
    .filter((tier) => tier !== "premium")
    .map((tier) => ({
      tier,
      meta: analysisTierMeta[tier],
      results: displayResults.filter((result) => result.tier === tier),
    }))
    .filter((group) => group.results.length > 0);

  const firstId = displayResults[0]?.id as AnalysisKey | undefined;

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Hier sehen Sie, wie fertige Analysen aussehen: Status, Risiko, aufklappbare Funde und klare Empfehlungen — erklärt für Einsteiger. Aktuell mit realistischen Beispielinhalten."
        helpLabel="Was ist das Ergebnis Center?"
        helpText="Nach einem echten Analyse-Lauf erscheinen hier Ihre Reports. Die Seite zeigt schon jetzt für jede Analyseart ein vollständiges Beispiel, damit Sie das Ergebnisformat kennenlernen."
      />

      <section className="glass-strong hardware-panel mb-8 rounded-[1.4rem] border border-cyber-cyan/20 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/55">
              SO LESEN SIE EIN ERGEBNIS
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-.02em] text-white/90">
              Jede Karte ist ein Analyse-Report. Tippen Sie auf die Karte und
              auf einzelne Funde, um Details und Erklärungen zu öffnen.
            </h2>
            <ol className="mt-4 grid gap-2 text-[12px] text-white/45 sm:grid-cols-3">
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  01
                </span>
                <p className="mt-1">Risiko-Score verstehen (0–100)</p>
              </li>
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  02
                </span>
                <p className="mt-1">Funde aufklappen · ⓘ lesen</p>
              </li>
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-[8px] text-cyber-cyan/50">
                  03
                </span>
                <p className="mt-1">Empfehlungen nach Priorität umsetzen</p>
              </li>
            </ol>
          </div>
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center justify-center rounded-lg border border-cyber-cyan/40 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_14px_35px_rgba(41,182,246,.22)] transition hover:brightness-110"
          >
            Zum Analyse Center
          </Link>
        </div>
      </section>

      <section
        aria-label="Ergebnis Übersicht"
        className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ["ANALYSEN", String(overview.analysesRun), "Beispiel-Reports"],
          ["FUNDE", String(overview.findingsTotal), "Aufklappbare Signale"],
          [
            "EMPFEHLUNGEN",
            String(overview.openRecommendations),
            "Konkrete nächste Schritte",
          ],
          ["STAND", "Demo", overview.lastUpdatedLabel],
        ].map(([label, value, detail]) => (
          <article
            key={label}
            className="glass hardware-panel rounded-[1.4rem] border border-white/[0.07] p-5"
          >
            <p className="flex items-center font-mono text-[8px] tracking-[.16em] text-white/22">
              {label}
              {label === "STAND" ? (
                <InfoTooltip label="Demo-Hinweis">
                  Die Inhalte sind bewusst realistisch, aber fiktiv. Sie zeigen
                  das Zielformat — noch keine Live-Recherchergebnisse.
                </InfoTooltip>
              ) : null}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-.03em] text-white/85">
              {value}
            </p>
            <p className="mt-2 text-[11px] text-white/30">{detail}</p>
          </article>
        ))}
      </section>

      {premium.length > 0 ? (
        <section
          id="results-tier-premium"
          aria-label="Premium Ergebnisse"
          className="mb-10 scroll-mt-24"
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                PREMIUM PAKETE
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/90">
                Gesamtberichte
              </h2>
            </div>
            <InfoTooltip label="Premium Ergebnisse">
              Pakete fassen mehrere Quellen zusammen. Öffnen Sie die Karte, um
              das Gesamtbild und die priorisierten Maßnahmen zu sehen.
            </InfoTooltip>
          </div>
          <div className="space-y-4">
            {premium.map((result, index) => (
              <ResultReportCard
                key={result.id}
                result={result}
                defaultOpen={result.id === firstId || index === 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {byTier.map(({ tier, meta, results: tierResults }) => (
        <section
          key={tier}
          id={`results-tier-${tier}`}
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
          <div className="space-y-4">
            {tierResults.map((result) => (
              <ResultReportCard
                key={result.id}
                result={result}
                defaultOpen={result.id === "google_search"}
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
            Beispielinhalte sind fiktiv, aber realistisch — so könnten
            Live-Funde später aussehen.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            ⓘ erklärt Fachbegriffe. Aufklappen zeigt Nachweise und Bedeutung.
          </p>
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            Aktive Analysen aus dem Admin-Katalog steuern, welche Reports hier
            gelistet werden.
          </p>
        </div>
      </section>
    </main>
  );
}
