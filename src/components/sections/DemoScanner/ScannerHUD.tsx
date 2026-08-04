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

  const emailStep = moduleSteps.find((s) => s.field === "email" || String(s.module) === "holehe");
  const usernameStep = moduleSteps.find((s) => s.field === "username" || String(s.module) === "maigret" || String(s.module) === "sherlock");
  const phoneStep = moduleSteps.find((s) => s.field === "phone" || String(s.module) === "phoneinfoga");

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
          20%, 22%, 24%, 55% { opacity: 0.88; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes sciFiSpinClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sciFiSpinCounter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      <div
        className={`relative h-full w-full overflow-hidden bg-[#03050a] flex flex-col justify-between font-mono select-none ${isBooting ? "crt-boot" : ""}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,182,246,0.1)_0%,rgba(3,5,10,1)_80%)]" />
        <ScanCodeRain />
        
        {/* Sci-Fi Grid Overlay */}
        <div
          className="absolute inset-0 z-[2] opacity-[0.05] bg-[linear-gradient(rgba(112,231,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(112,231,255,0.3)_1px,transparent_1px)] bg-[size:40px_40px]"
          style={{
            perspective: "800px",
            transform: "rotateX(60deg) scale(2) translateY(-10%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-50">
          <div
            className="w-full h-px bg-cyber-cyan/35 blur-[0.5px]"
            style={{ animation: "scanline 3s linear infinite" }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(3,5,10,0.95)] z-40" />

        {/* Top Bar */}
        <div className="relative z-10 w-full px-6 md:px-12 pt-6">
          <div className="flex items-center justify-between border-b border-cyber-cyan/25 pb-4">
            <div>
              <div className="text-cyber-cyan text-[11px] tracking-[0.4em] uppercase mb-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyber-cyan animate-ping" />
                TACTICAL HUD // SCI-FI TARGET ACQUISITION
              </div>
              <div className="text-white text-xl md:text-2xl font-sans font-semibold tracking-tight truncate max-w-[60vw]">
                {query || "Multitarget Analysis"}
              </div>
            </div>
            <div className={`font-mono text-xs tracking-widest uppercase border px-3 py-1 rounded transition-colors duration-300 ${isComplete ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]" : "border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan animate-pulse"}`}>
              STATUS: {isComplete ? "COMPLETE" : "SCANNING"}
            </div>
          </div>
        </div>

        {/* Center: Links 3x kleiner Sci-Fi Loader, Rechts 1x großer Master Loader */}
        <div
          className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-6"
          style={{ animation: "hologramFlicker 5s infinite" }}
        >
          {/* LINKE SPALTE: Die 3 kleineren Sci-Fi HUD Einheiten übereinander */}
          <div className="w-full lg:w-[42%] flex flex-col gap-4">
            
            {/* 1. E-Mail Mini HUD */}
            <div className={`relative flex items-center justify-between p-3.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${emailStep?.status === "done" ? "border-emerald-400/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "border-cyber-cyan/30 bg-black/60 shadow-[0_0_15px_rgba(41,182,246,0.1)]"}`}>
              <div className="absolute -top-1.5 left-2 px-1 text-[8px] tracking-widest text-cyber-cyan uppercase bg-[#03050a]">VECTOR: EMAIL</div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center ${emailStep?.status === "done" ? "border-emerald-400 text-emerald-400" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-[10px]">{emailStep?.status === "done" ? "✓" : "◎"}</span>
                </div>
                <div>
                  <div className="text-xs font-mono text-white truncate max-w-[200px] md:max-w-[280px]">
                    {queries?.email || emailStep?.query || "Standby"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border ${emailStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {emailStep?.status === "done" ? "COMPLETE" : emailStep?.status === "running" ? "ACTIVE" : "IDLE"}
              </div>
            </div>

            {/* 2. Username Mini HUD */}
            <div className={`relative flex items-center justify-between p-3.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${usernameStep?.status === "done" ? "border-emerald-400/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "border-cyber-cyan/30 bg-black/60 shadow-[0_0_15px_rgba(41,182,246,0.1)]"}`}>
              <div className="absolute -top-1.5 left-2 px-1 text-[8px] tracking-widest text-cyber-cyan uppercase bg-[#03050a]">VECTOR: USERNAME</div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center ${usernameStep?.status === "done" ? "border-emerald-400 text-emerald-400" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-[10px]">{usernameStep?.status === "done" ? "✓" : "◎"}</span>
                </div>
                <div>
                  <div className="text-xs font-mono text-white truncate max-w-[200px] md:max-w-[280px]">
                    {queries?.username || usernameStep?.query || "Standby"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border ${usernameStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {usernameStep?.status === "done" ? "COMPLETE" : usernameStep?.status === "running" ? "ACTIVE" : "IDLE"}
              </div>
            </div>

            {/* 3. Telefon Mini HUD */}
            <div className={`relative flex items-center justify-between p-3.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${phoneStep?.status === "done" ? "border-emerald-400/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "border-cyber-cyan/30 bg-black/60 shadow-[0_0_15px_rgba(41,182,246,0.1)]"}`}>
              <div className="absolute -top-1.5 left-2 px-1 text-[8px] tracking-widest text-cyber-cyan uppercase bg-[#03050a]">VECTOR: PHONE</div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center ${phoneStep?.status === "done" ? "border-emerald-400 text-emerald-400" : "border-cyber-cyan text-cyber-cyan animate-spin"}`}>
                  <span className="text-[10px]">{phoneStep?.status === "done" ? "✓" : "◎"}</span>
                </div>
                <div>
                  <div className="text-xs font-mono text-white truncate max-w-[200px] md:max-w-[280px]">
                    {queries?.phone || phoneStep?.query || "Standby"}
                  </div>
                </div>
              </div>
              <div className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border ${phoneStep?.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan"}`}>
                {phoneStep?.status === "done" ? "COMPLETE" : phoneStep?.status === "running" ? "ACTIVE" : "IDLE"}
              </div>
            </div>

          </div>

          {/* RECHTE SPALTE: Der große Sci-Fi Master Loader (genau im Look deines Screenshots) */}
          <div className="w-full lg:w-[58%] flex flex-col items-center justify-center">
            <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
              
              {/* Äußerer Sci-Fi Zielring (gestrichelt, dreht sich langsam) */}
              <div 
                className={`absolute inset-0 rounded-full border border-dashed transition-colors duration-500 ${isComplete ? "border-emerald-400/70" : "border-cyber-cyan/50"}`}
                style={{ animation: "sciFiSpinClockwise 20s linear infinite" }}
              />

              {/* Zweiter Ring gegenläufig */}
              <div 
                className={`absolute inset-4 rounded-full border-2 border-dotted transition-colors duration-500 ${isComplete ? "border-emerald-400/80" : "border-cyber-cyan/60"}`}
                style={{ animation: "sciFiSpinCounter 14s linear infinite" }}
              />

              {/* Technischer Ecken-Rahmen-Effekt */}
              <div className="absolute inset-8 rounded-full border border-white/10 flex items-center justify-center">
                <div className="absolute -top-1 w-3 h-3 border-t-2 border-l-2 border-cyber-cyan" />
                <div className="absolute -bottom-1 w-3 h-3 border-b-2 border-r-2 border-cyber-cyan" />
                <div className="absolute -left-1 w-3 h-3 border-t-2 border-l-2 border-cyber-cyan" />
                <div className="absolute -right-1 w-3 h-3 border-b-2 border-r-2 border-cyber-cyan" />
              </div>

              {/* Sci-Fi Glow Hintergrund */}
              <div className={`absolute inset-12 rounded-full blur-2xl transition-colors duration-500 ${isComplete ? "bg-emerald-500/25" : "bg-cyber-cyan/20"}`} />

              {/* SVG Fortschritts-Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 p-2" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-white/5"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-300 ${isComplete ? "stroke-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.9)]" : "stroke-cyber-cyan drop-shadow-[0_0_15px_rgba(41,182,246,0.9)]"}`}
                  strokeWidth="4"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progress) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Zentrum des Master Loaders im echten Sci-Fi Box-Look */}
              <div className="relative z-10 flex flex-col items-center text-center px-6 py-4 bg-black/60 backdrop-blur-md rounded border border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                <div className={`text-3xl md:text-4xl font-bold tracking-widest tabular-nums transition-colors duration-500 ${isComplete ? "text-emerald-400" : "text-cyber-cyan"}`}>
                  {progress}%
                </div>
                <div className="my-1 px-3 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-red-400 font-mono text-xs tracking-widest uppercase animate-pulse">
                  {isComplete ? "COMPLETE" : "LOADING"}
                </div>
                <div className="text-[9px] font-mono text-white/50 tracking-wider max-w-[160px] truncate mt-1">
                  {activeStepLabel || "Processing..."}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 w-full px-6 md:px-12 pb-6">
          <div className="flex items-center justify-between text-xs text-white/50 border-t border-cyber-cyan/25 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-cyber-cyan">SYSTEM:</span> TARGET LOCK ENGAGED
            </div>
            <div className={`font-semibold tracking-widest uppercase transition-colors duration-300 ${isComplete ? "text-emerald-400" : "text-cyber-cyan"}`}>
              {isComplete ? "ALL TARGET VECTORS SECURED" : "SCANNING LIVE NODES..."}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
