"use client";

import { useEffect, useMemo, useState } from "react";
import StatusDot from "@/components/ui/StatusDot";
import type { IntelligenceScanStep } from "@/lib/analysis/types";

const NOISE_LINES = [
  "> handshake synsight.de · cipher=AES-256-GCM",
  "> route packets via edge_nodes[eu-central]",
  "> entropy_check ok · seed=0x7F3A",
  "> fingerprint identity_vector · dim=128",
  "> anomaly_watch = active",
  "> rate_limit window reset",
  "> cache_purge serp_buffer",
  "> integrity_hash rolling…",
];

export default function IntelligenceScanSequence({
  steps,
  minDurationMs,
  running,
  onComplete,
  subjectName,
}: {
  steps: IntelligenceScanStep[];
  minDurationMs: number;
  running: boolean;
  onComplete: () => void;
  subjectName: string;
}) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const [elapsed, setElapsed] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [packetCount, setPacketCount] = useState(0);
  const [signalStrength, setSignalStrength] = useState(12);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      setTerminalLines([]);
      setPacketCount(0);
      setSignalStrength(12);
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(ms);
      setPacketCount((value) => value + 3 + Math.floor(Math.random() * 9));
      setSignalStrength(40 + Math.floor(Math.random() * 55));
    }, 70);

    return () => window.clearInterval(tick);
  }, [running]);

  const activeIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < safeSteps.length; i += 1) {
      if (elapsed >= safeSteps[i].atMs) index = i;
    }
    return index;
  }, [elapsed, safeSteps]);

  useEffect(() => {
    if (!running) return;
    const visible = safeSteps
      .filter((step) => elapsed >= step.atMs)
      .map((step) => step.terminal);

    const noiseIndex = Math.floor(elapsed / 900) % NOISE_LINES.length;
    const withNoise = [
      ...visible,
      NOISE_LINES[noiseIndex],
      `> telemetry t=${(elapsed / 1000).toFixed(1)}s · subject="${subjectName}"`,
    ];
    setTerminalLines(withNoise.slice(-10));
  }, [elapsed, running, safeSteps, subjectName]);

  useEffect(() => {
    if (!running) return;
    const targetMs = Math.max(
      minDurationMs,
      safeSteps.at(-1)?.atMs ?? minDurationMs
    );
    if (elapsed >= targetMs) {
      const timer = window.setTimeout(onComplete, 450);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [elapsed, minDurationMs, onComplete, running, safeSteps]);

  const targetMs = Math.max(
    minDurationMs,
    safeSteps.at(-1)?.atMs ?? minDurationMs
  );
  const progress = Math.min(100, Math.round((elapsed / targetMs) * 100));
  const radarAngle = (elapsed / 18) % 360;

  if (!running) return null;

  return (
    <section className="glass-strong hardware-panel relative overflow-hidden rounded-[1.4rem] border border-cyber-cyan/30 shadow-[0_0_60px_rgba(41,182,246,0.12)]">
      <div
        className="analysis-field pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      >
        <div className="analysis-scan-line absolute inset-x-0 h-28" />
        <div
          className="absolute inset-x-0 h-16 opacity-40"
          style={{
            top: `${(elapsed / 40) % 100}%`,
            background:
              "linear-gradient(180deg, transparent, rgba(112,231,255,0.15), transparent)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, rgba(112,231,255,0.35), transparent 40%)",
          transform: `rotate(${radarAngle}deg)`,
        }}
        aria-hidden="true"
      />

      <div className="relative border-b border-white/[0.08] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[.2em] text-cyber-cyan/70">
              SYN SIGHT · SOC SCAN SEQUENCE · LIVE
            </p>
            <p className="mt-1 text-base text-white/80 md:text-lg">
              Google Intelligence —{" "}
              <span className="text-cyber-cyan">{subjectName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-3 py-1.5 font-mono text-[9px] tracking-[.14em] text-cyber-cyan">
              SIGNAL {signalStrength}%
            </div>
            <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-emerald-200/80">
              <StatusDot pulse tone="online" />
              CHANNEL OPEN
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-500/40 via-cyber-cyan to-emerald-300/80 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 animate-pulse bg-white/20" />
          </div>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[8px] tracking-[.12em] text-white/35">
          <span>PIPELINE PROGRESS</span>
          <span className="text-cyber-cyan/80">{progress}%</span>
        </div>
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-white/[0.06] p-5 md:p-6 lg:border-b-0 lg:border-r">
          <p className="mb-4 font-mono text-[8px] tracking-[.16em] text-white/35">
            THREAT PIPELINE · NODE GRAPH
          </p>
          <ul className="space-y-2">
            {safeSteps.map((step, index) => {
              const state =
                index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "pending";
              return (
                <li
                  key={step.id}
                  className={`relative overflow-hidden rounded-xl border px-3 py-2.5 transition duration-300 ${
                    state === "active"
                      ? "border-cyber-cyan/50 bg-cyber-cyan/[0.1] shadow-[0_0_24px_rgba(112,231,255,0.12)]"
                      : state === "done"
                        ? "border-emerald-300/20 bg-emerald-300/[0.04]"
                        : "border-white/[0.05] bg-white/[0.01]"
                  }`}
                >
                  {state === "active" ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{
                        left: `${((elapsed / 8) % 120) - 20}%`,
                      }}
                    />
                  ) : null}
                  <div className="relative flex items-center gap-2">
                    <span
                      className={`font-mono text-[7px] tracking-[.14em] ${
                        state === "active"
                          ? "animate-pulse text-cyber-cyan"
                          : state === "done"
                            ? "text-emerald-200/70"
                            : "text-white/20"
                      }`}
                    >
                      {state === "done"
                        ? "OK"
                        : state === "active"
                          ? "RUN"
                          : "WAIT"}
                    </span>
                    <span
                      className={`text-[12px] ${
                        state === "active"
                          ? "font-medium text-white"
                          : "text-white/65"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative min-h-[340px] overflow-hidden bg-[#030912]/90 p-5 md:p-6">
          <div className="intel-cyber-earth opacity-40" aria-hidden="true" />
          <div className="intel-cyber-hex" aria-hidden="true" />
          <div className="intel-cyber-scanlines" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(112,231,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(112,231,255,0.06) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div
            className="pointer-events-none absolute right-4 top-6 h-40 w-40"
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(114,231,255,0.2)"
                strokeWidth="0.5"
                strokeDasharray="1.5 2"
                className="intel-cyber-orbit"
              />
              <circle
                cx="50"
                cy="50"
                r="28"
                fill="none"
                stroke="rgba(114,231,255,0.28)"
                strokeWidth="0.6"
                className="intel-cyber-pulse"
              />
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 34;
                const y = 50 + Math.sin(angle) * 34;
                return (
                  <g key={index}>
                    <line
                      x1="50"
                      y1="50"
                      x2={x}
                      y2={y}
                      stroke="rgba(114,231,255,0.2)"
                      strokeWidth="0.4"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="1.8"
                      fill="#72e7ff"
                      className="intel-cyber-node"
                      style={{ animationDelay: `${index * 0.15}s` }}
                    />
                  </g>
                );
              })}
              <circle cx="50" cy="50" r="2.4" fill="#70E7FF" />
              <path
                d={`M50 50 L${50 + Math.cos((radarAngle * Math.PI) / 180) * 40} ${50 + Math.sin((radarAngle * Math.PI) / 180) * 40}`}
                stroke="rgba(114,231,255,0.55)"
                strokeWidth="0.7"
              />
            </svg>
          </div>

          <p className="relative z-[1] font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
            TERMINAL / CYBER OPS · NASA HUD
          </p>
          <div className="relative z-[1] mt-3 max-h-[210px] space-y-1.5 overflow-hidden font-mono text-[11px] leading-relaxed">
            {terminalLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className={
                  index === terminalLines.length - 1
                    ? "text-cyber-cyan/85"
                    : "text-emerald-100/55"
                }
              >
                <span className="text-cyber-cyan/45">$</span> {line}
              </p>
            ))}
            <p className="animate-pulse text-cyber-cyan/80">█</p>
          </div>

          <div className="relative z-[1] mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "NODES",
                value: String(
                  Math.min(safeSteps.length, activeIndex + 1)
                ).padStart(2, "0"),
              },
              {
                label: "PACKETS",
                value: String(packetCount).padStart(4, "0"),
              },
              {
                label: "SERP",
                value: elapsed > 3400 ? "LIVE" : "SYNC",
              },
              {
                label: "THREAT",
                value: elapsed > 9400 ? "MAP" : "CALC",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center"
              >
                <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-sm text-cyber-cyan/90">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
