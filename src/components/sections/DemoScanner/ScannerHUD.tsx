"use client";

import { useState, useEffect } from "react";
import type { ScanQueries, ModuleStepState } from "./types";
import ScanCodeRain from "./ScanCodeRain";
import ModuleArcGauge from "./ModuleArcGauge";

interface ScannerHUDProps {
  progress: number;
  query: string;
  queries?: ScanQueries;
  moduleSteps?: ModuleStepState[];
  activeStepLabel?: string;
}

export default function ScannerHUD({
  progress,
  query,
  queries,
  moduleSteps = [],
  activeStepLabel,
}: ScannerHUDProps) {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const doneCount = moduleSteps.filter((s) => s.status === "done").length;
  const total = moduleSteps.length || 1;

  return (
    <>
      <style>{`
        @keyframes crtTurnOn {
          0% { transform: scale(0, 0.002); filter: brightness(0); opacity: 0; }
          40% { transform: scale(1, 0.002); filter: brightness(10); opacity: 1; }
          100% { transform: scale(1, 1); filter: brightness(1); opacity: 1; }
        }
        @keyframes hologramFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.78; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      <div
        className={`relative h-full w-full overflow-hidden bg-[#03050a] flex flex-col items-center justify-between font-mono select-none ${isBooting ? "crt-boot" : ""}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,182,246,0.1)_0%,rgba(3,5,10,1)_72%)]" />
        <ScanCodeRain />
        <div
          className="absolute inset-0 z-[2] opacity-[0.05] bg-[linear-gradient(rgba(112,231,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(112,231,255,0.22)_1px,transparent_1px)] bg-[size:60px_60px]"
          style={{
            perspective: "800px",
            transform: "rotateX(60deg) scale(2) translateY(-20%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-50">
          <div
            className="w-full h-px bg-cyber-cyan/25 blur-[0.5px]"
            style={{ animation: "scanline 3.2s linear infinite" }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(3,5,10,0.92)] z-40" />

        {/* Top identity */}
        <div className="relative z-10 w-full px-4 md:px-10 pt-6 md:pt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-cyber-cyan/20 pb-4">
            <div>
              <div className="text-cyber-cyan/70 text-[10px] tracking-[0.35em] uppercase mb-2">
                SynSight · Sequential Module Scan
              </div>
              <div className="text-white text-xl md:text-3xl font-sans font-medium truncate max-w-[90vw]">
                {query || "Unbekannt"}
              </div>
              {queries && Object.keys(queries).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.keys(queries).map((key) => (
                    <span
                      key={key}
                      className="rounded border border-cyber-cyan/25 bg-cyber-cyan/5 px-1.5 py-0.5 text-[9px] tracking-[0.14em] uppercase text-cyber-cyan/70"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="text-left md:text-right">
              <div className="text-cyber-cyan font-semibold text-3xl md:text-4xl tabular-nums">
                {progress}%
              </div>
              <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                {doneCount}/{total} Module ·{" "}
                {activeStepLabel || "Initialisiere"}
              </div>
            </div>
          </div>
        </div>

        {/* Center: module half-circle gauges */}
        <div
          className="relative z-10 w-full max-w-5xl px-3 md:px-8 flex-1 flex items-center"
          style={{ animation: "hologramFlicker 8s infinite" }}
        >
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {moduleSteps.map((step) => (
              <ModuleArcGauge key={step.id} step={step} />
            ))}
          </div>
        </div>

        {/* Bottom progress rail */}
        <div className="relative z-10 w-full px-4 md:px-10 pb-6 md:pb-10">
          <div className="rounded-xl border border-white/[0.08] bg-[#03050a]/90 backdrop-blur-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-cyber-cyan/70 text-[10px] tracking-[0.22em] uppercase">
                Pipeline · der Reihe nach
              </div>
              <div className="text-white/50 text-[10px] tracking-[0.16em] uppercase">
                kein Parallel-Timeout
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] border border-white/[0.06] overflow-hidden rounded-full">
              <div
                className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {moduleSteps.map((step) => (
                <span
                  key={`chip-${step.id}`}
                  className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase ${
                    step.status === "running"
                      ? "border-cyber-cyan/50 text-cyber-cyan"
                      : step.status === "done"
                        ? "border-emerald-400/30 text-emerald-200/80"
                        : step.status === "error"
                          ? "border-rose-400/30 text-rose-200/80"
                          : "border-white/10 text-white/30"
                  }`}
                >
                  {step.label}
                  {step.status === "done" ? ` · ${step.findingCount}` : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
