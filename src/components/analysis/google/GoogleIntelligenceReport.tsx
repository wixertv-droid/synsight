"use client";

import ExecutiveSummaryPanel from "@/components/analysis/intelligence/ExecutiveSummaryPanel";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import ManagementOverviewPanel from "@/components/analysis/intelligence/ManagementOverviewPanel";
import CategoryVisualPanel from "@/components/analysis/intelligence/CategoryVisualPanel";
import RiskOverviewPanel from "@/components/analysis/intelligence/RiskOverviewPanel";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";

const CATEGORY_SECTIONS: Array<{
  id: string;
  title: string;
  match: (hit: IntelligenceHit) => boolean;
}> = [
  {
    id: "websites",
    title: "Öffentliche Webseiten",
    match: (hit) =>
      ["website", "name", "address", "general", "alias"].includes(
        hit.category
      ) && hit.sourceType === "google_custom_search",
  },
  {
    id: "social",
    title: "Gefundene Social Media Profile",
    match: (hit) => hit.category === "social",
  },
  {
    id: "images",
    title: "Bilder",
    match: (hit) =>
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hit.url) ||
      /image|img|photo|cdn/.test(hit.url.toLowerCase()),
  },
  {
    id: "phones",
    title: "Telefonnummern",
    match: (hit) => hit.category === "phone",
  },
  {
    id: "emails",
    title: "E-Mail-Adressen",
    match: (hit) => hit.category === "email",
  },
  {
    id: "companies",
    title: "Unternehmen",
    match: (hit) => hit.category === "company",
  },
  {
    id: "documents",
    title: "Dokumente",
    match: (hit) => /\.(pdf|docx?|xlsx?)(\?|$)/i.test(hit.url),
  },
  {
    id: "press",
    title: "Presse",
    match: (hit) =>
      /presse|news|zeitung|magazin|artikel/.test(
        `${hit.url} ${hit.title} ${hit.snippet}`.toLowerCase()
      ),
  },
  {
    id: "forums",
    title: "Foren",
    match: (hit) =>
      /forum|reddit|board|community/.test(
        `${hit.url} ${hit.title}`.toLowerCase()
      ),
  },
];

export default function GoogleIntelligenceReport({
  report: rawReport,
  revealSections = true,
}: {
  report: IntelligenceReport;
  revealSections?: boolean;
}) {
  const report = normalizeIntelligenceReport(rawReport);
  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-rose-400/20 px-4 py-8 text-center text-sm text-rose-100/60">
        Report-Daten sind unvollständig oder beschädigt. Bitte starten Sie die
        Analyse erneut.
      </div>
    );
  }

  const hits = report.hits;
  const assigned = new Set<string>();
  const sections = CATEGORY_SECTIONS.map((section) => {
    const sectionHits = hits.filter((hit) => {
      if (assigned.has(hit.id)) return false;
      if (!section.match(hit)) return false;
      assigned.add(hit.id);
      return true;
    });
    return { ...section, hits: sectionHits };
  }).filter((section) => section.hits.length > 0);

  const otherHits = hits.filter((hit) => !assigned.has(hit.id));
  const queries = report.queries;
  const recommendations = report.recommendations;

  return (
    <div className="space-y-6">
      <SectionReveal delayMs={0} enabled={revealSections}>
        <header className="rounded-2xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-5 md:p-6">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            GOOGLE INTELLIGENCE REPORT · ENTERPRISE OSINT
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/92 md:text-3xl">
            Was Google über {report.subjectName} öffentlich finden konnte
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">
            {report.summaryText}
          </p>
          {!report.apiConfigured ? (
            <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-[11px] text-amber-50/65">
              Live-Google-Treffer erfordern die Google Custom Search API. Es
              werden keine Daten simuliert oder erfunden.
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
            Erstellt: {report.generatedAtLabel}
            <span className="text-white/15">·</span>
            Profil {report.profileCompleteness} %
            <InfoTooltip label="Datenquelle">
              {`${report.dataSourceLabel}. Abgerufen am entspricht dem Analysezeitpunkt.`}
            </InfoTooltip>
          </p>
        </header>
      </SectionReveal>

      <SectionReveal delayMs={350} enabled={revealSections}>
        <ManagementOverviewPanel report={report} />
      </SectionReveal>

      {report.aiSummary ? (
        <SectionReveal delayMs={550} enabled={revealSections}>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              KI ZUSAMMENFASSUNG
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              {report.aiSummary}
            </p>
            <p className="mt-3 font-mono text-[8px] tracking-[.12em] text-white/25">
              NUR AUF BASIS VERIFIZIERTER TREFFER · KEINE ERFUNDENEN DATEN
            </p>
          </section>
        </SectionReveal>
      ) : null}

      <SectionReveal delayMs={700} enabled={revealSections}>
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
            {queries.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/40">
                Keine Suchanfragen möglich — bitte Identitätsprofil
                vervollständigen.
              </li>
            ) : (
              queries.map((query) => (
                <li
                  key={query.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                >
                  <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                    {query.label.toUpperCase()}
                  </span>
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

      {sections.map((section, index) => (
        <SectionReveal
          key={section.id}
          delayMs={1100 + index * 250}
          enabled={revealSections}
        >
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
            <div>
              <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
                {section.title.toUpperCase()}
              </h3>
              <ul className="space-y-2.5">
                {section.hits.map((hit) => (
                  <li key={hit.id}>
                    <IntelligenceHitCard hit={hit} />
                  </li>
                ))}
              </ul>
            </div>
            <CategoryVisualPanel
              title={section.title}
              hits={section.hits}
              report={report}
            />
          </section>
        </SectionReveal>
      ))}

      {otherHits.length > 0 ? (
        <SectionReveal delayMs={2000} enabled={revealSections}>
          <section>
            <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
              SONSTIGE ERWÄHNUNGEN
            </h3>
            <ul className="space-y-2.5">
              {otherHits.map((hit) => (
                <li key={hit.id}>
                  <IntelligenceHitCard hit={hit} />
                </li>
              ))}
            </ul>
          </section>
        </SectionReveal>
      ) : null}

      {sections.length === 0 && otherHits.length === 0 ? (
        <SectionReveal delayMs={1100} enabled={revealSections}>
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
            Keine öffentlichen Treffer gefunden. Das ist ein valides Ergebnis —
            SynSight zeigt ausschließlich API-verifizierte oder profilverknüpfte
            Daten.
          </div>
        </SectionReveal>
      ) : null}

      <SectionReveal delayMs={2300} enabled={revealSections}>
        <section>
          <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
            HANDLUNGSEMPFEHLUNGEN
          </h3>
          <ol className="space-y-3">
            {recommendations.map((item, index) => (
              <li
                key={item.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-white/80">
                    <span className="mr-2 font-mono text-[8px] text-cyber-cyan/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.title}
                  </p>
                  <span className="font-mono text-[7px] tracking-[.12em] text-white/30">
                    {item.priority.toUpperCase()} · {item.difficulty}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                  {item.detail}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <RecField label="Warum?" text={item.why} />
                  <RecField label="Welche Gefahr?" text={item.danger} />
                  <RecField label="Wie beheben?" text={item.howToFix} />
                  <RecField label="Zeitaufwand" text={item.effort} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </SectionReveal>

      <SectionReveal delayMs={2600} enabled={revealSections}>
        <ExecutiveSummaryPanel report={report} />
      </SectionReveal>
    </div>
  );
}

function RecField({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-2">
      <p className="font-mono text-[7px] tracking-[.12em] text-white/28">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/45">{text}</p>
    </div>
  );
}
