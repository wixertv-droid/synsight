"use client";

import { useMemo, useState } from "react";
import ExecutiveSummaryPanel from "@/components/analysis/intelligence/ExecutiveSummaryPanel";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import ManagementOverviewPanel from "@/components/analysis/intelligence/ManagementOverviewPanel";
import CategoryVisualPanel from "@/components/analysis/intelligence/CategoryVisualPanel";
import RiskOverviewPanel from "@/components/analysis/intelligence/RiskOverviewPanel";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { isPrimaryHit } from "@/lib/analysis/hit-quality";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { retentionLabel } from "@/lib/analysis/retention";
import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";
import type { ReportRetentionDays } from "@/lib/analysis/retention";

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
      ) && hit.sourceType !== "identity_profile",
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
  const [showWeakHits, setShowWeakHits] = useState(false);
  const [queriesOpen, setQueriesOpen] = useState(false);

  const derived = useMemo(() => {
    if (!report) return null;
    const visibleHits = report.hits.filter(
      (hit) => showWeakHits || isPrimaryHit(hit)
    );
    const weakCount = report.hits.filter((hit) => !isPrimaryHit(hit)).length;
    const assigned = new Set<string>();
    const sections = CATEGORY_SECTIONS.map((section) => {
      const sectionHits = visibleHits.filter((hit) => {
        if (assigned.has(hit.id)) return false;
        if (!section.match(hit)) return false;
        assigned.add(hit.id);
        return true;
      });
      return { ...section, hits: sectionHits };
    }).filter((section) => section.hits.length > 0);
    const otherHits = visibleHits.filter((hit) => !assigned.has(hit.id));
    return {
      hits: visibleHits,
      weakCount,
      sections,
      otherHits,
      queries: report.queries,
      recommendations: report.recommendations,
      liveHits: report.hits.filter(
        (hit) => hit.sourceType !== "identity_profile"
      ),
      profileHits: report.hits.filter(
        (hit) => hit.sourceType === "identity_profile"
      ),
    };
  }, [report, showWeakHits]);

  if (!report || !derived) {
    return (
      <div className="rounded-xl border border-dashed border-rose-400/20 px-4 py-8 text-center text-sm text-rose-100/60">
        Report-Daten sind unvollständig. Bitte starten Sie die Analyse erneut.
      </div>
    );
  }

  const {
    sections,
    otherHits,
    queries,
    recommendations,
    liveHits,
    profileHits,
    weakCount,
  } = derived;

  const expiresLabel = report.expiresAt
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(new Date(report.expiresAt))
    : "Unbegrenzt";

  return (
    <div className="space-y-6">
      <SectionReveal delayMs={0} enabled={revealSections}>
        <header className="relative overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7">
          <div
            className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(112,231,255,0.25), transparent 70%)",
            }}
          />
          <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
            GOOGLE INTELLIGENCE REPORT · LIVE OSINT
          </p>
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
            Öffentliche Google-Spuren von {report.subjectName}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
            {report.summaryText}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Live-Treffer", value: String(liveHits.length) },
              { label: "Profil-Links", value: String(profileHits.length) },
              { label: "Risiko", value: report.riskLevel.toUpperCase() },
              { label: "Score", value: String(report.riskScore) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3"
              >
                <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                  {item.label.toUpperCase()}
                </p>
                <p className="mt-1 text-xl font-semibold text-cyber-cyan/90">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
            Erstellt: {report.generatedAtLabel}
            <span className="text-white/15">·</span>
            Speicherung:{" "}
            {retentionLabel(report.retentionDays as ReportRetentionDays)}
            <span className="text-white/15">·</span>
            Gültig bis: {expiresLabel}
            <span className="text-white/15">·</span>
            Profil {report.profileCompleteness} %
            <span className="text-white/15">·</span>
            {report.dataSourceLabel}
            <InfoTooltip label="Speicherung">
              Der Report wird serverseitig gespeichert und nach Ablauf der
              gewählten Dauer automatisch nicht mehr angezeigt.
            </InfoTooltip>
          </p>
        </header>
      </SectionReveal>

      <SectionReveal delayMs={280} enabled={revealSections}>
        <ManagementOverviewPanel report={report} />
      </SectionReveal>

      {report.aiSummary ? (
        <SectionReveal delayMs={480} enabled={revealSections}>
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              KI-LAGEBILD
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {report.aiSummary}
            </p>
          </section>
        </SectionReveal>
      ) : null}

      <SectionReveal delayMs={620} enabled={revealSections}>
        <RiskOverviewPanel report={report} />
      </SectionReveal>

      <SectionReveal delayMs={800} enabled={revealSections}>
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.015]">
          <button
            type="button"
            onClick={() => setQueriesOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={queriesOpen}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                AUSGEFÜHRTE SUCHANFRAGEN
              </h3>
              <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/40">
                {queries.length}
              </span>
              <InfoTooltip label="Suchanfragen">
                Nachweis der durchsuchten Profilfelder. Für die Bewertung der
                Treffer nicht erforderlich — standardmäßig zugeklappt.
              </InfoTooltip>
            </div>
            <span className="font-mono text-[10px] text-cyber-cyan/70">
              {queriesOpen ? "ZUKLAPPEN" : "AUFKLAPPEN"}
            </span>
          </button>
          {queriesOpen ? (
            <ul className="space-y-2 border-t border-white/[0.05] px-4 py-3">
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
                    <p className="mt-1 text-[11px] text-white/35">
                      {query.help}
                    </p>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="border-t border-white/[0.05] px-4 py-2.5 text-[11px] text-white/30">
              {queries.length} Profil-Suchanfragen ausgeführt · Details
              aufklappen bei Bedarf
            </p>
          )}
        </section>
      </SectionReveal>

      {weakCount > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowWeakHits((value) => !value)}
            className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] tracking-[.08em] text-white/45 hover:border-white/20 hover:text-white/70"
          >
            {showWeakHits
              ? "Schwache Treffer ausblenden"
              : `${weakCount} schwache Treffer anzeigen`}
          </button>
        </div>
      ) : null}

      {sections.map((section, index) => (
        <SectionReveal
          key={section.id}
          delayMs={1000 + index * 220}
          enabled={revealSections}
        >
          <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.55fr)]">
            <div className="min-w-0">
              <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
                {section.title.toUpperCase()}
                <span className="ml-2 text-white/25">
                  · {section.hits.length}
                </span>
              </h3>
              <ul className="space-y-2">
                {section.hits.map((hit) => (
                  <li key={hit.id}>
                    <IntelligenceHitCard hit={hit} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:sticky lg:top-6">
              <CategoryVisualPanel
                title={section.title}
                hits={section.hits}
                report={report}
              />
            </div>
          </section>
        </SectionReveal>
      ))}

      {otherHits.length > 0 ? (
        <SectionReveal delayMs={1800} enabled={revealSections}>
          <section>
            <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
              SONSTIGE ERWÄHNUNGEN · {otherHits.length}
            </h3>
            <ul className="space-y-2">
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
        <SectionReveal delayMs={1000} enabled={revealSections}>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
              CLEAR CHANNEL
            </p>
            <p className="mt-3 text-sm text-white/50">
              Keine relevanten öffentlichen Treffer zu den aktuellen
              Suchanfragen. Das Profil erscheint derzeit wenig sichtbar im
              offenen Index.
            </p>
          </div>
        </SectionReveal>
      ) : null}

      <SectionReveal delayMs={2100} enabled={revealSections}>
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

      <SectionReveal delayMs={2350} enabled={revealSections}>
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
