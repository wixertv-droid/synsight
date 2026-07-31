"use client";

import { useState, useEffect } from "react";
import type { ScanPhase, ScanData } from "./types";
import EntityGraphCanvas from "@/components/analysis/intelligence/EntityGraphCanvas";
import ScanCodeRain from "./ScanCodeRain";

interface ScannerHUDProps {
  phase?: ScanPhase;
  progress: number;
  query: string;
  data?: ScanData;
  onClose?: () => void;
}

const operations = [
  "IDENTITY MATRIX INITIALIZED",
  "PUBLIC INTELLIGENCE CHANNELS ONLINE",
  "ENTITY RESOLUTION RUNNING",
  "DIGITAL FOOTPRINT MAPPING",
  "CORRELATION ENGINE ACTIVE",
  "RISK MODEL CALCULATING",
  "AI ASSESSMENT GENERATING",
];

export default function ScannerHUD({ progress, query }: ScannerHUDProps) {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const activeLogIndex = Math.min(
    Math.floor((progress / 100) * operations.length),
    operations.length - 1
  );

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
        className={`relative h-full w-full overflow-hidden bg-[#03050a] flex items-center justify-center font-mono select-none ${isBooting ? "crt-boot" : ""}`}
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

        <div
          className="relative z-10 flex items-center justify-center w-[min(92vw,520px)] h-[min(92vw,520px)] md:w-[min(80vw,720px)] md:h-[min(80vw,720px)] mb-40 md:mb-48"
          style={{ animation: "hologramFlicker 8s infinite" }}
        >
          <div className="absolute w-[90%] h-[90%] rounded-full border border-cyber-cyan/10" />
          <div className="absolute w-[75%] h-[75%] rounded-full border border-dashed border-cyber-cyan/25 animate-[spin_10s_linear_infinite]" />
          <div className="absolute w-[68%] h-[68%] rounded-full border border-dotted border-cyber-blue/35 animate-[spin_8s_linear_infinite_reverse]" />

          <div className="absolute w-[60%] h-[60%] rounded-full overflow-hidden animate-[spin_1.5s_linear_infinite]">
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,rgba(41,182,246,0.1)_90%,rgba(112,231,255,0.45)_100%)]" />
          </div>

          <div className="absolute w-[50%] h-[50%] rounded-full border-[5px] border-transparent border-t-cyber-cyan border-b-cyber-cyan animate-[spin_4s_linear_infinite] opacity-55" />
          <div className="absolute w-[45%] h-[45%] rounded-full border-[3px] border-transparent border-l-cyber-blue border-r-cyber-blue animate-[spin_2s_linear_infinite_reverse]" />

          <div className="absolute w-[30%] h-[30%] rounded-full border border-cyber-cyan/40 bg-cyber-blue/10 animate-pulse backdrop-blur-md" />

          <div className="relative z-20 flex flex-col items-center justify-center w-[42%] h-[42%] md:w-[30%] md:h-[30%] rounded-full border border-cyber-cyan/30 bg-[#03050a]/85 shadow-[0_0_50px_rgba(41,182,246,0.25)] overflow-hidden">
            <span className="text-cyber-cyan/80 text-[9px] md:text-[10px] tracking-[0.4em] mb-1 uppercase">
              SynSight Core
            </span>
            <div className="text-white text-5xl md:text-7xl font-semibold tracking-tighter z-10 mt-1 mb-1 tabular-nums">
              {progress}
            </div>
            <span className="text-cyber-blue text-[9px] md:text-[10px] tracking-[0.3em] mt-1 animate-pulse z-10">
              ANALYZING
            </span>
          </div>
        </div>

        <div className="absolute z-40 bottom-4 md:bottom-10 left-0 w-full px-4 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#03050a]/90 backdrop-blur-xl p-4 md:p-6">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-cyber-cyan rounded-sm animate-ping" />
              <div className="text-cyber-cyan/70 text-[10px] font-medium tracking-[0.28em] uppercase">
                Ziel-Objekt
              </div>
            </div>
            <div className="text-white text-xl md:text-2xl font-sans font-medium truncate">
              {query || "Unbekannt"}
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-1 w-12 bg-cyber-cyan/80" />
              <div className="h-1 w-4 bg-cyber-blue/70" />
              <div className="h-1 w-2 bg-cyber-blue/40" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#03050a]/90 backdrop-blur-xl p-3 md:p-4 flex flex-col">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyber-cyan/50 z-10" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyber-cyan/50 z-10" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyber-cyan/50 z-10" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyber-cyan/50 z-10" />

            <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
              <div className="text-cyber-cyan/70 text-[10px] font-medium tracking-[0.22em] uppercase">
                Status · Entity Graph
              </div>
              <div className="text-white text-[11px] font-medium tracking-widest animate-pulse">
                KI AKTIV
              </div>
            </div>

            {/* Same neural/entity graph as analysis recon matrix — not the circular dashboard HUD */}
            <div className="relative z-10 overflow-hidden rounded-lg border border-white/[0.06] bg-[#05080e]">
              <EntityGraphCanvas running height={96} nodeCount={36} />
            </div>

            <div className="relative z-10 mt-3 w-full h-1.5 bg-white/[0.04] border border-white/[0.06] overflow-hidden rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="relative z-10 mt-2 flex items-center justify-between text-cyber-cyan font-mono">
              <span className="text-[9px] uppercase tracking-[0.3em] opacity-70">
                Progress
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {progress}%
              </span>
            </div>
          </div>

          <div className="hidden md:block relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#03050a]/90 backdrop-blur-xl p-6">
            <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-transparent via-cyber-cyan/40 to-transparent" />
            <div className="text-cyber-cyan/70 text-[10px] font-medium tracking-[0.28em] mb-4 uppercase">
              Live Logs
            </div>

            <div className="space-y-2 text-xs font-medium tracking-widest">
              {operations.map((item, index) => {
                const isActive = index === activeLogIndex;
                const isPast = index < activeLogIndex;

                return (
                  <div
                    key={item}
                    className={`flex items-center transition-all duration-300 ease-in-out ${
                      isActive
                        ? "text-cyber-cyan translate-x-2"
                        : isPast
                          ? "text-cyber-cyan/35"
                          : "text-white/20"
                    }`}
                  >
                    <span className="w-8 opacity-60 font-bold border-r border-current mr-2">
                      0{index + 1}
                    </span>
                    <span className="truncate">{item}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-3 bg-cyber-cyan animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
