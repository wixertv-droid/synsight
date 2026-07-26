"use client";

import { useMemo } from "react";
import type {
  DigitalExposureFinding,
  DigitalExposureReport,
  DigitalExposureRiskLevel,
  DigitalExposureThreatMatrix,
} from "@/lib/analysis/digital-exposure/types";
import {
  buildManagementOverview,
  buildThreatMatrix,
  breachFindings,
  extractAiSummary,
  visibleFindings,
} from "@/lib/analysis/digital-exposure/report-metrics";
import {
  digitalExposureFindingToIntelligenceHit,
  orderTypeForDigitalExposureFinding,
  selfGuideForDigitalExposureFinding,
} from "@/lib/analysis/digital-exposure/to-intelligence-hit";
import { fingerprintForIntelligenceHit } from "@/lib/analysis/hit-action-state";
import { useAnalysisHitActions } from "@/hooks/use-analysis-hit-actions";
import IntelligenceHitCard from "@/components/analysis/intelligence/IntelligenceHitCard";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";
import InfoTooltip from "@/components/ui/InfoTooltip";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";
import { leakGuidance } from "@/lib/content/guidance";

const RAIL: SystemRailSection[] = [
  { id: "report-overview", label: "ÜBERBLICK" },
  { id: "report-summary", label: "ZUSAMMENFASSUNG" },
  { id: "report-management", label: "MANAGEMENT" },
  { id: "report-risk", label: "RISIKO" },
  { id: "report-hits", label: "TREFFER" },
  { id: "report-actions", label: "AUFTRÄGE" },
];

function riskTone(level: DigitalExposureRiskLevel): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

function ThreatMatrixBars({ matrix }: { matrix: DigitalExposureThreatMatrix }) {
  const rows = [
    {
      label: "Credential Stuffing",
      value: matrix.credentialStuffing,
      info: leakGuidance.credentialStuffing,
    },
    {
      label: "Phishing",
      value: matrix.phishing,
      info: leakGuidance.threatLevel,
    },
    { label: "Spam", value: matrix.spam, info: leakGuidance.exposure },
    {
      label: "Social Engineering",
      value: matrix.socialEngineering,
      info: leakGuidance.threatLevel,
    },
    {
      label: "Identitätsdiebstahl",
      value: matrix.identityTheft,
      info: leakGuidance.identityExposure,
    },
    {
      label: "Account-Übernahme",
      value: matrix.accountTakeover,
      info: leakGuidance.credentialStuffing,
    },
    {
      label: "SIM-Swapping",
      value: matrix.simSwapping,
      info: leakGuidance.threatLevel,
    },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[9px] text-white/45">
              {row.label}
              <InfoTooltip label={row.label}>{row.info}</InfoTooltip>
            </span>
            <span className="font-mono text-[9px] text-white/55">
              {row.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-cyan/50 to-rose-300/70 transition-[width] duration-700"
              style={{ width: `${row.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeakHitList({
  findings,
  analysisId,
  actionFor,
  onActionChange,
}: {
  findings: DigitalExposureFinding[];
  analysisId: number;
  actionFor: ReturnType<typeof useAnalysisHitActions>["actionFor"];
  onActionChange: ReturnType<typeof useAnalysisHitActions>["onActionChange"];
}) {
  return (
    <ul className="space-y-3">
      {findings.map((finding) => {
        const intel = digitalExposureFindingToIntelligenceHit(finding);
        const fingerprint = fingerprintForIntelligenceHit(
          "digital_leak_exposure",
          intel
        );
        return (
          <li key={intel.id}>
            <IntelligenceHitCard
              hit={intel}
              analysisId={analysisId}
              sourceModule="digital_leak_exposure"
              orderType={orderTypeForDigitalExposureFinding(finding)}
              selfGuide={selfGuideForDigitalExposureFinding(finding)}
              knownAction={actionFor(fingerprint)}
              onActionChange={onActionChange}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function DigitalExposureReportView({
  report,
  revealSections = true,
}: {
  report: DigitalExposureReport;
  revealSections?: boolean;
}) {
  const { actionFor, onActionChange, isExcluded } = useAnalysisHitActions(
    "digital_leak_exposure"
  );

  const derived = useMemo(() => {
    const allVisible = visibleFindings(report.findings);
    const activeFindings = allVisible.filter((finding) => {
      const intel = digitalExposureFindingToIntelligenceHit(finding);
      return !isExcluded(
        fingerprintForIntelligenceHit("digital_leak_exposure", intel)
      );
    });

    const overview = buildManagementOverview(activeFindings, report.riskScore);
    const matrix = buildThreatMatrix(activeFindings, report.riskScore);
    const ai = report.aiSummary ?? extractAiSummary(report.findings) ?? null;
    const leaks = breachFindings(report.findings);
    const other = allVisible.filter(
      (f) =>
        f.type !== "BREACH" &&
        (f.riskLevel !== "low" || f.type === "PASSWORD_EXPOSURE")
    );
    return {
      overview,
      matrix,
      ai,
      leaks,
      other,
      excludedCount: allVisible.length - activeFindings.length,
    };
  }, [report, isExcluded]);

  const { overview, matrix, ai, leaks, other, excludedCount } = derived;

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
                DIGITAL LEAK & EXPOSURE REPORT · SICHERHEITSBERICHT
              </p>
              <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                Digitale Leak-Spuren von {report.subjectName}
              </h2>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Gesamtrisiko",
                    value: overview.overallRiskLabel,
                    info: leakGuidance.threatLevel,
                  },
                  {
                    label: "Identity Exposure",
                    value: `${overview.identityExposure}%`,
                    info: leakGuidance.identityExposure,
                  },
                  {
                    label: "Threat Level",
                    value: overview.threatLevel,
                    info: leakGuidance.threatLevel,
                  },
                  {
                    label: "Confidence",
                    value: `${overview.confidence}%`,
                    info: leakGuidance.confidence,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3"
                  >
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                        {item.label.toUpperCase()}
                      </p>
                      <InfoTooltip label={item.label}>{item.info}</InfoTooltip>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-cyber-cyan/90">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                {overview.headline}
                {excludedCount > 0 ? (
                  <>
                    <span className="text-white/15">·</span>
                    {excludedCount} ignoriert/gelöst (nicht in Statistik)
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
                {report.summary || overview.headline}
              </p>
              {ai ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                    KI-LAGEBILD · DIGITAL FORENSICS
                  </p>
                  <div className="mt-2">
                    <AiSummaryWithLinks text={ai} />
                  </div>
                </div>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={200} enabled={revealSections}>
            <section
              id="report-management"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  MANAGEMENT SUMMARY
                </p>
                <InfoTooltip label="Leak">{leakGuidance.leak}</InfoTooltip>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Bestätigte Quellen",
                    value: overview.confirmedSources,
                  },
                  {
                    label: "Exponierte Merkmale",
                    value: overview.exposedAttributeCount,
                  },
                  { label: "Geprüfte E-Mails", value: report.emailCount },
                  { label: "Geprüfte Telefone", value: report.phoneCount },
                  { label: "Findings", value: report.findingCount },
                  { label: "Provider", value: report.providerLabel },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
                  >
                    <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                      {item.label.toUpperCase()}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white/80">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              {overview.exposedCategories.length > 0 ? (
                <div className="mt-4">
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    DAVON
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {overview.exposedCategories.map((cat) => (
                      <li
                        key={cat}
                        className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/55"
                      >
                        {cat}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={280} enabled={revealSections}>
            <section
              id="report-risk"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#070b12]/70 p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  RISIKO · THREAT MATRIX
                </p>
                <span
                  className={`rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${riskTone(overview.overallRisk)}`}
                >
                  {overview.overallRiskLabel}
                </span>
              </div>
              <div className="mt-4">
                <ThreatMatrixBars matrix={matrix} />
              </div>
            </section>
          </SectionReveal>

          <SectionReveal delayMs={360} enabled={revealSections}>
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

              {leaks.length === 0 && other.length === 0 ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-8 text-center">
                  <p className="font-mono text-[9px] tracking-[.16em] text-emerald-100/70">
                    CLEAR CHANNEL
                  </p>
                  <p className="mt-3 text-sm text-emerald-100/75">
                    Keine bekannten Datenlecks zu diesem Identifikator gefunden.
                  </p>
                </div>
              ) : (
                <>
                  {leaks.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                        BESTÄTIGTE LEAKS · {leaks.length}
                      </h3>
                      <LeakHitList
                        findings={leaks}
                        analysisId={report.scanId}
                        actionFor={actionFor}
                        onActionChange={onActionChange}
                      />
                    </div>
                  ) : null}
                  {other.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                        WEITERE EXPOSURE-HINWEISE · {other.length}
                      </h3>
                      <LeakHitList
                        findings={other}
                        analysisId={report.scanId}
                        actionFor={actionFor}
                        onActionChange={onActionChange}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={440} enabled={revealSections}>
            <section
              id="report-actions"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                SYNSIGHT-AUFTRÄGE
              </p>
              <p className="mt-2 text-sm text-white/50">
                „SynSight soll das übernehmen“ auf einer Trefferkarte legt einen
                Auftrag an. Ignorierte und gelöste Treffer zählen nicht in die
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
