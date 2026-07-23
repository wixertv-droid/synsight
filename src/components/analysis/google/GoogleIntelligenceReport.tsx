"use client";

import { useMemo, useState } from "react";
import ExecutiveSummaryPanel from "@/components/analysis/intelligence/ExecutiveSummaryPanel";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import ManagementOverviewPanel from "@/components/analysis/intelligence/ManagementOverviewPanel";
import CategoryVisualPanel from "@/components/analysis/intelligence/CategoryVisualPanel";
import RiskOverviewPanel from "@/components/analysis/intelligence/RiskOverviewPanel";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  buildReportScorecard,
  buildStructuredAnalysisSummary,
  enrichHitIntel,
  getCategoryMeta,
  riskToSeverity,
  type HitSeverity,
} from "@/lib/analysis/hit-intel";
import { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  retentionLabel,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";
import type { IntelligenceHit, IntelligenceReport } from "@/lib/analysis/types";

const SEVERITY_FILTERS: Array<{ id: "all" | HitSeverity; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "critical", label: "Kritisch" },
  { id: "high", label: "Hoch" },
  { id: "medium", label: "Mittel" },
  { id: "low", label: "Niedrig" },
];

const CATEGORY_FILTERS = [
  { id: "all", label: "Alle Kategorien" },
  { id: "name", label: "Name" },
  { id: "phone", label: "Telefon" },
  { id: "email", label: "E-Mail" },
  { id: "image", label: "Bilder" },
  { id: "social", label: "Social Media" },
  { id: "forum", label: "Foren" },
  { id: "website", label: "Domains / Web" },
  { id: "document", label: "Dokumente" },
  { id: "company", label: "Unternehmen" },
  { id: "alias", label: "Alias" },
  { id: "address", label: "Ort" },
] as const;

function ensureEnriched(
  hits: IntelligenceHit[],
  subjectName: string
): IntelligenceHit[] {
  return hits.map((hit) =>
    hit.identityConfidence != null && hit.aiEvaluation
      ? hit
      : enrichHitIntel(hit, { subjectName })
  );
}

export default function GoogleIntelligenceReport({
  report: rawReport,
  revealSections = true,
}: {
  report: IntelligenceReport;
  revealSections?: boolean;
}) {
  const report = normalizeIntelligenceReport(rawReport);
  const [queriesOpen, setQueriesOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | HitSeverity>(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const derived = useMemo(() => {
    if (!report) return null;
    const enriched = ensureEnriched(report.hits, report.subjectName);
    const liveHits = enriched.filter(
      (hit) => hit.sourceType !== "identity_profile"
    );
    const profileHits = enriched.filter(
      (hit) => hit.sourceType === "identity_profile"
    );
    const scorecard = report.scorecard ?? buildReportScorecard(enriched);
    // Always rebuild for current wording (stored text may be outdated).
    const analysisSummary = buildStructuredAnalysisSummary(
      report.subjectName,
      enriched,
      scorecard
    );

    const severityCounts = {
      all: liveHits.length,
      critical: liveHits.filter((hit) => hit.severity === "critical").length,
      high: liveHits.filter((hit) => hit.severity === "high").length,
      medium: liveHits.filter((hit) => hit.severity === "medium").length,
      low: liveHits.filter((hit) => (hit.severity ?? "low") === "low").length,
    };

    const categoryCounts = CATEGORY_FILTERS.reduce(
      (acc, item) => {
        if (item.id === "all") {
          acc[item.id] = liveHits.length;
          return acc;
        }
        acc[item.id] = liveHits.filter((hit) => {
          const key =
            hit.filterCategory ??
            getCategoryMeta(hit.category, hit.url, hit.title).filterKey;
          if (item.id === "website") {
            return ["website", "general"].includes(key);
          }
          return key === item.id;
        }).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const filtered = liveHits.filter((hit) => {
      const severity = hit.severity ?? riskToSeverity(hit.risk);
      if (severityFilter !== "all" && severity !== severityFilter) return false;
      if (categoryFilter === "all") return true;
      const key =
        hit.filterCategory ??
        getCategoryMeta(hit.category, hit.url, hit.title).filterKey;
      if (categoryFilter === "website") {
        return ["website", "general"].includes(key);
      }
      return key === categoryFilter;
    });

    // Sort: critical first, then confidence
    filtered.sort((a, b) => {
      const sevRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      const sa = sevRank[a.severity ?? "low"];
      const sb = sevRank[b.severity ?? "low"];
      if (sa !== sb) return sa - sb;
      return (b.identityConfidence ?? 0) - (a.identityConfidence ?? 0);
    });

    const channelSections = [
      {
        id: "critical",
        title: "Kritische Treffer",
        hits: filtered.filter((hit) => hit.severity === "critical"),
      },
      {
        id: "high",
        title: "Hohe Priorität",
        hits: filtered.filter((hit) => hit.severity === "high"),
      },
      {
        id: "rest",
        title: "Weitere Treffer",
        hits: filtered.filter(
          (hit) => hit.severity !== "critical" && hit.severity !== "high"
        ),
      },
    ].filter((section) => section.hits.length > 0);

    return {
      enriched,
      liveHits,
      profileHits,
      scorecard,
      analysisSummary,
      severityCounts,
      categoryCounts,
      filtered,
      channelSections,
      queries: report.queries,
      recommendations: report.recommendations,
    };
  }, [report, severityFilter, categoryFilter]);

  if (!report || !derived) {
    return (
      <div className="rounded-xl border border-dashed border-rose-400/20 px-4 py-8 text-center text-sm text-rose-100/60">
        Report-Daten sind unvollständig. Bitte starten Sie die Analyse erneut.
      </div>
    );
  }

  const {
    liveHits,
    profileHits,
    scorecard,
    analysisSummary,
    severityCounts,
    categoryCounts,
    filtered,
    channelSections,
    queries,
    recommendations,
  } = derived;

  const expiresLabel = report.expiresAt
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(new Date(report.expiresAt))
    : "Unbegrenzt";

  const firstAction = recommendations.find((item) => item.priority === "Jetzt");
  const firstActionLabel = (() => {
    const title = firstAction?.title?.trim() || "";
    if (!title) return "Beobachten";
    if (/Sensible Google-Treffer/i.test(title))
      return "Kritische Treffer prüfen";
    return title;
  })();

  return (
    <div className="space-y-6">
      <SectionReveal delayMs={0} enabled={revealSections}>
        <header className="relative overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7">
          <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
            GOOGLE INTELLIGENCE REPORT · SICHERHEITSBERICHT
          </p>
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
            Öffentliche Google-Spuren von {report.subjectName}
          </h2>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Betrifft mich",
                value: String(scorecard.likelyMeCount),
              },
              {
                label: "Kritisch",
                value: String(scorecard.criticalCount),
              },
              {
                label: "Gesamt-Score",
                value: `${scorecard.overallScore}/100`,
              },
              {
                label: "Als Erstes tun",
                value: firstActionLabel,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3"
              >
                <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                  {item.label.toUpperCase()}
                </p>
                <p
                  className={`mt-1 font-semibold leading-snug text-cyber-cyan/90 ${
                    item.label === "Als Erstes tun"
                      ? "text-[15px] md:text-base"
                      : "text-lg"
                  }`}
                >
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
            Live-Treffer {liveHits.length} · Profil-Links {profileHits.length}
          </p>
        </header>
      </SectionReveal>

      <SectionReveal delayMs={180} enabled={revealSections}>
        <section className="rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.06] to-transparent p-5 md:p-6">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
            ANALYSE-ZUSAMMENFASSUNG
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/70">
            {analysisSummary}
          </p>
          {report.aiSummary ? (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                KI-LAGEBILD
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/55">
                {sanitizeAiSummary(report.aiSummary)}
              </p>
            </div>
          ) : null}
        </section>
      </SectionReveal>

      <SectionReveal delayMs={280} enabled={revealSections}>
        <ManagementOverviewPanel report={report} />
      </SectionReveal>

      <SectionReveal delayMs={420} enabled={revealSections}>
        <RiskOverviewPanel report={report} />
      </SectionReveal>

      <SectionReveal delayMs={560} enabled={revealSections}>
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
                Nachweis der durchsuchten Profilfelder — für die Bewertung nicht
                nötig.
              </InfoTooltip>
            </div>
            <span className="font-mono text-[10px] text-cyber-cyan/70">
              {queriesOpen ? "ZUKLAPPEN" : "AUFKLAPPEN"}
            </span>
          </button>
          {queriesOpen ? (
            <ul className="space-y-2 border-t border-white/[0.05] px-4 py-3">
              {queries.map((query) => (
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-white/[0.05] px-4 py-2.5 text-[11px] text-white/30">
              {queries.length} Profil-Suchanfragen · aufklappen bei Bedarf
            </p>
          )}
        </section>
      </SectionReveal>

      <SectionReveal delayMs={700} enabled={revealSections}>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(250px,0.55fr)]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
              <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                FILTER · RISIKO
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SEVERITY_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSeverityFilter(item.id)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                      severityFilter === item.id
                        ? "border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan"
                        : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {item.label} ({severityCounts[item.id]})
                  </button>
                ))}
              </div>
              <p className="mt-4 font-mono text-[8px] tracking-[.14em] text-white/30">
                FILTER · KATEGORIE
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((item) => {
                  const count = categoryCounts[item.id] ?? 0;
                  if (item.id !== "all" && count === 0) return null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategoryFilter(item.id)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                        categoryFilter === item.id
                          ? "border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan"
                          : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      {item.label}
                      {item.id !== "all" ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </section>

            {channelSections.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                  CLEAR CHANNEL
                </p>
                <p className="mt-3 text-sm text-white/50">
                  Keine Treffer für diesen Filter. Filter zurücksetzen oder
                  Analyse erneut starten.
                </p>
              </div>
            ) : (
              channelSections.map((section) => (
                <section key={section.id} className="space-y-3">
                  <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                    {section.title.toUpperCase()} · {section.hits.length}
                  </h3>
                  <ul className="space-y-3">
                    {section.hits.map((hit) => (
                      <li key={hit.id}>
                        <IntelligenceHitCard hit={hit} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            {profileHits.length > 0 &&
            severityFilter === "all" &&
            categoryFilter === "all" ? (
              <section className="space-y-3">
                <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                  PROFIL-VERKNÜPFUNGEN · {profileHits.length}
                </h3>
                <ul className="space-y-3">
                  {profileHits.map((hit) => (
                    <li key={hit.id}>
                      <IntelligenceHitCard hit={hit} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-6">
            <CategoryVisualPanel
              report={{ ...report, scorecard, hits: derived.enriched }}
              hits={filtered}
              categories={channelSections}
            />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal delayMs={900} enabled={revealSections}>
        <section>
          <h3 className="mb-3 font-mono text-[9px] tracking-[.16em] text-white/35">
            HANDLUNGSEMPFEHLUNGEN · WAS ZUERST?
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
                    {item.priority.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                  {item.detail}
                </p>
                <p className="mt-2 text-[12px] text-white/55">
                  <span className="text-white/30">Nächster Schritt: </span>
                  {item.howToFix}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </SectionReveal>

      <SectionReveal delayMs={1050} enabled={revealSections}>
        <ExecutiveSummaryPanel report={report} />
      </SectionReveal>
    </div>
  );
}
