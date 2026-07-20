"use client";

import ExecutiveSummaryPanel from "@/components/analysis/intelligence/ExecutiveSummaryPanel";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import RiskOverviewPanel from "@/components/analysis/intelligence/RiskOverviewPanel";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { IntelligenceReport } from "@/lib/analysis/types";

export default function GoogleIntelligenceReport({
  report,
  revealSections = true,
}: {
  report: IntelligenceReport;
  revealSections?: boolean;
}) {
  const serpHits = report.hits.filter(
    (hit) => hit.sourceType === "google_custom_search"
  );
  const profileHits = report.hits.filter(
    (hit) => hit.sourceType === "identity_profile"
  );

  return (
    <div className="space-y-6">
      <SectionReveal delayMs={0} enabled={revealSections}>
        <header className="rounded-2xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-5 md:p-6">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            GOOGLE INTELLIGENCE REPORT
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/92 md:text-3xl">
            Was Google öffentlich über {report.subjectName} anzeigt
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">
            {report.summaryText}
          </p>
          <p className="mt-3 text-[12px] text-white/35">
            Es wurden{" "}
            <span className="font-medium text-white/70">
              {report.buckets.total}
            </span>{" "}
            öffentliche Suchtreffer ausgewertet (API-verifiziert). Davon:{" "}
            <span className="text-cyber-cyan/80">
              {report.buckets.relevant} relevant
            </span>
            , {report.buckets.neutral} neutral, {report.buckets.low} geringe
            Relevanz, {report.buckets.stale} veraltet.
          </p>
          {!report.apiConfigured ? (
            <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-[11px] text-amber-50/65">
              Live-Google-Treffer erfordern die Google Custom Search API auf dem
              Server. Profil-Suchanfragen und Verknüpfungen werden trotzdem
              angezeigt.
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
            Erstellt: {report.generatedAtLabel}
            <span className="text-white/15">·</span>
            Profil {report.profileCompleteness} %
            <InfoTooltip label="Datenquelle">
              {`${report.dataSourceLabel}. Abgerufen am entspricht dem Analysezeitpunkt — Google liefert kein Index-Datum über die API.`}
            </InfoTooltip>
          </p>
        </header>
      </SectionReveal>

      <SectionReveal delayMs={450} enabled={revealSections}>
        <RiskOverviewPanel report={report} />
      </SectionReveal>

      <SectionReveal delayMs={900} enabled={revealSections}>
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
              AUSGEFÜHRTE SUCHANFRAGEN
            </h3>
            <InfoTooltip label="Suchanfragen">
              Jede Anfrage wird aus Ihren Profilfeldern gebildet und an die
              Google Custom Search API übergeben (wenn konfiguriert).
            </InfoTooltip>
          </div>
          <ul className="space-y-2">
            {report.queries.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/40">
                Keine Suchanfragen möglich — bitte Identitätsprofil
                vervollständigen.
              </li>
            ) : (
              report.queries.map((query) => (
                <li
                  key={query.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                      {query.label.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-[12px] text-white/70">
                    {query.query}
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">{query.help}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </SectionReveal>

      <SectionReveal delayMs={1350} enabled={revealSections}>
        <section>
          <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
            GOOGLE-TREFFER (API-VERIFIZIERT)
          </h3>
          {serpHits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/40">
              {report.apiConfigured
                ? "Keine Treffer von der Google Custom Search API für Ihre Profil-Suchanfragen."
                : "Keine API-Treffer — Google Custom Search ist nicht konfiguriert."}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {serpHits.map((hit) => (
                <li key={hit.id}>
                  <IntelligenceHitCard hit={hit} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </SectionReveal>

      {profileHits.length > 0 ? (
        <SectionReveal delayMs={1800} enabled={revealSections}>
          <section>
            <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
              PROFIL-VERKNÜPFUNGEN (KEINE GOOGLE-TREFFER)
            </h3>
            <ul className="space-y-2.5">
              {profileHits.map((hit) => (
                <li key={hit.id}>
                  <IntelligenceHitCard hit={hit} />
                </li>
              ))}
            </ul>
          </section>
        </SectionReveal>
      ) : null}

      <SectionReveal delayMs={2250} enabled={revealSections}>
        <section>
          <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
            HANDLUNGSEMPFEHLUNGEN
          </h3>
          <ol className="space-y-2">
            {report.recommendations.map((item, index) => (
              <li
                key={item.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-white/75">
                    <span className="mr-2 font-mono text-[8px] text-cyber-cyan/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.title}
                  </p>
                  <span className="font-mono text-[7px] tracking-[.12em] text-white/30">
                    {item.priority.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/38">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </SectionReveal>

      <SectionReveal delayMs={2700} enabled={revealSections}>
        <ExecutiveSummaryPanel report={report} />
      </SectionReveal>
    </div>
  );
}
