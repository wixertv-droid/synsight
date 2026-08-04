"use client";

import { useState, useEffect } from "react";
import type { ScanQueries, ModuleStepState } from "./types";
import ScanCodeRain from "./ScanCodeRain";

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

  // Filtern oder Zuordnen der 3 Kernfelder (Email, Username, Phone) aus den Queries oder Modulen
  const emailStep = moduleSteps.find((s) => s.field === "email" || s.module === "holehe");
  const usernameStep = moduleSteps.find((s) => s.field === "username" || s.module === "maigret" || s.module === "sherlock");
  const phoneStep = moduleSteps.find((s) => s.field === "phone" || s.module === "phoneinfoga");

  const isComplete = progress >= 100;

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
          20%, 22%, 24%, 55% { opacity: 0.85; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      <div
        className={`relative h-full w-full overflow-hidden bg-[#03050a] flex flex-col justify-between font-mono select-none ${isBooting ? "crt-boot" : ""}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,182,246,0.12)_0%,rgba(3,5,10,1)_75%)]" />
        <ScanCodeRain />
        
        {/* Holographisches Cyber-Grid */}
        <div
          className="absolute inset-0 z-[2] opacity-[0.04] bg-[linear-gradient(rgba(112,231,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(112,231,255,0.25)_1px,transparent_1px)] bg-[size:50px_50px]"
          style={{
            perspective: "900px",
            transform: "rotateX(65deg) scale(2.2) translateY(-15%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-50">
          <div
            className="w-full h-px bg-cyber-cyan/30 blur-[0.5px]"
            style={{ animation: "scanline 3s linear infinite" }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_180px_rgba(3,5,10,0.95)] z-40" />

        {/* Top Header */}
        <div className="relative z-10 w-full px-6 md:px-12 pt-6">
          <div className="flex items-center justify-between border-b border-cyber-cyan/20 pb-4">
            <div>
              <div className="text-cyber-cyan/70 text-[11px] tracking-[0.4em] uppercase mb-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
                JARVIS OSINT TACTICAL HUD // ACTIVE SCAN
              </div>
              <div className="text-white text-xl md:text-2xl font-sans font-semibold tracking-tight truncate max-w-[60vw]">
                {query || "Multitarget Analysis"}
              </div>
            </div>
            <div className="font-mono text-xs text-cyber-cyan/80 tracking-widest uppercase border border-cyber-cyan/30 px-3 py-1 rounded bg-cyber-cyan/5">
              STATUS: {isComplete ? "COMPLETE" : "SCANNING"}
            </div>
          </div>
        </div>

        {/* Center Layout: Links die 3 HUD-Elemente übereinander, Rechts der große Master-Loader */}
        <div
          className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 py-6"
          style={{ animation: "hologramFlicker 6s infinite" }}
        >
          {/* LINKE SPALTE: E-Mail, Username, Telefon übereinander (Freischwebend ohne Boxen) */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {/* 1. E-Mail HUD Element */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${emailStep?.status === "done" ? "border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-xs font-bold">{emailStep?.status === "done" ? "✓" : "⚡"}</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase">E-Mail Vector</div>
                  <div className="text-sm font-mono text-white truncate max-w-[240px] md:max-w-[320px]">
                    {queries?.email || emailStep?.query || "Nicht aktiv"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-xs tracking-wider uppercase px-2.5 py-1 rounded border ${emailStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {emailStep?.status === "done" ? "COMPLETE" : emailStep?.status === "running" ? "SCANNING" : "STANDBY"}
              </div>
            </div>

            {/* 2. Username HUD Element */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${usernameStep?.status === "done" ? "border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-xs font-bold">{usernameStep?.status === "done" ? "✓" : "⚡"}</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Username / Alias</div>
                  <div className="text-sm font-mono text-white truncate max-w-[240px] md:max-w-[320px]">
                    {queries?.username || usernameStep?.query || "Nicht aktiv"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-xs tracking-wider uppercase px-2.5 py-1 rounded border ${usernameStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {usernameStep?.status === "done" ? "COMPLETE" : usernameStep?.status === "running" ? "SCANNING" : "STANDBY"}
              </div>
            </div>

            {/* 3. Telefon HUD Element */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${phoneStep?.status === "done" ? "border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-xs font-bold">{phoneStep?.status === "done" ? "✓" : "⚡"}</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Phone Intelligence</div>
                  <div className="text-sm font-mono text-white truncate max-w-[240px] md:max-w-[320px]">
                    {queries?.phone || phoneStep?.query || "Nicht aktiv"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-xs tracking-wider uppercase px-2.5 py-1 rounded border ${phoneStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {phoneStep?.status === "done" ? "COMPLETE" : phoneStep?.status === "running" ? "SCANNING" : "STANDBY"}
              </div>
            </div>
          </div>

          {/* RECHTE SPALTE: Der große, freischwebende Iron Man / JARVIS Master-Loader für die Gesamtzeit */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
              
              {/* Äußerer rotierender Sci-Fi Ring */}
              <div 
                className={`absolute inset-0 rounded-full border-2 border-dashed ${isComplete ? "border-emerald-400/60" : "border-cyber-cyan/40"}`}
                style={{ animation: "spinSlow 12s linear infinite" }}
              />
              
              {/* Innerer gegenläufiger Ring */}
              <div 
                className={`absolute inset-3 rounded-full border border-dotted ${isComplete ? "border-emerald-400" : "border-cyber-cyan/70"}`}
                style={{ animation: "spinReverse 8s linear infinite" }}
              />

              {/* Taktischer Glow-Hintergrund */}
              <div className={`absolute inset-8 rounded-full blur-xl transition-colors duration-500 ${isComplete ? "bg-emerald-500/20" : "bg-cyber-cyan/15"}`} />

              {/* SVG Arc Progress Kreis */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-white/5"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-300 ${isComplete ? "stroke-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "stroke-cyber-cyan drop-shadow-[0_0_12px_rgba(41,182,246,0.8)]"}`}
                  strokeWidth="6"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progress) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Zentrum des Master-Loaders (Prozent & Status) */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`text-4xl md:text-5xl font-bold tracking-tighter tabular-nums ${isComplete ? "text-emerald-400" : "text-cyber-cyan"}`}>
                  {progress}%
                </div>
                <div className="text-[10px] tracking-[0.25em] text-white/60 uppercase mt-1">
                  {isComplete ? "COMPLETE" : "TOTAL SCAN TIME"}
                </div>
                <div className="text-[9px] font-mono text-white/40 mt-1 max-w-[140px] truncate">
                  {activeStepLabel || "Processing..."}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Bottom Pipeline Status Bar */}
        <div className="relative z-10 w-full px-6 md:px-12 pb-6">
          <div className="flex items-center justify-between text-xs text-white/50 border-t border-cyber-cyan/20 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-cyber-cyan">SYSTEM:</span> SECURE MULTI-THREAD PIPELINE ACTIVE
            </div>
            <div className="text-cyber-cyan font-semibold tracking-widest uppercase">
              {isComplete ? "ALL MODULES VERIFIED & SECURED" : "ANALYZING TARGET NODES..."}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
