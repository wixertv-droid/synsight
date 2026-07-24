"use client";

import { useMemo } from "react";
import type {
  DigitalExposureActionItem,
  DigitalExposureFinding,
  DigitalExposureReport,
  DigitalExposureRiskLevel,
} from "@/lib/analysis/digital-exposure/types";
import {
  AI_SUMMARY_FINDING_TITLE,
  type DigitalExposureThreatMatrix,
} from "@/lib/analysis/digital-exposure/types";
import {
  buildActionPlan,
  buildManagementOverview,
  buildThreatMatrix,
  breachFindings,
  extractAiSummary,
  visibleFindings,
} from "@/lib/analysis/digital-exposure/report-metrics";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";
import InfoTooltip from "@/components/ui/InfoTooltip";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";
import { leakGuidance } from "@/lib/content/guidance";

const RAIL: SystemRailSection[] = [
  { id: "leak-overview", label: "ÜBERBLICK" },
  { id: "leak-management", label: "MANAGEMENT" },
  { id: "leak-ai", label: "KI-ANALYSE" },
  { id: "leak-sources", label: "LEAKS" },
  { id: "leak-actions", label: "MASSNAHMEN" },
  { id: "leak-visual", label: "GAUGES" },
];

function riskTone(level: DigitalExposureRiskLevel): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

function riskLabel(level: DigitalExposureRiskLevel): string {
  if (level === "high") return "HOCH";
  if (level === "medium") return "MITTEL";
  return "NIEDRIG";
}

function GaugeRing({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/[0.07] bg-black/25 px-3 py-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          className={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <p className="-mt-16 text-xl font-semibold text-white/90">{value}</p>
      <p className="mt-10 font-mono text-[8px] tracking-[.12em] text-white/35">
        {label}
      </p>
    </div>
  );
}

function LeakCard({ finding }: { finding: DigitalExposureFinding }) {
  const attrs =
    finding.attributes?.filter((a) => a.present) ??
    finding.dataClasses.map((label) => ({
      key: label,
      label,
      present: true,
      maskedValue: null as string | null,
    }));

  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070d16]/95">
      <div className="space-y-3 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.08] font-mono text-[11px] text-cyber-cyan">
                {(finding.sourceName ?? finding.title)
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <p className="font-mono text-[9px] tracking-[.14em] text-white/35">
                  {finding.type === "BREACH" ? "LEAK SOURCE" : finding.type}
                </p>
                <h3 className="text-[15px] font-medium text-white/90">
                  {finding.title}
                </h3>
              </div>
            </div>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${riskTone(finding.riskLevel)}`}
          >
            RISIKO · {riskLabel(finding.riskLevel)}
          </span>
        </div>

        <p className="text-[12px] leading-relaxed text-white/45">
          {finding.description}
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              CONFIDENCE
            </p>
            <p className="mt-1 text-sm text-white/80">
              {finding.confidence ?? 90}%
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              DATENSÄTZE
            </p>
            <p className="mt-1 text-sm text-white/80">
              {finding.recordCount ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              LEAK-DATUM
            </p>
            <p className="mt-1 text-sm text-white/80">
              {finding.sourceDate ?? finding.firstSeen ?? "unbekannt"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              COLLECTION
            </p>
            <p className="mt-1 truncate text-sm text-white/80">
              {finding.collection ?? finding.sourceName ?? "—"}
            </p>
          </div>
        </div>

        {finding.identifierMasked ? (
          <p className="font-mono text-[11px] text-cyber-cyan/70">
            Identifikator · {finding.identifierMasked}
          </p>
        ) : null}

        {attrs.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                GEFUNDENE MERKMALE
              </p>
              <InfoTooltip label="Exposure">
                {leakGuidance.exposure}
              </InfoTooltip>
            </div>
            <ul className="flex flex-wrap gap-2">
              {attrs.map((attr) => (
                <li
                  key={`${attr.key}-${attr.label}`}
                  className="rounded border border-emerald-400/20 px-2 py-0.5 font-mono text-[9px] text-emerald-100/75"
                >
                  ✓ {attr.label}
                  {attr.maskedValue ? ` · ${attr.maskedValue}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/35">
          <span>Quelle · {finding.sourceName || "DeHashed"}</span>
          {finding.hashType ? (
            <>
              <span className="text-white/15">·</span>
              <span className="inline-flex items-center gap-1">
                Hashtyp · {finding.hashType}
                <InfoTooltip label="Password Hash">
                  {leakGuidance.passwordHash}
                </InfoTooltip>
              </span>
            </>
          ) : null}
          {finding.lastSeen ? (
            <>
              <span className="text-white/15">·</span>
              <span>Letzter Fund · {finding.lastSeen}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {finding.sourceUrl ? (
            <a
              href={finding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-3 py-1.5 text-[11px] text-cyber-cyan"
            >
              Original öffnen
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
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

function ActionCard({ action }: { action: DigitalExposureActionItem }) {
  const tone =
    action.priority === "SOFORT"
      ? "border-rose-400/30 text-rose-100/85"
      : action.priority === "HOCH"
        ? "border-amber-300/30 text-amber-100/85"
        : action.priority === "MITTEL"
          ? "border-sky-300/25 text-sky-100/80"
          : "border-white/15 text-white/55";

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#070b12]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-white/88">{action.title}</h4>
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[8px] tracking-[.12em] ${tone}`}
        >
          {action.priority}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-[12px] text-white/55 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            WARUM
          </dt>
          <dd className="mt-0.5">{action.why}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            RISIKO REDUZIERT
          </dt>
          <dd className="mt-0.5">{action.riskReduced}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            UMSETZUNG
          </dt>
          <dd className="mt-0.5">{action.how}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            ZEIT / SCHWIERIGKEIT
          </dt>
          <dd className="mt-0.5">
            {action.effort} · {action.difficulty}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            NUTZEN
          </dt>
          <dd className="mt-0.5">{action.benefit}</dd>
        </div>
      </dl>
      {action.relatedSource ? (
        <p className="mt-2 font-mono text-[10px] text-cyber-cyan/55">
          Quelle · {action.relatedSource}
        </p>
      ) : null}
    </article>
  );
}

export default function DigitalExposureReportView({
  report,
  revealSections = true,
}: {
  report: DigitalExposureReport;
  revealSections?: boolean;
}) {
  const derived = useMemo(() => {
    const overview =
      report.managementOverview ??
      buildManagementOverview(report.findings, report.riskScore);
    const matrix =
      report.threatMatrix ??
      buildThreatMatrix(report.findings, report.riskScore);
    const actions =
      report.actions ?? buildActionPlan(report.findings, overview);
    const ai = report.aiSummary ?? extractAiSummary(report.findings) ?? null;
    const leaks = breachFindings(report.findings);
    const other = visibleFindings(report.findings).filter(
      (f) => f.type !== "BREACH" && f.title !== AI_SUMMARY_FINDING_TITLE
    );
    return { overview, matrix, actions, ai, leaks, other };
  }, [report]);

  const { overview, matrix, actions, ai, leaks, other } = derived;

  return (
    <div className="relative isolate">
      <div className="relative z-[1] flex items-start gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 space-y-6 xl:pr-2">
          <SectionReveal delayMs={0} enabled={revealSections}>
            <header
              id="leak-overview"
              className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7"
            >
              <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
                DIGITAL LEAK & EXPOSURE REPORT · SECURITY
              </p>
              <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                Digitale Leak-Spuren von {report.subjectName}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">
                {overview.headline}
              </p>
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
            </header>
          </SectionReveal>

          <SectionReveal delayMs={80} enabled={revealSections}>
            <section
              id="leak-management"
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
                  {
                    label: "Geprüfte E-Mails",
                    value: report.emailCount,
                  },
                  {
                    label: "Geprüfte Telefone",
                    value: report.phoneCount,
                  },
                  {
                    label: "Findings",
                    value: report.findingCount,
                  },
                  {
                    label: "Provider",
                    value: report.providerLabel,
                  },
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

          <SectionReveal delayMs={140} enabled={revealSections}>
            <section
              id="leak-ai"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#070b12]/70 p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                KI-LAGEBILD · DIGITAL FORENSICS ANALYST
              </p>
              {ai ? (
                <div className="mt-4">
                  <AiSummaryWithLinks text={ai} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/45">
                  Keine KI-Zusammenfassung verfügbar. Die Management Summary und
                  Leak-Karten basieren ausschließlich auf DeHashed-Metadaten.
                </p>
              )}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={200} enabled={revealSections}>
            <section id="leak-sources" className="scroll-mt-28 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                    LEAK DETAILSEITEN
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {leaks.length} bestätigte Quelle(n) · nur API-Metadaten
                  </p>
                </div>
                <InfoTooltip label="Collection">
                  {leakGuidance.collection}
                </InfoTooltip>
              </div>
              {leaks.length === 0 ? (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-5 text-sm text-emerald-100/75">
                  Keine bekannten Datenlecks zu diesem Identifikator gefunden.
                </p>
              ) : (
                leaks.map((finding, index) => (
                  <LeakCard
                    key={`${finding.sourceName}-${index}`}
                    finding={finding}
                  />
                ))
              )}
              {other
                .filter(
                  (f) => f.riskLevel !== "low" || f.type === "PASSWORD_EXPOSURE"
                )
                .map((finding, index) => (
                  <LeakCard
                    key={`${finding.type}-${index}`}
                    finding={finding}
                  />
                ))}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={260} enabled={revealSections}>
            <section id="leak-actions" className="scroll-mt-28 space-y-3">
              <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                MASSNAHMENPLAN
              </p>
              {actions.map((action) => (
                <ActionCard
                  key={`${action.priority}-${action.title}`}
                  action={action}
                />
              ))}
            </section>
          </SectionReveal>
        </div>

        <aside className="sticky top-24 hidden w-[300px] shrink-0 space-y-4 xl:block">
          <SystemRail sections={RAIL} />
          <div
            id="leak-visual"
            className="scroll-mt-28 space-y-3 rounded-2xl border border-white/[0.08] bg-[#060d16] p-4"
          >
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
              SOC HUD · EXPOSURE GAUGES
            </p>
            <div className="grid grid-cols-2 gap-2">
              <GaugeRing
                value={overview.identityExposure}
                label="EXPOSURE"
                tone="stroke-rose-300/80"
              />
              <GaugeRing
                value={overview.confidence}
                label="CONFIDENCE"
                tone="stroke-cyber-cyan"
              />
            </div>
            <div
              className={`rounded-xl border px-3 py-3 ${riskTone(overview.overallRisk)}`}
            >
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-[7px] tracking-[.1em] opacity-70">
                  THREAT LEVEL
                </p>
                <InfoTooltip label="Threat Level">
                  {leakGuidance.threatLevel}
                </InfoTooltip>
              </div>
              <p className="mt-1 text-lg font-semibold">
                {overview.threatLevel}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="mb-3 font-mono text-[8px] tracking-[.12em] text-white/30">
                THREAT MATRIX
              </p>
              <ThreatMatrixBars matrix={matrix} />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                LEAK TIMELINE
              </p>
              <ul className="mt-2 space-y-1.5">
                {leaks.slice(0, 6).map((leak, i) => (
                  <li
                    key={`${leak.title}-tl-${i}`}
                    className="flex items-center justify-between gap-2 font-mono text-[9px] text-white/45"
                  >
                    <span className="truncate">{leak.sourceName}</span>
                    <span className="shrink-0 text-white/30">
                      {leak.sourceDate ?? leak.firstSeen ?? "n/a"}
                    </span>
                  </li>
                ))}
                {leaks.length === 0 ? (
                  <li className="text-[10px] text-white/30">Keine Events</li>
                ) : null}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
