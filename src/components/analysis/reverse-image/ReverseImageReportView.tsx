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
  { id: "report-facescan", label: "FACESCAN" },
  { id: "report-summary", label: "ZUSAMMENFASSUNG" },
  { id: "report-hits", label: "TREFFER" },
];

function riskTone(level: string): {
  label: string;
  ring: string;
  text: string;
  dot: string;
} {
  if (level === "high")
    return {
      label: "KRITISCH",
      ring: "border-rose-400/40 bg-rose-400/[0.08]",
      text: "text-rose-100/90",
      dot: "bg-rose-400",
    };
  if (level === "medium")
    return {
      label: "ERHÖHT",
      ring: "border-orange-300/40 bg-orange-300/[0.08]",
      text: "text-orange-100/90",
      dot: "bg-orange-400",
    };
  return {
    label: "NIEDRIG",
    ring: "border-emerald-300/40 bg-emerald-300/[0.08]",
    text: "text-emerald-100/90",
    dot: "bg-emerald-400",
  };
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
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const { actionFor, onActionChange } = useAnalysisHitActions(
    "reverse_image_search"
  );

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
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
        return;
      }
      setSources([]);
      setSourceGroups([]);
      setResultsByQuery({});
      setSourcesError(
        body?.error?.message ??
          "Quellen konnten nicht geladen werden. Bitte Bildsuche erneut starten."
      );
    } catch {
      setSources([]);
      setSourcesError(
        "Quellen konnten nicht geladen werden. Bitte Bildsuche erneut starten."
      );
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

  const visual = riskTone(report.managementOverview.overallRisk);

  return (
    <div className="relative isolate">
      <div className="relative z-[1] flex items-start gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 space-y-6 xl:pr-2">
          <SectionReveal delayMs={0} enabled>
            <header
              id="report-overview"
              className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7"
            >
              <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
                REVERSE IMAGE SEARCH · SICHERHEITSBERICHT
              </p>
              <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                Visuelle Treffer von {report.subjectName}
              </h2>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${visual.ring}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${visual.dot}`} />
                  <span className={`text-sm font-semibold ${visual.text}`}>
                    {report.managementOverview.overallRiskLabel || visual.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/40">
                  Phase 1 SerpAPI · Phase 2 InsightFace (optional)
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["Bildtreffer", report.matchCount],
                    ["Kandidaten", report.candidateCount],
                    ["Risiko-Score", report.riskScore],
                    ["Suchanfragen", report.queryCount],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3"
                  >
                    <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                      {label.toUpperCase()}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-cyber-cyan/90">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                {report.referenceImageCount} Referenzbilder
                <span className="text-white/15">·</span>
                Aufbewahrung:{" "}
                {report.retentionDays === 0
                  ? "unbegrenzt"
                  : `${report.retentionDays} Tage`}
                <span className="text-white/15">·</span>
                Scan #{report.scanId}
              </p>
            </header>
          </SectionReveal>

          <SectionReveal delayMs={60} enabled>
            <section
              id="report-sources"
              className="scroll-mt-28 overflow-hidden rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.06] to-transparent"
            >
              <button
                type="button"
                onClick={() => setSourcesOpen((open) => !open)}
                className="flex w-full items-center justify-between px-5 py-4 text-left md:px-6"
              >
                <div>
                  <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
                    SERPAPI QUELLEN · GESPEICHERT
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {report.candidateCount} Bild-Links aus Google Images
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
                  ) : sourcesError ? (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-100/75">
                        {sourcesError}
                      </p>
                      <p className="text-xs text-white/40">
                        Ohne gespeicherte SerpAPI-Quellen kann der
                        Gesichtsvergleich nicht gestartet werden.
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadSources()}
                        className="text-xs text-cyber-cyan/80 hover:underline"
                      >
                        Erneut laden
                      </button>
                    </div>
                  ) : sources.length === 0 ? (
                    <p className="text-sm text-white/40">
                      Keine gespeicherten Quellen für diesen Scan. Bitte
                      Bildsuche erneut starten.
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
                      <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {visibleSources.map((candidate) => (
                          <li
                            key={candidate.imageUrl}
                            className="flex gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-2.5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={proxy(candidate.imageUrl)}
                              alt={candidate.title}
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
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

          <SectionReveal delayMs={100} enabled>
            <section
              id="report-facescan"
              className="scroll-mt-28 rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.06] to-transparent p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
                FACESCAN · GESICHTSVERGLEICH
              </p>
              <h3 className="mt-2 text-lg font-medium text-white/88">
                InsightFace Abgleich starten
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Wähle gespeicherte Bildquellen aus und starte den Vergleich mit
                den Referenzfotos aus dem Profil. 1 SynCredit pro ausgewähltem
                Bild.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowComparePicker((open) => !open)}
                  disabled={sourcesLoading || sources.length === 0}
                  className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2 text-sm text-cyber-cyan transition hover:bg-cyber-cyan/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {showComparePicker
                    ? "Auswahl schließen"
                    : "Gesichtsvergleich starten"}
                </button>
                {sourcesError ? (
                  <a
                    href="/dashboard/analysis/reverse-image?start=1"
                    className="rounded-lg border border-amber-300/30 bg-amber-300/[0.06] px-4 py-2 text-sm text-amber-100/85"
                  >
                    Bildsuche neu starten
                  </a>
                ) : null}
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

          <SectionReveal delayMs={140} enabled>
            <section
              id="report-summary"
              className="scroll-mt-28 rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.06] to-transparent p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
                ANALYSE-ZUSAMMENFASSUNG
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {report.summary ?? report.managementOverview.headline}
              </p>
              <p className="mt-3 font-mono text-[9px] tracking-[.12em] text-white/35">
                {report.queryCount} Suchanfragen · {report.referenceImageCount}{" "}
                Referenzbilder · {report.candidateCount} Kandidaten
              </p>
            </section>
          </SectionReveal>

          <SectionReveal delayMs={200} enabled>
            <section id="report-hits" className="scroll-mt-28 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
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
                <p className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-8 text-center text-sm text-white/45">
                  Keine Treffer in diesem Filter — oder keine Übereinstimmung
                  über dem Schwellenwert. Starte den Facescan, um Bilder zu
                  vergleichen.
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
                        className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1018]/80"
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

        <SystemRail
          sectionsReady
          sections={RAIL}
          alwaysShowLabels
          placement="sticky"
          activeOffsetPx={128}
          className="pt-1"
        />
      </div>
    </div>
  );
}
