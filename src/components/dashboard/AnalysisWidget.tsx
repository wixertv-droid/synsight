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

const CX = 300;
const CY = 178;
/** Vertical foreshortening for a 3D disc look. */
const PERSPECTIVE_Y = 0.42;

/** Concentric risk zones — worse results sit further out toward red. */
const RISK_RINGS = [
  {
    id: "safe",
    r: 52,
    stroke: "rgba(52, 211, 153, 0.55)",
    fill: "rgba(52, 211, 153, 0.07)",
    label: "SICHER",
    labelColor: "rgba(52, 211, 153, 0.7)",
  },
  {
    id: "watch",
    r: 96,
    stroke: "rgba(251, 191, 36, 0.5)",
    fill: "rgba(251, 191, 36, 0.055)",
    label: "AUFFÄLLIG",
    labelColor: "rgba(251, 191, 36, 0.7)",
  },
  {
    id: "critical",
    r: 140,
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
  if (risk <= 0) return 18;
  const greenEnd = RISK_RINGS[0].r;
  const yellowEnd = RISK_RINGS[1].r;
  const redEnd = RISK_RINGS[2].r;
  const overflow = 186;
  if (risk < 34) return 22 + (risk / 34) * (greenEnd - 26);
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
  const overallZone = zoneForRisk(overallRiskScore);
  const hubColor = zoneColor(
    correlationActive ? (overallZone === "idle" ? "safe" : overallZone) : "idle"
  );

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
          <p className="mt-1 text-[10px] text-white/22">
            Risiko-Radar · kritische Funde brechen aus dem äußeren Ring
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={running}
          className="flex items-center gap-2 rounded-lg border border-cyber-blue/15 bg-cyber-blue/[0.035] px-3 py-2 font-mono text-[8px] tracking-[.12em] text-cyber-cyan/60 transition-all hover:border-cyber-blue/30 disabled:cursor-default disabled:opacity-60"
        >
          <StatusDot pulse={running} tone={running ? "online" : "idle"} />
          {running ? "KORRELATION LÄUFT" : "NEU KORRELIEREN"}
        </button>
      </div>

      <div className="grid min-h-[405px] md:grid-cols-[1fr_220px]">
        <div className="relative overflow-hidden border-b border-white/[0.06] p-5 md:border-b-0 md:border-r md:p-6">
          <div
            className="analysis-field absolute inset-0 opacity-25"
            aria-hidden="true"
          />
          <RadarNetworkBackdrop />
          <div
            className={`analysis-scan-line pointer-events-none absolute inset-x-0 z-[1] h-20 ${running ? "block" : "hidden"}`}
            aria-hidden="true"
          />
          {/* Soft floor under the 3D disc */}
          <div
            className="pointer-events-none absolute bottom-[18%] left-1/2 z-[1] h-8 w-[72%] -translate-x-1/2 rounded-[100%] bg-cyber-cyan/[0.06] blur-xl"
            aria-hidden="true"
          />
          <svg
            viewBox="-24 -8 648 360"
            className="relative z-10 h-full min-h-[300px] w-full"
            aria-label="Risiko-Radar mit drei Zonen"
            style={{
              filter:
                "drop-shadow(0 18px 28px rgba(0,0,0,0.45)) drop-shadow(0 2px 12px rgba(41,182,246,0.12))",
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

            {/* Zone labels along near rim */}
            <g fontFamily="monospace" fontSize="7" letterSpacing="1.4">
              {RISK_RINGS.map((ring) => (
                <text
                  key={`zl-${ring.id}`}
                  x={CX + 8}
                  y={CY - ring.r * PERSPECTIVE_Y + 10}
                  fill={ring.labelColor}
                >
                  {ring.label}
                </text>
              ))}
            </g>

            {/* Spokes */}
            <g strokeWidth="1" fill="none">
              {channels.map((ch) => {
                const end = polar(ch.angle, RISK_RINGS[2].r);
                return (
                  <path
                    key={`spoke-${ch.label}`}
                    d={`M${CX} ${CY} ${end.x} ${end.y}`}
                    stroke={zoneColor(ch.active ? ch.zone : "idle")}
                    strokeOpacity={ch.active ? 0.28 : 0.08}
                  />
                );
              })}
            </g>

            {/* Packets traveling outward along spokes toward risk position */}
            <g>
              {channels
                .filter((ch) => ch.active)
                .map((ch, idx) => {
                  const packets = Math.max(
                    1,
                    Math.min(5, Math.ceil(ch.risk / 22))
                  );
                  return Array.from({ length: packets }).map((_, i) => {
                    const phase =
                      ((tick / 360) * (0.55 + ch.risk / 140) +
                        i / packets +
                        idx * 0.11) %
                      1;
                    // Travel from hub to target radius (settled)
                    const r = 16 + phase * ch.targetR * settle;
                    const pos = polar(ch.angle, r);
                    return (
                      <circle
                        key={`${ch.label}-pkt-${i}`}
                        cx={pos.x}
                        cy={pos.y}
                        r={1.4 + (i % 2) * 0.55}
                        fill={zoneColor(ch.zone)}
                        opacity={0.45 + (1 - Math.abs(phase - 0.55)) * 0.45}
                      />
                    );
                  });
                })}
            </g>

            {/* Channel risk points — slide outward; extreme breaks past red */}
            <g filter="url(#point-glow)">
              {channels.map((ch) => {
                const r = 16 + (ch.targetR - 16) * settle;
                const pos = polar(ch.angle, r);
                const color = zoneColor(ch.active ? ch.zone : "idle");
                const extreme = ch.zone === "extreme";
                const core = ch.active
                  ? extreme
                    ? 6.2 + ch.risk / 40
                    : 3.6 + ch.risk / 50
                  : 2.4;
                return (
                  <g key={`pt-${ch.label}`}>
                    {ch.active ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={core + (extreme ? 16 : 10)}
                        fill={color}
                        opacity={extreme ? 0.2 : 0.12}
                      />
                    ) : null}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={core + 5}
                      fill="none"
                      stroke={color}
                      strokeOpacity={ch.active ? 0.5 : 0.15}
                      strokeWidth={extreme ? 1.8 : 1.2}
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={core}
                      fill={color}
                      opacity={ch.active ? 0.95 : 0.35}
                    />
                    {extreme ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={core + 9}
                        fill="none"
                        stroke={color}
                        strokeOpacity="0.35"
                        strokeDasharray="2 3"
                      >
                        <animate
                          attributeName="r"
                          values={`${core + 7};${core + 14};${core + 7}`}
                          dur="1.6s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-opacity"
                          values="0.45;0.05;0.45"
                          dur="1.6s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    ) : null}
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

            {/* Channel labels at outer ring */}
            <g fontFamily="monospace" fontSize="8.5" letterSpacing="1.1">
              {channels.map((ch) => {
                const anchor = labelAnchor(ch.angle, RISK_RINGS[2].r);
                return (
                  <g key={`lbl-${ch.label}`}>
                    <text
                      x={anchor.x}
                      y={anchor.y}
                      textAnchor={anchor.anchor}
                      fill={
                        ch.active
                          ? "rgba(255,255,255,.58)"
                          : "rgba(255,255,255,.22)"
                      }
                    >
                      {ch.label.toUpperCase()}
                    </text>
                    {ch.count > 0 ? (
                      <text
                        x={anchor.x}
                        y={anchor.y + 11}
                        textAnchor={anchor.anchor}
                        fill={zoneColor(ch.zone)}
                        fontSize="7.5"
                        opacity="0.85"
                      >
                        {ch.count} ·{" "}
                        {ch.zone === "extreme"
                          ? "EXTREM"
                          : ch.zone === "critical"
                            ? "HOT"
                            : ch.zone === "watch"
                              ? "WARN"
                              : "OK"}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-2 font-mono text-[7px] tracking-[.12em] text-white/18 md:left-6 md:right-6">
            <span>
              SIGNALS / {String(Math.min(999, signalCount)).padStart(3, "0")}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-300/50">● SICHER</span>
              <span className="text-amber-300/50">● AUFFÄLLIG</span>
              <span className="text-rose-300/55">● KRITISCH+</span>
            </span>
            <span>
              CORRELATION / {correlationActive ? "ACTIVE" : "STANDBY"}
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
              <InfoTooltip label="Risiko-Radar">
                Grüne Zone = geringes Risiko. Gelb = auffällig. Rot = kritisch.
                Extreme Funde brechen aus dem äußeren Ring. Ignorierte oder als
                erledigt markierte Treffer zählen nicht mehr — der Punkt wandert
                zurück Richtung Grün.
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            ANALYSE STARTEN
            <InfoTooltip label="Analysecenter">
              {guidance.dashboard.analysisCenter}
            </InfoTooltip>
          </p>
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center gap-2 rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-4 py-2.5 text-xs text-cyber-cyan/80 transition hover:border-cyber-blue/35 hover:text-cyber-cyan"
          >
            Zum Analysecenter
            {activeModuleCount > 0 ? (
              <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
                {activeModuleCount} MODULE
              </span>
            ) : null}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-5 min-h-[120px] rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[8px] tracking-[.14em] text-amber-200/45">
              1. LAGEBILD · BEDROHUNGEN &amp; SCHUTZMASSNAHMEN
            </p>
            <Link
              href="/dashboard/threats"
              className="font-mono text-[8px] tracking-[.12em] text-white/30 transition hover:text-cyber-cyan/70"
            >
              VOLLSTÄNDIG →
            </Link>
          </div>
          {lagebildParagraph ? (
            <div className="mt-3 line-clamp-6 [&_div]:text-[13px] [&_div]:leading-relaxed [&_div]:text-white/55">
              <AiSummaryWithLinks text={lagebildParagraph} />
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/35">
              Noch kein Lagebild. Nach der ersten Analyse erscheint hier der
              erste Absatz aus Bedrohungen &amp; Schutzmaßnahmen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
