"use client";

import { useCallback, useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

type Phase = "initializing" | "online" | "exit";

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState<Phase>("initializing");
  const [progress, setProgress] = useState(1);
  const [showCursor, setShowCursor] = useState(true);

  const fullTextInitializing = "INITIALIZING SYNSIGHT AI CORE";
  const fullTextOnline = "DIGITAL IDENTITY PROTECTION SYSTEM ONLINE";

  const complete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      complete();
      return;
    }

    timers.push(setTimeout(() => setPhase("online"), 2600));
    timers.push(setTimeout(() => setPhase("exit"), 3500));
    timers.push(setTimeout(complete, 4100));

    return () => timers.forEach(clearTimeout);
  }, [complete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.25, 100));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center loading-grid bg-space-black transition-opacity duration-700 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-label="SynSight wird geladen"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/35 to-transparent" />
      <div aria-hidden="true" className="absolute left-0 right-0 top-[18%] hidden items-center justify-between px-8 font-mono text-[8px] tracking-[.2em] text-white/15 md:flex">
        <span>LAUNCH CONTROL / SYNSIGHT</span>
        <span>T−00:04 / SYSTEM START</span>
      </div>

      {/* HUD corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyber-blue/30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyber-blue/30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyber-blue/30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyber-blue/30" />

      {/* Side HUD data */}
      <div aria-hidden="true" className="absolute left-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 font-mono text-[10px] text-cyber-blue/40">
        <span>STATUS: START</span>
        <span>REGION: EU</span>
        <span>KI-ANALYSE: BEREIT</span>
        <span>DATENSCHUTZ: AKTIV</span>
      </div>
      <div aria-hidden="true" className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 font-mono text-[10px] text-cyber-blue/40 text-right">
        <span>VERBINDUNG: GESCHÜTZT</span>
        <span>MODUS: PRIVAT</span>
        <span>NETZWERK: BEREIT</span>
        <span>IDENTITÄT: GESCHÜTZT</span>
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-8 px-6">
        {/* Logo + Scanner */}
        <div className="relative">
          {/* Outer scanner rings */}
          <div className="absolute inset-0 -m-12">
            <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(0,191,255,0.1)"
                strokeWidth="1"
                className="scanner-ring"
              />
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke="rgba(0,255,255,0.15)"
                strokeWidth="0.5"
                strokeDasharray="8 12"
                className="animate-rotate-slow"
                style={{ transformOrigin: "center" }}
              />
              <circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="rgba(0,191,255,0.3)"
                strokeWidth="1"
                strokeDasharray="120 200"
                className="animate-rotate-slow"
                style={{
                  transformOrigin: "center",
                  animationDirection: "reverse",
                  animationDuration: "8s",
                }}
              />
              {/* Data lines radiating */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1="100"
                  y1="100"
                  x2={100 + 85 * Math.cos((angle * Math.PI) / 180)}
                  y2={100 + 85 * Math.sin((angle * Math.PI) / 180)}
                  stroke="rgba(0,191,255,0.2)"
                  strokeWidth="0.5"
                  className="data-line"
                  style={{ animationDelay: `${angle * 10}ms` }}
                />
              ))}
            </svg>
          </div>

          {/* Logo */}
          <div
            className="relative z-10 flex flex-col items-center animate-fade-in"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-cyber-blue/40 flex items-center justify-center glow-border bg-space-panel/80">
              <svg viewBox="0 0 48 48" className="w-12 h-12 md:w-14 md:h-14">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#00BFFF"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <circle cx="24" cy="24" r="8" fill="#00BFFF" opacity="0.8" />
                <circle cx="24" cy="24" r="3" fill="#00FFFF" />
                <line
                  x1="24"
                  y1="4"
                  x2="24"
                  y2="14"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="24"
                  y1="34"
                  x2="24"
                  y2="44"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="4"
                  y1="24"
                  x2="14"
                  y2="24"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="34"
                  y1="24"
                  x2="44"
                  y2="24"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
              </svg>
            </div>
            <p className="mt-4 text-2xl md:text-3xl font-bold tracking-[0.3em] text-white glow-text">
              SYN<span className="text-cyber-blue">SIGHT</span>
            </p>
          </div>
        </div>

        {/* Status text */}
        <div className="h-8 flex items-center">
          {(phase === "initializing" || phase === "online" || phase === "exit") && (
            <p className="font-mono text-xs md:text-sm text-cyber-cyan tracking-widest">
              {phase === "initializing"
                ? fullTextInitializing
                : fullTextOnline}
              <span
                className={`inline-block w-2 ${showCursor ? "opacity-100" : "opacity-0"}`}
              >
                _
              </span>
            </p>
          )}
        </div>

        {/* Launch progress */}
        <div className="w-full max-w-2xl">
          <div className="mb-3 flex items-end justify-between font-mono">
            <span className="text-[9px] tracking-[.18em] text-white/25">
              LAUNCH SEQUENCE
            </span>
            <span className="text-xl font-light tabular-nums text-cyan-100/90">
              {Math.round(progress).toString().padStart(3, "0")}
              <small className="ml-1 text-[9px] text-white/30">%</small>
            </span>
          </div>
          <div className="launch-progress-track relative h-[5px] overflow-visible bg-white/[0.07]">
            <div className="launch-progress-fill absolute inset-y-0 left-0">
              <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cyan-100/80 bg-space-black shadow-[0_0_18px_rgba(112,231,255,.8)]" />
            </div>
            {[25, 50, 75].map((position) => (
              <span
                key={position}
                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/15"
                style={{ left: `${position}%` }}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["CORE", 0],
              ["NETWORK", 25],
              ["IDENTITY", 50],
              ["PROTECTION", 75],
            ].map(([label, threshold]) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                    progress >= Number(threshold)
                      ? "bg-cyber-cyan shadow-[0_0_8px_rgba(112,231,255,.55)]"
                      : "bg-white/10"
                  }`}
                />
                <span
                  className={`font-mono text-[8px] tracking-[.12em] transition-colors duration-500 ${
                    progress >= Number(threshold)
                      ? "text-white/45"
                      : "text-white/15"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[10px] text-cyber-blue/30 tracking-wider">
          {phase === "online"
            ? "ALL SYSTEMS NOMINAL"
            : "SECURE BOOT IN PROGRESS"}
        </p>
      </div>
    </div>
  );
}
