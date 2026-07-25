"use client";

import { useMemo } from "react";
import type {
  UsernameActionItem,
  UsernameHit,
  UsernameReport,
  UsernameRiskLevel,
} from "@/lib/analysis/username/types";
import {
  buildActionPlan,
  buildManagementOverview,
} from "@/lib/analysis/username/report-metrics";
import { confidenceLabel } from "@/lib/analysis/username/confidence";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";
import InfoTooltip from "@/components/ui/InfoTooltip";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";
import { usernameGuidance } from "@/lib/content/guidance";

const RAIL: SystemRailSection[] = [
  { id: "user-overview", label: "ÜBERBLICK" },
  { id: "user-management", label: "MANAGEMENT" },
  { id: "user-ai", label: "KI-ANALYSE" },
  { id: "user-platforms", label: "PLATTFORMEN" },
  { id: "user-actions", label: "MASSNAHMEN" },
  { id: "user-visual", label: "GAUGES" },
];

function riskTone(level: UsernameRiskLevel): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

function riskLabel(level: UsernameRiskLevel): string {
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

function PlatformCard({ hit }: { hit: UsernameHit }) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070d16]/95">
      <div className="space-y-3 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.08] font-mono text-[11px] text-cyber-cyan">
                {(hit.logoKey || hit.platform).slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-mono text-[9px] tracking-[.14em] text-white/35">
                  {hit.category.toUpperCase()}
                </p>
                <h3 className="text-[15px] font-medium text-white/90">
                  {hit.platform}
                </h3>
              </div>
            </div>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${riskTone(hit.riskLevel)}`}
          >
            RISIKO · {riskLabel(hit.riskLevel)}
          </span>
        </div>

        <p className="text-[12px] leading-relaxed text-white/45">
          {hit.snippet}
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              PROFIL
            </p>
            <p className="mt-1 truncate text-sm text-white/80">
              {hit.profileName ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1">
              <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                CONFIDENCE
              </p>
              <InfoTooltip label="Confidence">
                {usernameGuidance.confidence}
              </InfoTooltip>
            </div>
            <p className="mt-1 text-sm text-white/80">
              {hit.confidence}% · {confidenceLabel(hit.confidence)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1">
              <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                IDENTITY
              </p>
              <InfoTooltip label="Identity Match">
                {usernameGuidance.identityMatch}
              </InfoTooltip>
            </div>
            <p className="mt-1 text-sm text-white/80">{hit.identityScore}%</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              SEIT
            </p>
            <p className="mt-1 text-sm text-white/80">
              {hit.firstSeen ?? "unbekannt"}
            </p>
          </div>
        </div>

        {hit.profileUrl ? (
          <a
            href={hit.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-mono text-[11px] text-cyber-cyan/75 underline-offset-2 hover:underline"
          >
            Direktlink öffnen
          </a>
        ) : null}

        {hit.visibleInfo.length > 0 ? (
          <div>
            <p className="mb-1.5 font-mono text-[8px] tracking-[.12em] text-white/30">
              ÖFFENTLICH SICHTBAR
            </p>
            <ul className="flex flex-wrap gap-2">
              {hit.visibleInfo.slice(0, 6).map((info) => (
                <li
                  key={info}
                  className="max-w-full truncate rounded border border-emerald-400/20 px-2 py-0.5 font-mono text-[9px] text-emerald-100/75"
                >
                  {info}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hit.problemTags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {hit.problemTags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-rose-400/25 px-2 py-0.5 font-mono text-[9px] text-rose-100/80"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function ActionCard({ action }: { action: UsernameActionItem }) {
  const tone =
    action.priority === "SOFORT"
      ? "border-rose-400/30 text-rose-100/85"
      : action.priority === "HOCH"
        ? "border-amber-300/30 text-amber-100/85"
        : action.priority === "MITTEL"
          ? "border-cyber-cyan/30 text-cyber-cyan/85"
          : "border-white/15 text-white/55";

  return (
    <article className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 font-mono text-[9px] tracking-[.12em] ${tone}`}
        >
          {action.priority}
        </span>
        <h3 className="text-sm font-medium text-white/88">{action.title}</h3>
      </div>
      <dl className="mt-3 grid gap-2 text-[12px] text-white/50 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            WARUM
          </dt>
          <dd className="mt-0.5">{action.why}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            RISIKO
          </dt>
          <dd className="mt-0.5">{action.riskReduced}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            WIE BEHEBEN
          </dt>
          <dd className="mt-0.5">{action.how}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] tracking-[.1em] text-white/25">
            ZEIT · SCHWIERIGKEIT · NUTZEN
          </dt>
          <dd className="mt-0.5">
            {action.effort} · {action.difficulty} · {action.benefit}
          </dd>
        </div>
      </dl>
      {action.relatedPlatform ? (
        <p className="mt-2 font-mono text-[10px] text-cyber-cyan/55">
          Plattform · {action.relatedPlatform}
        </p>
      ) : null}
    </article>
  );
}

export default function UsernameIntelligenceReportView({
  report,
  revealSections = true,
}: {
  report: UsernameReport;
  revealSections?: boolean;
}) {
  const derived = useMemo(() => {
    const overview =
      report.managementOverview ??
      buildManagementOverview({
        username: report.subjectUsername,
        hits: report.hits,
        identityScore: report.identityScore,
        riskScore: report.riskScore,
        confidence: report.confidence,
      });
    const actions = report.actions?.length
      ? report.actions
      : buildActionPlan(report.hits, overview);
    return { overview, actions, ai: report.aiSummary };
  }, [report]);

  const { overview, actions, ai } = derived;

  return (
    <div className="relative isolate">
      <div className="relative z-[1] flex items-start gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 space-y-6 xl:pr-2">
          <SectionReveal delayMs={0} enabled={revealSections}>
            <header
              id="user-overview"
              className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-cyber-cyan/25 bg-gradient-to-br from-cyber-cyan/[0.08] via-[#071018] to-transparent p-5 md:p-7"
            >
              <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
                USERNAME INTELLIGENCE REPORT · IDENTITY
              </p>
              <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                Digitale Spuren von @{report.subjectUsername}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">
                {overview.headline}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Gesamtrisiko",
                    value: overview.overallRiskLabel,
                    info: usernameGuidance.risk,
                  },
                  {
                    label: "Identity Score",
                    value: `${overview.identityScore}%`,
                    info: usernameGuidance.identityMatch,
                  },
                  {
                    label: "Threat Level",
                    value: overview.threatLevel,
                    info: usernameGuidance.threat,
                  },
                  {
                    label: "Confidence",
                    value: `${overview.confidence}%`,
                    info: usernameGuidance.confidence,
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
              id="user-management"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  MANAGEMENT SUMMARY
                </p>
                <InfoTooltip label="Username Intelligence">
                  {usernameGuidance.osint}
                </InfoTooltip>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Plattformen", value: overview.platformCount },
                  { label: "Treffer", value: overview.hitCount },
                  {
                    label: "Problematisch",
                    value: overview.problematicCount,
                  },
                  {
                    label: "Einzigartig",
                    value: overview.uniqueUsername ? "ja" : "offen",
                  },
                  { label: "Queries", value: report.queryCount },
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
              {overview.topCategories.length > 0 ? (
                <div className="mt-4">
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    KATEGORIEN
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {overview.topCategories.map((cat) => (
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
              id="user-ai"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#070b12]/70 p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                KI-LAGEBILD · DIGITAL IDENTITY ANALYST
              </p>
              {ai ? (
                <div className="mt-4">
                  <AiSummaryWithLinks text={ai} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/45">
                  Keine KI-Zusammenfassung verfügbar. Die Plattformkarten
                  basieren ausschließlich auf SerpAPI-Treffern.
                </p>
              )}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={200} enabled={revealSections}>
            <section id="user-platforms" className="scroll-mt-28 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                    PLATTFORMKARTEN
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {report.hits.length} Treffer · Confidence ≥ 60 %
                  </p>
                </div>
                <InfoTooltip label="Exposure">
                  {usernameGuidance.exposure}
                </InfoTooltip>
              </div>
              {report.hits.length === 0 ? (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-5 text-sm text-emerald-100/75">
                  Keine belastbaren öffentlichen Username-Treffer gefunden.
                </p>
              ) : (
                report.hits.map((hit) => (
                  <PlatformCard key={hit.id} hit={hit} />
                ))
              )}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={260} enabled={revealSections}>
            <section id="user-actions" className="scroll-mt-28 space-y-3">
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
            id="user-visual"
            className="scroll-mt-28 space-y-3 rounded-2xl border border-white/[0.08] bg-[#060d16] p-4"
          >
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
              SOC HUD · IDENTITY GAUGES
            </p>
            <div className="grid grid-cols-2 gap-2">
              <GaugeRing
                value={overview.identityScore}
                label="IDENTITY"
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
                  {usernameGuidance.threat}
                </InfoTooltip>
              </div>
              <p className="mt-1 text-lg font-semibold">
                {overview.threatLevel}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="mb-3 font-mono text-[8px] tracking-[.12em] text-white/30">
                IDENTITY GRAPH
              </p>
              <ul className="space-y-1.5">
                {report.identityGraph.nodes.slice(0, 8).map((node) => (
                  <li
                    key={node.id}
                    className="flex items-center justify-between gap-2 font-mono text-[9px] text-white/45"
                  >
                    <span className="truncate">{node.label}</span>
                    <span className="shrink-0 text-white/30">{node.kind}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                HEATMAP
              </p>
              <ul className="mt-2 space-y-1.5">
                {report.heatmap.slice(0, 6).map((cell) => (
                  <li key={cell.category} className="space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-white/45">
                      <span>{cell.category}</span>
                      <span>{cell.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-white/[0.06]">
                      <div
                        className="h-full bg-cyber-cyan/60"
                        style={{ width: `${cell.intensity}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                TIMELINE
              </p>
              <ul className="mt-2 space-y-1.5">
                {report.timeline.slice(0, 6).map((item, i) => (
                  <li
                    key={`${item.label}-${i}`}
                    className="flex items-center justify-between gap-2 font-mono text-[9px] text-white/45"
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 text-white/30">
                      {item.detail}
                    </span>
                  </li>
                ))}
                {report.timeline.length === 0 ? (
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
