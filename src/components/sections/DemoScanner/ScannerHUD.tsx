"use client";

import { useState, useEffect } from "react";
import type { ScanPhase, ScanData } from "./types";

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

/** Flat baseline with intermittent QRS spikes — reads as a live ECG strip. */
const EKG_WAVE =
  "M0,30 H70 L78,30 L82,18 L86,42 L90,8 L94,30 H160 L168,30 L172,22 L176,38 L180,12 L184,30 H250 L258,30 L262,16 L266,44 L270,6 L274,30 H340 L348,30 L352,20 L356,40 L360,10 L364,30 H430 L438,30 L442,24 L446,36 L450,14 L454,30 H520 L528,30 L532,18 L536,42 L540,8 L544,30 H600";

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

        @keyframes ekgScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes neuralBreathe {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }

        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }

        .ekg-stage {
          transform: perspective(520px) rotateX(28deg) scaleY(1.08);
          transform-origin: center center;
        }

        .ekg-scroll {
          animation: ekgScroll 4.8s linear infinite;
        }
      `}</style>

      <div
        className={`relative h-full w-full overflow-hidden bg-[#03050a] flex items-center justify-center font-mono select-none ${isBooting ? "crt-boot" : ""}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,182,246,0.1)_0%,rgba(3,5,10,1)_72%)]" />
        <div
          className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(112,231,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(112,231,255,0.22)_1px,transparent_1px)] bg-[size:60px_60px]"
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

          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#03050a]/90 backdrop-blur-xl p-4 md:p-5 flex flex-col justify-center items-center">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ animation: "neuralBreathe 4s infinite" }}
            >
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-cyber-cyan/20 fill-cyber-cyan/20"
              >
                <circle cx="10%" cy="20%" r="2" />
                <circle cx="30%" cy="80%" r="1.5" />
                <circle cx="50%" cy="30%" r="2.5" />
                <circle cx="70%" cy="70%" r="1" />
                <circle cx="90%" cy="40%" r="2" />
                <line x1="10%" y1="20%" x2="50%" y2="30%" strokeWidth="1" />
                <line x1="50%" y1="30%" x2="90%" y2="40%" strokeWidth="1" />
              </svg>
            </div>

            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyber-cyan/50 z-10" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyber-cyan/50 z-10" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyber-cyan/50 z-10" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyber-cyan/50 z-10" />

            <div className="text-cyber-cyan/70 text-[10px] font-medium tracking-[0.28em] mb-1 uppercase z-10">
              Status
            </div>
            <div className="text-white text-base md:text-lg font-medium tracking-widest animate-pulse z-10">
              KI-ANALYSE AKTIV
            </div>

            <div className="w-full h-1.5 bg-white/[0.04] mt-3 border border-white/[0.06] relative overflow-hidden rounded-full z-10">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Natural ECG: flat baseline + spikes scrolling in from the right */}
            <div className="ekg-stage relative w-full h-14 mt-5 overflow-hidden z-10">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyber-cyan/20" />
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 600 60"
                preserveAspectRatio="none"
                className="absolute inset-0"
              >
                <defs>
                  <linearGradient id="ekgGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(112,231,255,0.55)" />
                    <stop offset="100%" stopColor="rgba(41,182,246,0.05)" />
                  </linearGradient>
                  <filter
                    id="ekgDepth"
                    x="-20%"
                    y="-40%"
                    width="140%"
                    height="180%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="1.4"
                      result="blur"
                    />
                    <feOffset dx="0" dy="3" in="blur" result="shadow" />
                    <feMerge>
                      <feMergeNode in="shadow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <g className="ekg-scroll" filter="url(#ekgDepth)">
                  {[0, 600].map((offset) => (
                    <g key={offset} transform={`translate(${offset}, 0)`}>
                      <path
                        d={EKG_WAVE}
                        fill="none"
                        stroke="rgba(41,182,246,0.28)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={EKG_WAVE}
                        fill="none"
                        stroke="url(#ekgGlow)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={EKG_WAVE}
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ))}
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#03050a] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#03050a] to-transparent" />
            </div>

            <div className="mt-2 flex items-center gap-2 z-10 text-cyber-cyan font-mono">
              <span className="text-[9px] uppercase tracking-[0.3em] opacity-70">
                Progress
              </span>
              <span className="text-xl font-semibold tabular-nums">
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
