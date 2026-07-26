"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisSource } from "@/types/platform";
import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";
import RadarNetworkBackdrop from "@/components/dashboard/RadarNetworkBackdrop";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";
import { guidance } from "@/lib/content/guidance";

const CX = 320;
const CY = 200;
/** Vertical foreshortening for a 3D disc look. */
const PERSPECTIVE_Y = 0.42;

/** Concentric risk zones — worse results sit further out toward red. */
const RISK_RINGS = [
  {
    id: "safe",
    r: 82,
    stroke: "rgba(52, 211, 153, 0.55)",
    fill: "rgba(52, 211, 153, 0.07)",
    label: "SICHER",
    labelColor: "rgba(52, 211, 153, 0.7)",
  },
  {
    id: "watch",
    r: 148,
    stroke: "rgba(251, 191, 36, 0.5)",
    fill: "rgba(251, 191, 36, 0.055)",
    label: "AUFFÄLLIG",
    labelColor: "rgba(251, 191, 36, 0.7)",
  },
  {
    id: "critical",
    r: 214,
    stroke: "rgba(244, 63, 94, 0.5)",
    fill: "rgba(244, 63, 94, 0.055)",
    label: "KRITISCH",
    labelColor: "rgba(244, 63, 94, 0.72)",
  },
] as const;

/** Fixed angular channels (degrees, 0 = east, -90 = north). */
const CHANNEL_ANGLES: Record<string, number> = {
  Datenquellen: -90,
  Profile: -145,
  Erwähnungen: -35,
  Webseiten: 145,
  Leaks: 35,
  Usernames: 90,
};

const CHANNEL_ORDER = [
  "Datenquellen",
  "Profile",
  "Erwähnungen",
  "Webseiten",
  "Leaks",
  "Usernames",
] as const;

type RiskZone = "safe" | "watch" | "critical" | "extreme" | "idle";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sourceForLabel(
  sources: AnalysisSource[],
  label: string
): AnalysisSource | undefined {
  return sources.find((s) => s.label.toLowerCase() === label.toLowerCase());
}

function zoneForRisk(risk: number): RiskZone {
  if (risk <= 0) return "idle";
  if (risk < 34) return "safe";
  if (risk < 67) return "watch";
  if (risk < 85) return "critical";
  return "extreme";
}

function zoneColor(zone: RiskZone): string {
  if (zone === "safe") return "#34d399";
  if (zone === "watch") return "#fbbf24";
  if (zone === "critical") return "#f43f5e";
  if (zone === "extreme") return "#ff6b8a";
  return "rgba(112,231,255,.35)";
}

/**
 * Map 0–100 risk → radius.
 * Extreme risk (>85) breaks past the outer red ring.
 */
function riskToRadius(risk: number): number {
  if (risk <= 0) return 24;
  const greenEnd = RISK_RINGS[0].r;
  const yellowEnd = RISK_RINGS[1].r;
  const redEnd = RISK_RINGS[2].r;
  const overflow = 278;
  if (risk < 34) return 32 + (risk / 34) * (greenEnd - 36);
  if (risk < 67) return greenEnd + ((risk - 34) / 33) * (yellowEnd - greenEnd);
  if (risk < 85) return yellowEnd + ((risk - 67) / 18) * (redEnd - yellowEnd);
  return redEnd + ((risk - 85) / 15) * (overflow - redEnd);
}

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius * PERSPECTIVE_Y,
  };
}

function labelAnchor(
  angleDeg: number,
  radius: number
): {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
} {
  const pos = polar(angleDeg, radius + 28);
  let anchor: "start" | "middle" | "end" = "middle";
  if (angleDeg > -60 && angleDeg < 60) anchor = "start";
  else if (angleDeg > 120 || angleDeg < -120) anchor = "end";
  // Lift labels slightly above the disc rim for readability
  return { x: pos.x, y: pos.y - 6, anchor };
}

export default function AnalysisWidget({
  sources,
  signalCount = 0,
  activeModuleCount = 0,
  hasAnyReport = false,
  overallRiskScore = 0,
  lagebildParagraph = "",
}: {
  sources: AnalysisSource[];
  signalCount?: number;
  activeModuleCount?: number;
  hasAnyReport?: boolean;
  /** 0–100 aggregated risk (worse = higher). */
  overallRiskScore?: number;
  /** First paragraph of Bedrohungen KI-Lagebild. */
  lagebildParagraph?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(true);
  const [cycle, setCycle] = useState(0);
  const [tick, setTick] = useState(0);
  /** 0→1 settle animation for points sliding outward. */
  const [settle, setSettle] = useState(0);

  // After ignore/resolve on analysis pages, refresh KPIs when returning.
  useEffect(() => {
    const onFocus = () => router.refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setRunning(false), 4800);
    return () => window.clearTimeout(timer);
  }, [running, cycle]);

  useEffect(() => {
    setSettle(0);
    let start: number | null = null;
    let raf = 0;
    const duration = running ? 2200 : 900;
    const loop = (ts: number) => {
      if (start == null) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      // ease-out cubic
      setSettle(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cycle, running, sources]);

  useEffect(() => {
    if (!hasAnyReport || signalCount <= 0) return;
    let frame = 0;
    let raf = 0;
    const loop = () => {
      frame += 1;
      if (frame % 2 === 0) setTick((t) => (t + 1) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasAnyReport, signalCount, cycle]);

  const restart = () => {
    setCycle((value) => value + 1);
    setRunning(true);
  };

  const channels = useMemo(() => {
    return CHANNEL_ORDER.map((label) => {
      const source = sourceForLabel(sources, label);
      const risk = clamp(source?.value ?? 0, 0, 100);
      const count = source?.count ?? 0;
      const active = risk > 0 || count > 0;
      const angle = CHANNEL_ANGLES[label] ?? 0;
      const targetR = active ? riskToRadius(risk) : 22;
      const zone = zoneForRisk(risk);
      return {
        label,
        source,
        risk,
        count,
        active,
        angle,
        targetR,
        zone,
      };
    }).filter(
      (ch) =>
        ch.label !== "Usernames" ||
        sources.some((s) => s.label.toLowerCase() === "usernames")
    );
  }, [sources]);

  const activeChannels = channels.filter((c) => c.active).length;
  const correlationActive = hasAnyReport && signalCount > 0;

  /** Worst channel risk + passed score — matches Threat Scope, not inverted security %. */
  const effectiveRiskScore = useMemo(() => {
    const channelMax = channels.reduce(
      (max, ch) => Math.max(max, ch.active ? ch.risk : 0),
      0
    );
    let score = Math.max(overallRiskScore, channelMax);
    // Align frame with briefing wording when KI text is more severe than KPI score.
    const brief = lagebildParagraph.toLowerCase();
    if (
      /kritisch|hohem risiko|hohe[rn]? risiko|extre|alarm/.test(brief) &&
      score < 67
    ) {
      score = Math.max(score, 78);
    } else if (
      /auffällig|mittlerem risiko|mittlere[rn]? risiko|erhöht/.test(brief) &&
      score < 34
    ) {
      score = Math.max(score, 50);
    }
    return clamp(score, 0, 100);
  }, [channels, overallRiskScore, lagebildParagraph]);

  const overallZone = zoneForRisk(effectiveRiskScore);
  const hubColor = zoneColor(
    correlationActive ? (overallZone === "idle" ? "safe" : overallZone) : "idle"
  );

  /** Fit viewBox so outermost markers nearly touch the panel edge. */
  const scopeViewBox = useMemo(() => {
    const maxPointR = Math.max(
      RISK_RINGS[2].r,
      ...channels.map((ch) => (ch.active ? ch.targetR : 0)),
      214
    );
    const labelPad = 28;
    const halfW = maxPointR + labelPad;
    const halfH = maxPointR * PERSPECTIVE_Y + labelPad + 10;
    return {
      x: CX - halfW,
      y: CY - halfH,
      w: halfW * 2,
      h: halfH * 2,
    };
  }, [channels]);

  const briefingTone =
    overallZone === "extreme" || overallZone === "critical"
      ? "critical"
      : overallZone === "watch"
        ? "watch"
        : "safe";

  const hatchColors =
    briefingTone === "critical"
      ? {
          a: "rgba(244,63,94,0.62)",
          b: "rgba(28,12,18,0.94)",
          glow: "rgba(244,63,94,0.14)",
        }
      : briefingTone === "watch"
        ? {
            a: "rgba(251,191,36,0.55)",
            b: "rgba(28,20,8,0.94)",
            glow: "rgba(251,191,36,0.12)",
          }
        : {
            a: "rgba(52,211,153,0.48)",
            b: "rgba(10,22,20,0.94)",
            glow: "rgba(52,211,153,0.1)",
          };

  const sidebarSources = useMemo(() => {
    const ordered = CHANNEL_ORDER.map(
      (label) =>
        sourceForLabel(sources, label) ?? {
          label,
          value: 0,
          status: "ready" as const,
          count: 0,
        }
    ).filter(
      (s) =>
        s.label !== "Usernames" ||
        sources.some((x) => x.label.toLowerCase() === "usernames")
    );
    const known = new Set(CHANNEL_ORDER.map((l) => l.toLowerCase()));
    const extras = sources.filter((s) => !known.has(s.label.toLowerCase()));
    return [...ordered, ...extras];
  }, [sources]);

  return (
    <section
      id="analysis-center"
      className="glass-strong hardware-panel relative min-h-[470px] overflow-hidden rounded-[1.4rem] border border-white/[0.08]"
    >
      <div className="flex min-h-16 items-center justify-between border-b border-white/[0.07] px-5 md:px-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
            KI ANALYSEZENTRUM
            <InfoTooltip label="Analysezentrum">
              {guidance.dashboard.analysisCenter}
            </InfoTooltip>
          </p>
          <p className="mt-1 text-[10px] text-white/28">
            Threat Scope · Kanäle nach Risiko von innen nach außen
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={running}
          className="flex items-center gap-2 rounded-lg border border-cyber-blue/15 bg-cyber-blue/[0.035] px-3 py-2 font-mono text-[8px] tracking-[.12em] text-cyber-cyan/60 transition-all hover:border-cyber-blue/30 disabled:cursor-default disabled:opacity-60"
        >
          <StatusDot pulse={running} tone={running ? "online" : "idle"} />
          {running ? "SCAN LÄUFT" : "SCOPE NEU LADEN"}
        </button>
      </div>

      <div className="grid min-h-[460px] md:grid-cols-[1fr_220px]">
        <div className="relative overflow-hidden border-b border-white/[0.06] p-2 md:border-b-0 md:border-r md:p-3">
          <div
            className="analysis-field absolute inset-0 opacity-20"
            aria-hidden="true"
          />
          <RadarNetworkBackdrop />
          {/* HUD corner brackets */}
          <div
            className="pointer-events-none absolute inset-2 z-[2] border border-cyber-cyan/10"
            aria-hidden="true"
          >
            <span className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-cyber-cyan/50" />
            <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-cyber-cyan/50" />
            <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-cyber-cyan/50" />
            <span className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-cyber-cyan/50" />
          </div>
          <div
            className="pointer-events-none absolute bottom-[10%] left-1/2 z-[1] h-12 w-[78%] -translate-x-1/2 rounded-[100%] bg-cyber-cyan/[0.05] blur-2xl"
            aria-hidden="true"
          />
          <svg
            viewBox={`${scopeViewBox.x} ${scopeViewBox.y} ${scopeViewBox.w} ${scopeViewBox.h}`}
            className="relative z-10 h-full min-h-[400px] w-full md:min-h-[460px]"
            aria-label="Threat Scope Risikoanzeige"
            preserveAspectRatio="xMidYMid meet"
            style={{
              filter:
                "drop-shadow(0 16px 24px rgba(0,0,0,0.4)) drop-shadow(0 2px 10px rgba(41,182,246,0.1))",
            }}
          >
            <defs>
              <radialGradient id="hub-glow" cx="50%" cy="42%" r="58%">
                <stop offset="0%" stopColor={hubColor} stopOpacity="0.55" />
                <stop offset="55%" stopColor={hubColor} stopOpacity="0.14" />
                <stop offset="100%" stopColor={hubColor} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="disc-shade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="45%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
              </linearGradient>
              <filter
                id="point-glow"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="disc-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="160%"
              >
                <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="b" />
                <feOffset dy="14" result="o" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.35" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ground contact shadow */}
            <ellipse
              cx={CX}
              cy={CY + RISK_RINGS[2].r * PERSPECTIVE_Y + 18}
              rx={RISK_RINGS[2].r * 0.92}
              ry={14}
              fill="rgba(0,0,0,0.45)"
              opacity="0.55"
            />

            {/* Risk rings as foreshortened ellipses (3D disc) */}
            <g filter="url(#disc-shadow)">
              {[...RISK_RINGS].reverse().map((ring) => (
                <g key={ring.id}>
                  <ellipse
                    cx={CX}
                    cy={CY}
                    rx={ring.r}
                    ry={ring.r * PERSPECTIVE_Y}
                    fill={ring.fill}
                    stroke={ring.stroke}
                    strokeWidth="1.6"
                    strokeDasharray={ring.id === "watch" ? "4 6" : undefined}
                  />
                  {/* Rim highlight for depth */}
                  <ellipse
                    cx={CX}
                    cy={CY - 1}
                    rx={ring.r}
                    ry={ring.r * PERSPECTIVE_Y}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.7"
                    strokeDasharray={`${Math.PI * ring.r * 0.35} ${Math.PI * ring.r}`}
                    opacity="0.7"
                  />
                </g>
              ))}
              <ellipse
                cx={CX}
                cy={CY}
                rx={RISK_RINGS[2].r}
                ry={RISK_RINGS[2].r * PERSPECTIVE_Y}
                fill="url(#disc-shade)"
                opacity="0.55"
                pointerEvents="none"
              />
              {correlationActive ? (
                <ellipse
                  cx={CX}
                  cy={CY}
                  rx={RISK_RINGS[2].r}
                  ry={RISK_RINGS[2].r * PERSPECTIVE_Y}
                  fill="none"
                  stroke="rgba(112,231,255,.22)"
                  strokeWidth="14"
                  strokeDasharray="40 220"
                  opacity="0.45"
                  transform={`rotate(${(tick * 0.8) % 360} ${CX} ${CY})`}
                  style={{ filter: "blur(5px)" }}
                />
              ) : null}
            </g>

            {/* Thin spokes — only for active channels */}
            <g strokeWidth="1" fill="none">
              {channels
                .filter((ch) => ch.active)
                .map((ch) => {
                  const end = polar(ch.angle, Math.max(ch.targetR, 40));
                  return (
                    <path
                      key={`spoke-${ch.label}`}
                      d={`M${CX} ${CY} ${end.x} ${end.y}`}
                      stroke={zoneColor(ch.zone)}
                      strokeOpacity={0.22}
                    />
                  );
                })}
            </g>

            {/* One marker per channel — clean, no particle clutter */}
            <g filter="url(#point-glow)">
              {channels.map((ch) => {
                const r = 16 + (ch.targetR - 16) * settle;
                const pos = polar(ch.angle, r);
                const color = zoneColor(ch.active ? ch.zone : "idle");
                const extreme = ch.zone === "extreme";
                const core = ch.active ? (extreme ? 5.5 : 4) : 2.2;
                return (
                  <g key={`pt-${ch.label}`}>
                    {ch.active ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={core + (extreme ? 11 : 7)}
                        fill={color}
                        opacity={extreme ? 0.16 : 0.1}
                      />
                    ) : null}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={core}
                      fill={color}
                      opacity={ch.active ? 0.95 : 0.25}
                      stroke="rgba(3,7,14,0.55)"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </g>

            {/* Hub — stacked ellipses for a raised core */}
            <ellipse
              cx={CX}
              cy={CY}
              rx="40"
              ry={40 * PERSPECTIVE_Y}
              fill="url(#hub-glow)"
            />
            <ellipse
              cx={CX}
              cy={CY - 2}
              rx="22"
              ry={22 * PERSPECTIVE_Y}
              fill={hubColor}
              opacity={correlationActive ? 0.28 : 0.12}
            />
            <ellipse
              cx={CX}
              cy={CY - 4}
              rx="7"
              ry={7 * PERSPECTIVE_Y + 2}
              fill={hubColor}
            />
            <text
              x={CX}
              y={CY + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,.4)"
              fontFamily="monospace"
              fontSize="7"
              letterSpacing="1.2"
            >
              CORE
            </text>

            {/* Short channel labels only */}
            <g fontFamily="monospace" fontSize="8" letterSpacing="1">
              {channels.map((ch) => {
                const anchor = labelAnchor(
                  ch.angle,
                  Math.max(ch.active ? ch.targetR : RISK_RINGS[0].r, 48)
                );
                return (
                  <text
                    key={`lbl-${ch.label}`}
                    x={anchor.x}
                    y={anchor.y}
                    textAnchor={anchor.anchor}
                    fill={
                      ch.active
                        ? "rgba(255,255,255,.62)"
                        : "rgba(255,255,255,.2)"
                    }
                  >
                    {ch.label.toUpperCase()}
                  </text>
                );
              })}
            </g>
          </svg>
          <div className="absolute bottom-2 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 font-mono text-[7px] tracking-[.14em] text-white/25 md:left-4 md:right-4">
            <span>
              SCOPE / {correlationActive ? "LIVE" : "STANDBY"} ·{" "}
              {String(Math.min(999, signalCount)).padStart(3, "0")} SIG
            </span>
            <span className="flex items-center gap-3">
              <span className="text-emerald-300/55">INNEN SICHER</span>
              <span className="text-amber-300/55">MITTE WARN</span>
              <span className="text-rose-300/60">AUSSEN KRITISCH</span>
            </span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <p className="font-mono text-[8px] tracking-[.15em] text-white/25">
            QUELLENSTATUS
          </p>
          <div className="mt-5 space-y-4">
            {sidebarSources.map((source) => {
              const zone = zoneForRisk(source.value);
              const barColor =
                zone === "critical"
                  ? "from-rose-500/50 to-rose-300/80"
                  : zone === "watch"
                    ? "from-amber-500/45 to-amber-300/75"
                    : zone === "safe"
                      ? "from-emerald-500/40 to-emerald-300/70"
                      : "from-white/10 to-white/20";
              const displayWidth = running
                ? Math.min(
                    100,
                    Math.max(source.value > 0 ? 10 : 0, source.value * settle)
                  )
                : source.value;
              return (
                <div key={source.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] text-white/42">
                      {source.label}
                      {typeof source.count === "number" && source.count > 0 ? (
                        <span className="ml-1.5 font-mono text-[8px] text-white/22">
                          · {source.count}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="font-mono text-[8px] tabular-nums"
                      style={{ color: zoneColor(zone) }}
                    >
                      {source.value}%
                    </span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className={`h-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                      style={{ width: `${displayWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-7 border-t border-white/[0.06] pt-5">
            <p className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-white/22">
              AKTUELLER PROZESS
              <InfoTooltip label="Threat Scope">
                Innen = sicherer. Nach außen steigt das Risiko. Extreme Funde
                liegen außerhalb des kritischen Rings. Ignorierte oder erledigte
                Treffer zählen nicht mehr.
              </InfoTooltip>
            </p>
            <p className="mt-3 text-[10px] leading-relaxed text-white/42">
              {!hasAnyReport
                ? "Noch keine Berichte — starten Sie eine Analyse im Analysecenter."
                : running
                  ? "Signale werden auf dem Risiko-Radar positioniert…"
                  : `${signalCount} Signal(e) · ${activeChannels} Kanäle · Kernlage ${
                      overallZone === "extreme" || overallZone === "critical"
                        ? "kritisch"
                        : overallZone === "watch"
                          ? "auffällig"
                          : "stabil"
                    }.`}
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.06] p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            ANALYSE STARTEN
            <InfoTooltip label="Analysecenter">
              {guidance.dashboard.analysisCenter}
            </InfoTooltip>
          </p>
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center gap-2 rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.08] px-4 py-2.5 text-xs font-medium text-cyber-cyan transition hover:border-cyber-blue/45"
          >
            Zum Analysecenter
            {activeModuleCount > 0 ? (
              <span className="font-mono text-[8px] tracking-[.12em] text-white/35">
                {activeModuleCount} MODULE
              </span>
            ) : null}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Security frame — muted hazard tape marches counter-clockwise */}
        <div
          className="relative overflow-hidden rounded-xl p-[5px]"
          style={{
            boxShadow: `0 0 0 1px ${hatchColors.a}, 0 0 18px ${hatchColors.glow}, 0 10px 22px rgba(0,0,0,0.35)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-xl bg-[#0a1018]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-0 h-[5px] overflow-hidden opacity-80">
              <div
                className="briefing-hatch-march-x-rev absolute inset-y-0 left-0 h-full"
                style={{
                  width: "calc(100% + 28px)",
                  backgroundImage: `repeating-linear-gradient(-45deg, ${hatchColors.a} 0 7px, ${hatchColors.b} 7px 14px)`,
                }}
              />
            </div>
            <div className="absolute inset-y-0 right-0 w-[5px] overflow-hidden opacity-80">
              <div
                className="briefing-hatch-march-y-rev absolute inset-x-0 top-0 w-full"
                style={{
                  height: "calc(100% + 28px)",
                  backgroundImage: `repeating-linear-gradient(-45deg, ${hatchColors.a} 0 7px, ${hatchColors.b} 7px 14px)`,
                }}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[5px] overflow-hidden opacity-80">
              <div
                className="briefing-hatch-march-x absolute inset-y-0 left-0 h-full"
                style={{
                  width: "calc(100% + 28px)",
                  backgroundImage: `repeating-linear-gradient(-45deg, ${hatchColors.a} 0 7px, ${hatchColors.b} 7px 14px)`,
                }}
              />
            </div>
            <div className="absolute inset-y-0 left-0 w-[5px] overflow-hidden opacity-80">
              <div
                className="briefing-hatch-march-y absolute inset-x-0 top-0 w-full"
                style={{
                  height: "calc(100% + 28px)",
                  backgroundImage: `repeating-linear-gradient(-45deg, ${hatchColors.a} 0 7px, ${hatchColors.b} 7px 14px)`,
                }}
              />
            </div>
          </div>
          <svg
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-55"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 3.5 10 L 3.5 3.5 L 10 3.5 M 90 3.5 L 96.5 3.5 L 96.5 10 M 96.5 90 L 96.5 96.5 L 90 96.5 M 10 96.5 L 3.5 96.5 L 3.5 90"
              fill="none"
              stroke={hatchColors.a}
              strokeWidth="0.7"
              strokeLinecap="square"
            />
          </svg>
          <div className="relative z-10 overflow-hidden rounded-[0.65rem] border border-white/[0.07] bg-[#0d141e]">
            {/* Grid: transparent left → ~80% visible right */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(112,231,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(112,231,255,0.05) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                WebkitMaskImage:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.7) 100%)",
                maskImage:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.7) 100%)",
              }}
              aria-hidden="true"
            />

            <div
              className={`relative z-10 flex items-center justify-between gap-3 border-b px-4 py-2 font-mono text-[9px] tracking-[.18em] ${
                briefingTone === "critical"
                  ? "border-rose-400/15 bg-gradient-to-r from-rose-950/70 via-rose-800/45 to-transparent text-rose-100/90"
                  : briefingTone === "watch"
                    ? "border-amber-300/15 bg-gradient-to-r from-amber-950/65 via-amber-800/40 to-transparent text-amber-100/90"
                    : "border-emerald-300/15 bg-gradient-to-r from-emerald-950/65 via-emerald-800/40 to-transparent text-emerald-100/90"
              }`}
            >
              <span>
                {briefingTone === "critical"
                  ? "⚠ SECURITY ALERT · KRITISCH"
                  : briefingTone === "watch"
                    ? "⚠ SECURITY WATCH · AUFFÄLLIG"
                    : hasAnyReport
                      ? "● SECURITY CLEARANCE · STABIL"
                      : "● SECURITY STANDBY"}
                <span className="ml-2 opacity-70">
                  SCORE {Math.round(effectiveRiskScore)}
                </span>
              </span>
              <Link
                href="/dashboard/threats"
                className={`underline-offset-2 hover:underline ${
                  briefingTone === "watch"
                    ? "text-[#1a1203]/80"
                    : "text-white/90"
                }`}
              >
                DETAILS →
              </Link>
            </div>

            <div className="relative z-10 px-5 py-5 md:px-6 md:py-6">
              <div className="border-b border-white/[0.08] pb-3">
                <p className="font-mono text-[10px] tracking-[.18em] text-cyber-cyan/65">
                  ANALYSE-BRIEFING
                </p>
                <p className="mt-1 text-base font-medium tracking-[-.015em] text-white/92">
                  KI-Zusammenfassung Ihrer Sicherheitslage
                </p>
              </div>

              {lagebildParagraph ? (
                <div className="mt-4 [&_div]:!text-[16px] [&_div]:!leading-[1.7] [&_div]:!text-white/85 md:[&_div]:!text-[17px]">
                  <AiSummaryWithLinks text={lagebildParagraph} />
                </div>
              ) : (
                <p className="mt-4 text-base leading-relaxed text-white/45 md:text-[17px]">
                  Noch kein Analyse-Briefing. Nach der ersten Analyse erscheint
                  hier die KI-Zusammenfassung Ihrer Funde.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-4 border-t border-white/[0.08] pt-3 font-mono text-[9px] tracking-[.12em] text-white/35">
                <span>SIG / {signalCount}</span>
                <span>KANÄLE / {activeChannels}</span>
                <span>
                  KERNEL /{" "}
                  {briefingTone === "critical"
                    ? "ALERT"
                    : briefingTone === "watch"
                      ? "WATCH"
                      : "NOMINAL"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
