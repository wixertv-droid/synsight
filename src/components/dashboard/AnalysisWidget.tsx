"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalysisSource } from "@/types/platform";
import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";

/** Fixed radar node layout — labels must match `AnalysisSource.label`. */
const DIAGRAM_NODES = [
  {
    label: "Datenquellen",
    x: 300,
    y: 38,
    textX: 248,
    textY: 18,
  },
  {
    label: "Profile",
    x: 110,
    y: 70,
    textX: 58,
    textY: 53,
  },
  {
    label: "Erwähnungen",
    x: 485,
    y: 72,
    textX: 448,
    textY: 53,
  },
  {
    label: "Webseiten",
    x: 95,
    y: 245,
    textX: 42,
    textY: 270,
  },
  {
    label: "Leaks",
    x: 500,
    y: 245,
    textX: 478,
    textY: 270,
  },
] as const;

const CX = 300;
const CY = 165;

function sourceForLabel(
  sources: AnalysisSource[],
  label: string
): AnalysisSource | undefined {
  return sources.find((s) => s.label.toLowerCase() === label.toLowerCase());
}

function intensity(source: AnalysisSource | undefined): number {
  if (!source) return 0;
  return Math.max(0, Math.min(100, source.value));
}

export default function AnalysisWidget({
  sources,
  signalCount = 0,
  activeModuleCount = 0,
  hasAnyReport = false,
}: {
  sources: AnalysisSource[];
  signalCount?: number;
  activeModuleCount?: number;
  hasAnyReport?: boolean;
}) {
  const [running, setRunning] = useState(true);
  const [cycle, setCycle] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setRunning(false), 4200);
    return () => window.clearTimeout(timer);
  }, [running, cycle]);

  // Drive particle motion on the correlation spokes
  useEffect(() => {
    if (!hasAnyReport || signalCount <= 0) return;
    let frame = 0;
    let raf = 0;
    const loop = () => {
      frame += 1;
      if (frame % 2 === 0) setTick((t) => (t + 1) % 240);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasAnyReport, signalCount, cycle]);

  const restart = () => {
    setCycle((value) => value + 1);
    setRunning(true);
  };

  const activeChannels = useMemo(
    () => sources.filter((s) => s.value > 0 || (s.count ?? 0) > 0).length,
    [sources]
  );

  const correlationActive = hasAnyReport && signalCount > 0;
  const hubGlow = correlationActive
    ? Math.min(0.35, 0.1 + signalCount / 400)
    : 0.06;

  const nodes = DIAGRAM_NODES.map((node) => {
    const source = sourceForLabel(sources, node.label);
    const value = intensity(source);
    const count = source?.count ?? 0;
    const active = value > 0 || count > 0;
    return { ...node, source, value, count, active };
  });

  // Sidebar: diagram channels first, then remaining sources (e.g. Usernames)
  const sidebarSources = useMemo(() => {
    const diagramLabels = new Set(
      DIAGRAM_NODES.map((n) => n.label.toLowerCase())
    );
    const diagramOrdered = DIAGRAM_NODES.map(
      (n) =>
        sourceForLabel(sources, n.label) ?? {
          label: n.label,
          value: 0,
          status: "ready" as const,
          count: 0,
        }
    );
    const extras = sources.filter(
      (s) => !diagramLabels.has(s.label.toLowerCase())
    );
    return [...diagramOrdered, ...extras];
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
            Live-Korrelation digitaler Signale
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
            className="analysis-field absolute inset-0 opacity-45"
            aria-hidden="true"
          >
            <div
              className={`analysis-scan-line absolute inset-x-0 h-20 ${running ? "block" : "hidden"}`}
            />
          </div>
          <svg
            viewBox="0 0 600 330"
            className="relative z-10 h-full min-h-[285px] w-full"
            aria-label="Visualisierung verbundener Datenquellen"
          >
            <defs>
              <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="#29B6F6"
                  stopOpacity={hubGlow + 0.15}
                />
                <stop offset="100%" stopColor="#29B6F6" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g stroke="rgba(112,231,255,.13)" strokeWidth="1" fill="none">
              {nodes.map((node) => (
                <path
                  key={`spoke-${node.label}`}
                  d={`M${CX} ${CY} ${node.x} ${node.y}`}
                  strokeOpacity={node.active ? 0.35 + node.value / 200 : 0.1}
                  strokeWidth={node.active ? 1.4 : 1}
                />
              ))}
              <circle
                cx={CX}
                cy={CY}
                r="86"
                strokeDasharray="3 8"
                opacity={correlationActive ? 0.7 : 0.35}
              />
              <circle
                cx={CX}
                cy={CY}
                r="130"
                opacity={correlationActive ? 0.5 : 0.25}
              />
            </g>

            {/* Traveling correlation packets along active spokes */}
            <g>
              {nodes
                .filter((n) => n.active)
                .map((node, nodeIndex) => {
                  const packetCount = Math.max(
                    1,
                    Math.min(4, Math.ceil(node.value / 28))
                  );
                  return Array.from({ length: packetCount }).map((_, i) => {
                    const phase =
                      ((tick / 240) * (0.7 + node.value / 120) +
                        i / packetCount +
                        nodeIndex * 0.13) %
                      1;
                    const x = CX + (node.x - CX) * phase;
                    const y = CY + (node.y - CY) * phase;
                    return (
                      <circle
                        key={`${node.label}-p-${i}`}
                        cx={x}
                        cy={y}
                        r={1.6 + (i % 2) * 0.6}
                        fill={i % 2 === 0 ? "#70E7FF" : "#ffffff"}
                        opacity={0.55 + (1 - Math.abs(phase - 0.5)) * 0.4}
                      />
                    );
                  });
                })}
            </g>

            <g>
              {nodes.map((node) => {
                const r = node.active ? 3.5 + node.value / 40 : 2.5;
                const ring = node.active ? 10 + node.value / 12 : 8;
                return (
                  <g key={`node-${node.label}`}>
                    {node.active ? (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={ring + 6}
                        fill="#29B6F6"
                        opacity={0.06 + node.value / 800}
                      />
                    ) : null}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r}
                      fill={node.active ? "#70E7FF" : "rgba(112,231,255,.35)"}
                      opacity={node.active ? 0.85 : 0.4}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={ring}
                      fill="none"
                      stroke={
                        node.active
                          ? "rgba(112,231,255,.35)"
                          : "rgba(112,231,255,.12)"
                      }
                      strokeWidth={node.active ? 1.4 : 1}
                    />
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r="42" fill="url(#hub-glow)" />
              <circle cx={CX} cy={CY} r="26" fill="#29B6F6" opacity={hubGlow} />
              <circle cx={CX} cy={CY} r="7" fill="#70E7FF" />
            </g>

            <g
              fill="rgba(255,255,255,.34)"
              fontSize="9"
              fontFamily="monospace"
              letterSpacing="1.2"
            >
              {nodes.map((node) => (
                <g key={`label-${node.label}`}>
                  <text
                    x={node.textX}
                    y={node.textY}
                    fill={
                      node.active
                        ? "rgba(255,255,255,.55)"
                        : "rgba(255,255,255,.22)"
                    }
                  >
                    {node.label.toUpperCase()}
                  </text>
                  {node.count > 0 ? (
                    <text
                      x={node.textX}
                      y={node.textY + 12}
                      fill="rgba(112,231,255,.55)"
                      fontSize="8"
                    >
                      {node.count} SIG
                    </text>
                  ) : null}
                </g>
              ))}
            </g>
          </svg>
          <div className="absolute bottom-5 left-5 right-5 z-20 flex items-center justify-between font-mono text-[7px] tracking-[.12em] text-white/18 md:left-6 md:right-6">
            <span>
              SIGNALS / {String(Math.min(999, signalCount)).padStart(3, "0")}
            </span>
            <span>
              CORRELATION / {correlationActive ? "ACTIVE" : "STANDBY"}
            </span>
            <span>
              CHANNELS / {String(Math.min(99, activeChannels)).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <p className="font-mono text-[8px] tracking-[.15em] text-white/25">
            QUELLENSTATUS
          </p>
          <div className="mt-5 space-y-4">
            {sidebarSources.map((source) => {
              const displayWidth = running
                ? Math.min(100, Math.max(8, source.value * 0.82))
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
                    <span className="font-mono text-[8px] tabular-nums text-cyber-cyan/45">
                      {source.value}%
                    </span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className="h-full bg-gradient-to-r from-cyber-blue/45 to-cyber-cyan/75 transition-all duration-700"
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
              <InfoTooltip label="Analyseprozess">
                SynSight verknüpft gefundene Informationen und zeigt Ihnen,
                welche Bereiche Aufmerksamkeit benötigen.
              </InfoTooltip>
            </p>
            <p className="mt-3 text-[10px] leading-relaxed text-white/42">
              {!hasAnyReport
                ? "Noch keine Berichte — starten Sie eine Analyse im Analysecenter."
                : running
                  ? "Öffentliche Signale werden sicher korreliert und nach Relevanz bewertet."
                  : `${signalCount} Signal(e) über ${activeChannels} Kanäle dem Risikoprofil zugeordnet.`}
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
