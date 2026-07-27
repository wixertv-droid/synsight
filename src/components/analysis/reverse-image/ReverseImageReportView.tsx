"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReverseImageReport } from "@/lib/analysis/reverse-image/types";
import type { SerpImageCandidate } from "@/lib/analysis/reverse-image/serpapi-images";
import {
  orderTypeForReverseImageHit,
  reverseImageHitToIntelligenceHit,
  selfGuideForReverseImageHit,
} from "@/lib/analysis/reverse-image/to-intelligence-hit";
import { fingerprintForIntelligenceHit } from "@/lib/analysis/hit-action-state";
import { useAnalysisHitActions } from "@/hooks/use-analysis-hit-actions";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import ReverseImageCandidatePicker from "@/components/analysis/reverse-image/ReverseImageCandidatePicker";
import {
  countSeverities,
  matchesSeverityFilter,
  SeverityRiskFilterBar,
  type SeverityRiskFilterId,
} from "@/components/analysis/intelligence/SeverityRiskFilterBar";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";

const RAIL: SystemRailSection[] = [
  { id: "report-overview", label: "ÜBERBLICK" },
  { id: "report-sources", label: "QUELLEN" },
  { id: "report-summary", label: "ZUSAMMENFASSUNG" },
  { id: "report-hits", label: "TREFFER" },
];

function riskTone(level: string): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

export default function ReverseImageReportView({
  report,
}: {
  report: ReverseImageReport;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<SeverityRiskFilterId>("all");
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [sources, setSources] = useState<SerpImageCandidate[]>([]);
  const [sourceGroups, setSourceGroups] = useState<
    Array<{ id: string; label: string; count: number }>
  >([]);
  const [resultsByQuery, setResultsByQuery] = useState<
    Record<string, SerpImageCandidate[]>
  >({});
  const [activeSourceFilter, setActiveSourceFilter] = useState("all");
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const { actionFor, onActionChange } = useAnalysisHitActions(
    "reverse_image_search"
  );

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const response = await fetch(
        `/api/analysis/reverse-image/sources?scanId=${report.scanId}`,
        { cache: "no-store" }
      );
      const body = await response.json().catch(() => null);
      if (response.ok && body?.success) {
        setSources(body.data.candidates ?? []);
        setSourceGroups(body.data.groups ?? []);
        setResultsByQuery(body.data.resultsByQuery ?? {});
      }
    } finally {
      setSourcesLoading(false);
    }
  }, [report.scanId]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const onCompareStarted = useCallback(() => {
    router.push(
      `/dashboard/results?tab=reverse_image_search&module=reverse_image&scan=1&compareWatch=1&scanId=${report.scanId}`
    );
  }, [report.scanId, router]);

  const visibleSources = useMemo(() => {
    if (activeSourceFilter === "all") return sources;
    return resultsByQuery[activeSourceFilter] ?? [];
  }, [activeSourceFilter, resultsByQuery, sources]);

  const proxy = (url: string) =>
    `/api/analysis/reverse-image/proxy-image?scanId=${report.scanId}&url=${encodeURIComponent(url)}`;

  const intelligenceHits = useMemo(
    () => report.hits.map((hit) => reverseImageHitToIntelligenceHit(hit)),
    [report.hits]
  );

  const filteredHits = useMemo(() => {
    return report.hits.filter((hit) => {
      const intel = reverseImageHitToIntelligenceHit(hit);
      return matchesSeverityFilter(intel.severity, filter);
    });
  }, [report.hits, filter]);

  const severityCounts = countSeverities(
    intelligenceHits.map((hit) => hit.severity)
  );

  return (
    <div className="relative">
      <SystemRail sections={RAIL} />
      <div className="space-y-8 pl-0 md:pl-8">
        <SectionReveal delayMs={0} enabled>
          <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              REVERSE IMAGE SEARCH
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/92">
              Visuelle Treffer · {report.subjectName}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                  TREFFER
                </p>
                <p className="mt-1 text-2xl font-semibold text-white/90">
                  {report.matchCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                  KANDIDATEN
                </p>
                <p className="mt-1 text-2xl font-semibold text-white/90">
                  {report.candidateCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                  RISIKO-SCORE
                </p>
                <p className="mt-1 text-2xl font-semibold text-white/90">
                  {report.riskScore}
                </p>
              </div>
              <div
                className={`rounded-xl border px-4 py-3 ${riskTone(report.managementOverview.overallRisk)}`}
              >
                <p className="font-mono text-[8px] tracking-[.12em] opacity-70">
                  BEWERTUNG
                </p>
                <p className="mt-1 text-sm font-medium">
                  {report.managementOverview.overallRiskLabel}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowComparePicker((open) => !open)}
                className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2 text-sm text-cyber-cyan transition hover:bg-cyber-cyan/[0.14]"
              >
                {showComparePicker
                  ? "Auswahl schließen"
                  : "Gesichtsvergleich starten (aus gespeicherten Quellen)"}
              </button>
            </div>

            {showComparePicker ? (
              <div className="mt-5">
                <ReverseImageCandidatePicker
                  scanId={report.scanId}
                  onCompareStarted={onCompareStarted}
                />
              </div>
            ) : null}
          </section>
        </SectionReveal>

        <SectionReveal delayMs={60} enabled>
          <section
            id="report-sources"
            className="glass hardware-panel rounded-[1.2rem] border border-white/[0.07]"
          >
            <button
              type="button"
              onClick={() => setSourcesOpen((open) => !open)}
              className="flex w-full items-center justify-between px-5 py-4 text-left md:px-6"
            >
              <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                  SERPAPI QUELLEN · GESPEICHERT
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {report.candidateCount} Bild-Links aus Google Images (
                  Aufbewahrung:{" "}
                  {report.retentionDays === 0
                    ? "unbegrenzt"
                    : `${report.retentionDays} Tage`}
                  )
                </p>
              </div>
              <span className="font-mono text-sm text-white/40">
                {sourcesOpen ? "▲" : "▼"}
              </span>
            </button>
            {sourcesOpen ? (
              <div className="border-t border-white/[0.06] px-5 py-4 md:px-6">
                {sourcesLoading ? (
                  <p className="text-sm text-white/40">Lade Quellen…</p>
                ) : sources.length === 0 ? (
                  <p className="text-sm text-white/40">
                    Keine gespeicherten Quellen verfügbar — ggf. abgelaufen oder
                    Scan vor Zwei-Phasen-Update.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSourceFilter("all")}
                        className={`rounded-lg border px-3 py-1.5 text-xs ${
                          activeSourceFilter === "all"
                            ? "border-cyber-cyan/40 bg-cyber-cyan/[0.1] text-cyber-cyan"
                            : "border-white/10 text-white/50"
                        }`}
                      >
                        Alle ({sources.length})
                      </button>
                      {sourceGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setActiveSourceFilter(group.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs ${
                            activeSourceFilter === group.id
                              ? "border-cyber-cyan/40 bg-cyber-cyan/[0.1] text-cyber-cyan"
                              : "border-white/10 text-white/50"
                          }`}
                        >
                          {group.label} ({group.count})
                        </button>
                      ))}
                    </div>
                    <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                      {visibleSources.map((candidate) => (
                        <li
                          key={candidate.imageUrl}
                          className="flex gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proxy(candidate.imageUrl)}
                            alt={candidate.title}
                            className="h-14 w-14 shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white/75">
                              {candidate.title}
                            </p>
                            <p className="font-mono text-[9px] text-white/35">
                              {candidate.queryLabel ?? candidate.query} ·{" "}
                              {candidate.sourceHost}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-3 font-mono text-[9px]">
                              <a
                                href={candidate.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyber-cyan/80 hover:underline"
                              >
                                Bild-URL
                              </a>
                              {candidate.sourceUrl ? (
                                <a
                                  href={candidate.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-300/70 hover:underline"
                                >
                                  Quellseite
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </section>
        </SectionReveal>

        <SectionReveal delayMs={120} enabled>
          <section className="glass hardware-panel rounded-[1.2rem] border border-white/[0.07] p-5 md:p-6">
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
              ZUSAMMENFASSUNG
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {report.summary ?? report.managementOverview.headline}
            </p>
            <p className="mt-3 font-mono text-[9px] tracking-[.12em] text-white/35">
              {report.queryCount} Suchanfragen · {report.referenceImageCount}{" "}
              Referenzbilder · Phase 1 SerpAPI · Phase 2 InsightFace (optional)
            </p>
          </section>
        </SectionReveal>

        <SectionReveal delayMs={240} enabled>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                  BILDTREFFER
                </p>
                <h3 className="mt-1 text-lg font-medium text-white/88">
                  Gefundene Übereinstimmungen
                </h3>
              </div>
              <SeverityRiskFilterBar
                value={filter}
                counts={severityCounts}
                onChange={setFilter}
              />
            </div>

            {filteredHits.length === 0 ? (
              <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                Keine Treffer in diesem Filter — oder keine Übereinstimmung über
                dem Schwellenwert.
              </p>
            ) : (
              <div className="space-y-5">
                {filteredHits.map((hit) => {
                  const intel = reverseImageHitToIntelligenceHit(hit);
                  const fingerprint = fingerprintForIntelligenceHit(
                    "reverse_image_search",
                    intel
                  );
                  const imageUrl = `/api/analysis/reverse-image/hits/${hit.id}/image?scanId=${report.scanId}`;
                  const thumbUrl = `${imageUrl}&thumb=1`;

                  return (
                    <article
                      key={hit.id}
                      className="overflow-hidden rounded-[1.1rem] border border-white/[0.08] bg-[#0a1018]/80"
                    >
                      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                        <div className="relative border-b border-white/[0.06] bg-black/30 md:border-b-0 md:border-r">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbUrl}
                            alt={hit.title}
                            className="h-full max-h-[220px] w-full object-cover object-top"
                          />
                          <div className="absolute bottom-2 left-2 rounded-md border border-cyber-cyan/30 bg-black/70 px-2 py-1 font-mono text-[10px] text-cyber-cyan">
                            {Math.round(hit.similarity * 100)} % MATCH
                          </div>
                        </div>
                        <div className="p-1">
                          <IntelligenceHitCard
                            hit={intel}
                            sourceModule="reverse_image_search"
                            analysisId={report.scanId}
                            orderType={orderTypeForReverseImageHit()}
                            selfGuide={selfGuideForReverseImageHit(hit)}
                            knownAction={actionFor(fingerprint)}
                            onActionChange={onActionChange}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </SectionReveal>
      </div>
    </div>
  );
}
