"use client";

import { useEffect, useMemo, useState } from "react";
import StatusDot from "@/components/ui/StatusDot";
import type { IntelligenceScanStep } from "@/lib/analysis/types";

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
  const [elapsed, setElapsed] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      setTerminalLines([]);
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(ms);
    }, 80);

    return () => window.clearInterval(tick);
  }, [running]);

  const activeIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < steps.length; i += 1) {
      if (elapsed >= steps[i].atMs) index = i;
    }
    return index;
  }, [elapsed, steps]);

  useEffect(() => {
    if (!running) return;
    const visible = steps
      .filter((step) => elapsed >= step.atMs)
      .map((step) => step.terminal);
    setTerminalLines(visible.slice(-8));
  }, [elapsed, running, steps]);

  useEffect(() => {
    if (!running) return;
    const targetMs = Math.max(
      minDurationMs,
      steps.at(-1)?.atMs ?? minDurationMs
    );
    if (elapsed >= targetMs) {
      const timer = window.setTimeout(onComplete, 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [elapsed, minDurationMs, onComplete, running, steps]);

  const progress = Math.min(
    100,
    Math.round(
      (elapsed / Math.max(minDurationMs, steps.at(-1)?.atMs ?? minDurationMs)) *
        100
    )
  );

  if (!running) return null;

  return (
    <section className="glass-strong hardware-panel relative overflow-hidden rounded-[1.4rem] border border-cyber-cyan/25">
      <div
        className="analysis-field pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      >
        <div className="analysis-scan-line absolute inset-x-0 h-24" />
      </div>

      <div className="relative border-b border-white/[0.07] px-5 py-4 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/55">
              OSINT SCAN SEQUENCE
            </p>
            <p className="mt-1 text-sm text-white/70">
              Google Intelligence — {subjectName}
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.12em] text-cyber-cyan/70">
            <StatusDot pulse tone="online" />
            AKTIV
          </div>
        </div>
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/[0.06] p-5 md:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
              PIPELINE STATUS
            </p>
            <p className="font-mono text-[8px] text-cyber-cyan/60">
              {progress}%
            </p>
          </div>

          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-cyber-cyan/30 via-cyber-cyan to-cyan-300/80 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="space-y-2.5">
            {steps.map((step, index) => {
              const state =
                index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "pending";
              return (
                <li
                  key={step.id}
                  className={`rounded-xl border px-3 py-2.5 transition ${
                    state === "active"
                      ? "border-cyber-cyan/35 bg-cyber-cyan/[0.06]"
                      : state === "done"
                        ? "border-emerald-300/15 bg-emerald-300/[0.03]"
                        : "border-white/[0.05] bg-white/[0.01]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[7px] tracking-[.12em] ${
                        state === "active"
                          ? "text-cyber-cyan"
                          : state === "done"
                            ? "text-emerald-200/60"
                            : "text-white/20"
                      }`}
                    >
                      {state === "done"
                        ? "OK"
                        : state === "active"
                          ? "RUN"
                          : "WAIT"}
                    </span>
                    <span className="text-[12px] text-white/70">
                      {step.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative min-h-[280px] bg-[#040a12]/80 p-5 md:p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(112,231,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(112,231,255,0.05) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <p className="relative font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            TERMINAL / SOC
          </p>
          <div className="relative mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed">
            {terminalLines.map((line) => (
              <p key={line} className="text-emerald-100/55">
                <span className="text-cyber-cyan/50">$</span> {line}
              </p>
            ))}
            <p className="text-cyber-cyan/70 animate-pulse">█</p>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            {["QUERIES", "SERP", "RISK"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center"
              >
                <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                  {label}
                </p>
                <p className="mt-1 font-mono text-sm text-cyber-cyan/80">
                  {label === "QUERIES"
                    ? String(Math.min(steps.length, activeIndex + 1)).padStart(
                        2,
                        "0"
                      )
                    : label === "SERP"
                      ? elapsed > 2100
                        ? "PROC"
                        : "—"
                      : elapsed > 8000
                        ? "CALC"
                        : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
