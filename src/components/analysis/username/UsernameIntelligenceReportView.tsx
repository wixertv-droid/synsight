"use client";

import { useMemo, useState } from "react";
import type {
  UsernameAmpel,
  UsernameHit,
  UsernameIdentityFindings,
  UsernameReport,
  UsernameSecurityOverview,
} from "@/lib/analysis/username/types";
import {
  buildIdentityFindings,
  buildManagementOverview,
  buildSecurityOverview,
  splitPrimaryAndWeakHits,
} from "@/lib/analysis/username/report-metrics";
import {
  orderTypeForUsernameHit,
  selfGuideForUsernameHit,
  usernameHitToIntelligenceHit,
} from "@/lib/analysis/username/to-intelligence-hit";
import { fingerprintForIntelligenceHit } from "@/lib/analysis/hit-action-state";
import { useAnalysisHitActions } from "@/hooks/use-analysis-hit-actions";
import type { HitActionState } from "@/lib/analysis/hit-action-state";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import {
  countSeverities,
  matchesSeverityFilter,
  SeverityRiskFilterBar,
  type SeverityRiskFilterId,
} from "@/components/analysis/intelligence/SeverityRiskFilterBar";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";

const RAIL: SystemRailSection[] = [
  { id: "report-overview", label: "ÜBERBLICK" },
  { id: "report-summary", label: "ZUSAMMENFASSUNG" },
  { id: "report-identity", label: "IDENTITÄT" },
  { id: "report-hits", label: "TREFFER" },
  { id: "report-actions", label: "AUFTRÄGE" },
];

function ampelVisual(ampel: UsernameAmpel) {
  if (ampel === "red")
    return {
      label: "KRITISCH",
      ring: "border-rose-400/40 bg-rose-400/[0.08]",
      text: "text-rose-100/90",
      dot: "bg-rose-400",
    };
  if (ampel === "orange")
    return {
      label: "ERHÖHT",
      ring: "border-orange-300/40 bg-orange-300/[0.08]",
      text: "text-orange-100/90",
      dot: "bg-orange-400",
    };
  if (ampel === "yellow")
    return {
      label: "BEOBACHTEN",
      ring: "border-amber-300/40 bg-amber-300/[0.08]",
      text: "text-amber-100/90",
      dot: "bg-amber-400",
    };
  return {
    label: "NIEDRIG",
    ring: "border-emerald-300/40 bg-emerald-300/[0.08]",
    text: "text-emerald-100/90",
    dot: "bg-emerald-400",
  };
}

function FindingChip({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean;
}) {
  const display =
    typeof value === "boolean" ? (value ? "Ja" : "Nein") : String(value);
  const positive = value === true || (typeof value === "number" && value > 0);
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        positive
          ? "border-amber-300/25 bg-amber-300/[0.05]"
          : "border-white/[0.06] bg-black/20"
      }`}
    >
      <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-lg font-semibold text-white/85">{display}</p>
    </div>
  );
}

function UsernameHitList({
  hits,
  analysisId,
  actionFor,
  onActionChange,
}: {
  hits: UsernameHit[];
  analysisId: number;
  actionFor: (fingerprint: string) => HitActionState;
  onActionChange: (fingerprint: string, action: HitActionState) => void;
}) {
  return (
    <ul className="space-y-3">
      {hits.map((hit) => {
        const intel = usernameHitToIntelligenceHit(hit);
        const fingerprint = fingerprintForIntelligenceHit(
          "username_intelligence",
          intel
        );
        return (
          <li key={hit.id}>
            <IntelligenceHitCard
              hit={intel}
              analysisId={analysisId}
              sourceModule="username_intelligence"
              orderType={orderTypeForUsernameHit(hit)}
              selfGuide={selfGuideForUsernameHit(hit)}
              knownAction={actionFor(fingerprint)}
              onActionChange={onActionChange}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function UsernameIntelligenceReportView({
  report,
  revealSections = true,
}: {
  report: UsernameReport;
  revealSections?: boolean;
}) {
  const [possibleOpen, setPossibleOpen] = useState(false);
  const [severityFilter, setSeverityFilter] =
    useState<SeverityRiskFilterId>("all");
  const { actionFor, onActionChange, isExcluded } = useAnalysisHitActions(
    "username_intelligence"
  );

  const derived = useMemo(() => {
    const activeHits = report.hits.filter((hit) => {
      const intel = usernameHitToIntelligenceHit(hit);
      const fp = fingerprintForIntelligenceHit("username_intelligence", intel);
      return !isExcluded(fp);
    });
    const overview = buildManagementOverview({
      username: report.subjectUsername,
      hits: activeHits,
      identityScore: report.identityScore,
      riskScore: report.riskScore,
      confidence: report.confidence,
    });
    const security: UsernameSecurityOverview = buildSecurityOverview({
      hits: activeHits,
      actions: report.actions ?? [],
      overallRisk: overview.overallRisk,
    });
    const findings: UsernameIdentityFindings =
      buildIdentityFindings(activeHits);
    // Show all hits in lists (ignored/resolved stay visible with badges)
    const { primary, weak } = splitPrimaryAndWeakHits(report.hits);
    const primaryWithSeverity = primary.map((hit) => ({
      hit,
      severity: usernameHitToIntelligenceHit(hit).severity,
    }));
    const severityCounts = countSeverities(
      primaryWithSeverity.map((item) => item.severity)
    );
    const filteredPrimary = primaryWithSeverity
      .filter((item) => matchesSeverityFilter(item.severity, severityFilter))
      .map((item) => item.hit);
    return {
      overview,
      security,
      findings,
      primary: filteredPrimary,
      weak,
      severityCounts,
      excludedCount: report.hits.length - activeHits.length,
      ai: report.aiSummary,
      scanned: report.scannedUsernames?.length
        ? report.scannedUsernames
        : [report.subjectUsername],
    };
  }, [report, isExcluded, severityFilter]);

  const visual = ampelVisual(derived.security.ampel);

  return (
    <div className="relative isolate">
      <div className="relative z-[1] flex items-start gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 space-y-6 xl:pr-2">
          <SectionReveal delayMs={0} enabled={revealSections}>
            <header
              id="report-overview"
              className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7"
            >
              <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
                USERNAME INTELLIGENCE REPORT · SICHERHEITSBERICHT
              </p>
              <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                Öffentliche Username-Spuren von {report.subjectUsername}
              </h2>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${visual.ring}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${visual.dot}`} />
                  <span className={`text-sm font-semibold ${visual.text}`}>
                    {derived.security.ampelLabel || visual.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/40">
                  {derived.security.ampelDetail}
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {(
                  [
                    ["Gefundene Profile", derived.security.foundProfiles],
                    [
                      "Verknüpfbare Identitäten",
                      derived.security.linkableIdentities,
                    ],
                    [
                      "Öffentliche Plattformen",
                      derived.security.publicPlatforms,
                    ],
                    ["Kritische Treffer", derived.security.criticalHits],
                    [
                      "Mögliche Fehltreffer",
                      derived.security.possibleFalsePositives,
                    ],
                    [
                      "Empfohlene Maßnahmen",
                      derived.security.recommendedActions,
                    ],
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
                Alias: {report.subjectUsername}
                {derived.scanned.length > 1 ? (
                  <>
                    <span className="text-white/15">·</span>
                    {derived.scanned.length} Benutzernamen gescannt
                  </>
                ) : null}
                <span className="text-white/15">·</span>
                Score {derived.overview.identityScore}/100
                <span className="text-white/15">·</span>
                {derived.primary.length} belastbare Treffer
                {derived.excludedCount > 0 ? (
                  <>
                    <span className="text-white/15">·</span>
                    {derived.excludedCount} ignoriert/gelöst (nicht in
                    Statistik)
                  </>
                ) : null}
              </p>
            </header>
          </SectionReveal>

          <SectionReveal delayMs={120} enabled={revealSections}>
            <section
              id="report-summary"
              className="scroll-mt-28 rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.06] to-transparent p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
                ANALYSE-ZUSAMMENFASSUNG
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {derived.overview.headline || report.summary}
              </p>
              {derived.ai ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                    KI-LAGEBILD
                  </p>
                  <div className="mt-2">
                    <AiSummaryWithLinks text={derived.ai} />
                  </div>
                </div>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={200} enabled={revealSections}>
            <section
              id="report-identity"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                IDENTITÄTSBEFUNDE
              </p>
              <h3 className="mt-2 text-lg font-medium text-white/90">
                Was konnte über diesen Benutzernamen herausgefunden werden?
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <FindingChip
                  label="Name gefunden"
                  value={derived.findings.nameFound}
                />
                <FindingChip
                  label="Wohnort gefunden"
                  value={derived.findings.locationFound}
                />
                <FindingChip
                  label="E-Mail gefunden"
                  value={derived.findings.emailFound}
                />
                <FindingChip
                  label="Telefon gefunden"
                  value={derived.findings.phoneFound}
                />
                <FindingChip
                  label="Datingprofil gefunden"
                  value={derived.findings.datingFound}
                />
                <FindingChip
                  label="Gamingprofile"
                  value={derived.findings.gamingCount}
                />
                <FindingChip
                  label="Foren"
                  value={derived.findings.forumCount}
                />
                <FindingChip
                  label="Social Media"
                  value={derived.findings.socialCount}
                />
                <FindingChip
                  label="Entwicklerplattformen"
                  value={derived.findings.developerCount}
                />
                <FindingChip
                  label="öffentliche Kommentare"
                  value={derived.findings.publicComments}
                />
              </div>
              {derived.findings.interests.length > 0 ? (
                <div className="mt-5">
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    INTERESSEN ERKANNT
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {derived.findings.interests.map((interest) => (
                      <li
                        key={interest}
                        className="rounded-full border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-3 py-1 text-xs text-cyber-cyan/85"
                      >
                        {interest}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={280} enabled={revealSections}>
            <section id="report-hits" className="scroll-mt-28 space-y-4">
              <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  TREFFER · GLEICHE AKTIONSKARTEN WIE GOOGLE ANALYSIS
                </p>
                <p className="mt-1 text-sm text-white/40">
                  Original öffnen · Ignorieren · Erledige ich selbst · Als
                  gelöst · SynSight soll das übernehmen · KI erklären · Details
                </p>
              </div>

              <SeverityRiskFilterBar
                value={severityFilter}
                counts={derived.severityCounts}
                onChange={setSeverityFilter}
              />

              {derived.primary.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                  <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                    CLEAR CHANNEL
                  </p>
                  <p className="mt-3 text-sm text-white/50">
                    Keine belastbaren Treffer für diesen Filter. Filter
                    zurücksetzen oder Analyse erneut starten.
                  </p>
                </div>
              ) : (
                <UsernameHitList
                  hits={derived.primary}
                  analysisId={report.analysisId}
                  actionFor={actionFor}
                  onActionChange={onActionChange}
                />
              )}

              {derived.weak.length > 0 && severityFilter === "all" ? (
                <section className="rounded-xl border border-white/[0.07] bg-white/[0.015]">
                  <button
                    type="button"
                    onClick={() => setPossibleOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={possibleOpen}
                  >
                    <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      MÖGLICHE WEITERE TREFFER · {derived.weak.length}
                    </h3>
                    <span className="font-mono text-[10px] text-cyber-cyan/70">
                      {possibleOpen ? "ZUKLAPPEN" : "AUFKLAPPEN"}
                    </span>
                  </button>
                  {possibleOpen ? (
                    <div className="px-4 pb-4">
                      <UsernameHitList
                        hits={derived.weak}
                        analysisId={report.analysisId}
                        actionFor={actionFor}
                        onActionChange={onActionChange}
                      />
                    </div>
                  ) : null}
                </section>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={360} enabled={revealSections}>
            <section
              id="report-actions"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                SYNSIGHT-AUFTRÄGE
              </p>
              <p className="mt-2 text-sm text-white/50">
                „SynSight soll das übernehmen“ auf einer Trefferkarte legt einen
                Auftrag an. Selbsthilfe-Schritte erscheinen unter „Erledige ich
                selbst“. Ignorierte und gelöste Treffer zählen nicht in die
                Statistik.
              </p>
              <a
                href="/dashboard/orders"
                className="mt-4 inline-flex rounded-lg border border-emerald-300/30 bg-emerald-300/[0.08] px-3 py-2 font-mono text-[11px] text-emerald-100/85 transition hover:border-emerald-300/50"
              >
                Meine Aufträge öffnen →
              </a>
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
