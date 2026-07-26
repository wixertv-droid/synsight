"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalysisSource } from "@/types/platform";
import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";

const CX = 300;
const CY = 168;

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

type RiskZone = "safe" | "watch" | "critical" | "idle";

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
  return "critical";
}

function zoneColor(zone: RiskZone): string {
  if (zone === "safe") return "#34d399";
  if (zone === "watch") return "#fbbf24";
  if (zone === "critical") return "#f43f5e";
  return "rgba(112,231,255,.35)";
}

/** Map 0–100 risk → radius inside the three rings. */
function riskToRadius(risk: number): number {
  if (risk <= 0) return 18;
  const t = clamp(risk / 100, 0, 1);
  // Ease toward outer rings so medium stays readable in yellow
  const eased = t ** 0.92;
  return 28 + eased * (RISK_RINGS[2].r - 10);
}

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
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
  const pos = polar(angleDeg, radius + 22);
  let anchor: "start" | "middle" | "end" = "middle";
  if (angleDeg > -60 && angleDeg < 60) anchor = "start";
  else if (angleDeg > 120 || angleDeg < -120) anchor = "end";
  return { ...pos, anchor };
}

export default function AnalysisWidget({
  sources,
  signalCount = 0,
  activeModuleCount = 0,
  hasAnyReport = false,
  overallRiskScore = 0,
}: {
  sources: AnalysisSource[];
  signalCount?: number;
  activeModuleCount?: number;
  hasAnyReport?: boolean;
  /** 0–100 aggregated risk (worse = higher). */
  overallRiskScore?: number;
}) {
  const [running, setRunning] = useState(true);
  const [cycle, setCycle] = useState(0);
  const [tick, setTick] = useState(0);
  /** 0→1 settle animation for points sliding outward. */
  const [settle, setSettle] = useState(0);

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
            Risiko-Radar · je kritischer, desto weiter außen
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
            className="analysis-field absolute inset-0 opacity-40"
            aria-hidden="true"
          >
            <div
              className={`analysis-scan-line absolute inset-x-0 h-20 ${running ? "block" : "hidden"}`}
            />
          </div>
          <svg
            viewBox="0 0 600 336"
            className="relative z-10 h-full min-h-[285px] w-full"
            aria-label="Risiko-Radar mit drei Zonen"
          >
            <defs>
              <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={hubColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={hubColor} stopOpacity="0" />
              </radialGradient>
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
            </defs>

            {/* Risk rings: green → yellow → red */}
            <g>
              {[...RISK_RINGS].reverse().map((ring) => (
                <circle
                  key={ring.id}
                  cx={CX}
                  cy={CY}
                  r={ring.r}
                  fill={ring.fill}
                  stroke={ring.stroke}
                  strokeWidth="1.4"
                  strokeDasharray={ring.id === "watch" ? "4 6" : undefined}
                />
              ))}
              {/* Soft rotating sweep */}
              {correlationActive ? (
                <path
                  d={`M${CX} ${CY} L${CX} ${CY - RISK_RINGS[2].r}`}
                  stroke="rgba(112,231,255,.18)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.55"
                  transform={`rotate(${(tick * 0.8) % 360} ${CX} ${CY})`}
                  style={{ filter: "blur(6px)" }}
                />
              ) : null}
            </g>

            {/* Zone labels */}
            <g fontFamily="monospace" fontSize="7" letterSpacing="1.4">
              {RISK_RINGS.map((ring) => (
                <text
                  key={`zl-${ring.id}`}
                  x={CX + 6}
                  y={CY - ring.r + 11}
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

            {/* Channel risk points — slide outward with settle */}
            <g filter="url(#point-glow)">
              {channels.map((ch) => {
                const r = 16 + (ch.targetR - 16) * settle;
                const pos = polar(ch.angle, r);
                const color = zoneColor(ch.active ? ch.zone : "idle");
                const core = ch.active ? 4.2 + ch.risk / 45 : 2.4;
                return (
                  <g key={`pt-${ch.label}`}>
                    {ch.active ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={core + 10}
                        fill={color}
                        opacity={0.12}
                      />
                    ) : null}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={core + 5}
                      fill="none"
                      stroke={color}
                      strokeOpacity={ch.active ? 0.45 : 0.15}
                      strokeWidth="1.2"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={core}
                      fill={color}
                      opacity={ch.active ? 0.95 : 0.35}
                    />
                  </g>
                );
              })}
            </g>

            {/* Hub */}
            <circle cx={CX} cy={CY} r="38" fill="url(#hub-glow)" />
            <circle
              cx={CX}
              cy={CY}
              r="22"
              fill={hubColor}
              opacity={correlationActive ? 0.22 : 0.1}
            />
            <circle cx={CX} cy={CY} r="6.5" fill={hubColor} />
            <text
              x={CX}
              y={CY + 22}
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
                        {ch.zone === "critical"
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
              <span className="text-rose-300/55">● KRITISCH</span>
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
                Je schlechter der Kanal, desto weiter rutscht der Punkt nach
                außen.
              </InfoTooltip>
            </p>
            <p className="mt-3 text-[10px] leading-relaxed text-white/42">
              {!hasAnyReport
                ? "Noch keine Berichte — starten Sie eine Analyse im Analysecenter."
                : running
                  ? "Signale werden auf dem Risiko-Radar positioniert…"
                  : `${signalCount} Signal(e) · ${activeChannels} Kanäle · Kernlage ${
                      overallZone === "critical"
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
        <p className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
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
    </section>
  );
}
