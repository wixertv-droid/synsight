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
  "AI ASSESSMENT GENERATING"
];

export default function ScannerHUD({
  progress,
  query,
  onClose
}: ScannerHUDProps) {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  // 1. Boot-Effekt beim Starten
  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // 2. NEU: Überwacht den Fortschritt. Wenn 100% erreicht sind, wird automatisch der CRT-Effekt ausgelöst!
  useEffect(() => {
    if (progress >= 100 && !isShuttingDown) {
      triggerShutdown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const activeLogIndex = Math.min(
    Math.floor((progress / 100) * operations.length),
    operations.length - 1
  );

  const triggerShutdown = () => {
    setIsShuttingDown(true);
    // Warte 500ms (Dauer der CRT-Animation), bevor dem System gesagt wird "Ich bin fertig"
    setTimeout(() => {
      if (onClose) onClose();
    }, 500);
  };

  return (
    <>
      <style>{`
        /* CRT Röhrenfernseher Boot & Shutdown */
        @keyframes crtTurnOn {
          0% { transform: scale(0, 0.002); filter: brightness(0); opacity: 0; }
          40% { transform: scale(1, 0.002); filter: brightness(10); opacity: 1; }
          100% { transform: scale(1, 1); filter: brightness(1); opacity: 1; }
        }
        @keyframes crtTurnOff {
          0% { transform: scale(1, 1.3); filter: brightness(1); }
          60% { transform: scale(1, 0.001); filter: brightness(10); }
          100% { transform: scale(0, 0.001); filter: brightness(0); opacity: 0; }
        }
        
        /* Flackern des Cores */
        @keyframes hologramFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.8; filter: drop-shadow(0 0 15px rgba(34,211,238,0.8)); }
        }
        
        /* Die EKG Animation - jetzt breiter und flacher für unter den Ladebalken */
        @keyframes ekgPulse {
          0% { stroke-dashoffset: 400; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        /* Scanline, die von oben nach unten fährt (schneller für 10s Scan) */
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        
        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .crt-shutdown { animation: crtTurnOff 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      <div 
        className={`relative h-full w-full overflow-hidden bg-[#02070d] flex items-center justify-center font-mono select-none ${isBooting ? 'crt-boot' : ''} ${isShuttingDown ? 'crt-shutdown' : ''}`}
      >
        
        {/* === BACKGROUND === */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1)_0%,rgba(2,7,13,1)_70%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:60px_60px]" style={{ perspective: '800px', transform: 'rotateX(60deg) scale(2) translateY(-20%)' }} />
        
        {/* Horizontale Scan-Linie */}
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="w-full h-[2px] bg-cyan-400/40 blur-[1px] opacity-70 shadow-[0_0_30px_#22d3ee]" style={{ animation: 'scanline 2s linear infinite' }} />
        </div>
        
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(2,7,13,0.9)] z-40" />

        {/* === ZENTRALER SCANNER CORE === */}
        <div className="relative z-10 flex items-center justify-center w-[800px] h-[800px]" style={{ animation: 'hologramFlicker 8s infinite' }}>
          
          <div className="absolute w-[90%] h-[90%] rounded-full border border-cyan-500/10 shadow-[0_0_50px_rgba(34,211,238,0.05)_inset,0_0_50px_rgba(34,211,238,0.05)]" />
          <div className="absolute w-[75%] h-[75%] rounded-full border-[2px] border-dashed border-cyan-400/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute w-[68%] h-[68%] rounded-full border-[2px] border-dotted border-blue-400/40 animate-[spin_8s_linear_infinite_reverse]" />

          {/* Radar Scan-Kegel */}
          <div className="absolute w-[60%] h-[60%] rounded-full overflow-hidden animate-[spin_1.5s_linear_infinite]">
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,rgba(34,211,238,0.1)_90%,rgba(34,211,238,0.5)_100%)]" />
          </div>

          <div className="absolute w-[50%] h-[50%] rounded-full border-[6px] border-transparent border-t-cyan-500 border-b-cyan-500 animate-[spin_4s_linear_infinite] opacity-60 drop-shadow-[0_0_15px_#22d3ee]" />
          <div className="absolute w-[45%] h-[45%] rounded-full border-[3px] border-transparent border-l-blue-400 border-r-blue-400 animate-[spin_2s_linear_infinite_reverse] drop-shadow-[0_0_10px_#60a5fa]" />

          <div className="absolute w-[30%] h-[30%] rounded-full border border-cyan-300 bg-cyan-900/20 animate-pulse backdrop-blur-md shadow-[0_0_40px_#22d3ee_inset]" />

          {/* Der Core in der Mitte (ohne EKG) */}
          <div className="relative z-20 flex flex-col items-center justify-center w-[30%] h-[30%] rounded-full border border-cyan-200/40 bg-[#02070d]/80 shadow-[0_0_60px_rgba(34,211,238,0.5)] overflow-hidden">
            <span className="text-cyan-400 text-[10px] tracking-[0.4em] mb-1 uppercase opacity-80">SynSight Core</span>
            
            <div className="text-white text-7xl font-black tracking-tighter drop-shadow-[0_0_15px_#22d3ee] z-10 mt-2 mb-2">
              {progress}
            </div>

            <span className="text-blue-400 text-[10px] tracking-[0.3em] mt-1 animate-pulse z-10">ANALYZING</span>
            
            <div className="absolute -top-3 w-[1px] h-3 bg-cyan-400" />
            <div className="absolute -bottom-3 w-[1px] h-3 bg-cyan-400" />
            <div className="absolute -left-3 w-3 h-[1px] bg-cyan-400" />
            <div className="absolute -right-3 w-3 h-[1px] bg-cyan-400" />
          </div>

        </div>

        {/* === BOTTOM DASHBOARD PANELS === */}
        <div className="absolute z-40 bottom-10 left-0 w-full px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT: TARGET INFO */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-[#02070d]/90 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-sm animate-ping shadow-[0_0_10px_#22d3ee]" />
              <div className="text-cyan-500 text-xs font-bold tracking-[0.4em] uppercase font-mono">Ziel-Objekt</div>
            </div>
            
            <div className="text-white text-2xl font-sans font-medium drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] truncate">
              {query || "Unbekannt"}
            </div>
            
            <div className="mt-4 flex gap-2">
              <div className="h-1 w-12 bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
              <div className="h-1 w-4 bg-blue-600" />
              <div className="h-1 w-2 bg-blue-800" />
            </div>
          </div>

          {/* CENTER: SYSTEM STATUS & NEUES EKG */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-[#02070d]/90 backdrop-blur-xl p-5 flex flex-col justify-center items-center shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

            <div className="text-cyan-500 text-[10px] font-bold tracking-[0.4em] mb-1 uppercase font-mono">Status</div>
            <div className="text-white text-lg font-bold tracking-widest animate-pulse drop-shadow-[0_0_8px_#fff] font-mono">
               KI-ANALYSE AKTIV
            </div>
            
            {/* Ladebalken */}
            <div className="w-full h-1.5 bg-[#041224] mt-3 border border-cyan-900/50 relative overflow-hidden rounded-full">
               <div 
                 className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-100 ease-linear"
                 style={{ width: `${progress}%` }}
               />
            </div>

            {/* NEU: Die EKG-Linie direkt unter dem Ladebalken */}
            <div className="w-full h-8 mt-1 flex justify-center opacity-70">
              <svg width="200" height="25" viewBox="0 0 300 40" className="stroke-cyan-400 fill-none stroke-[2px] drop-shadow-[0_0_5px_#22d3ee]">
                <path 
                  d="M0,20 L120,20 L130,5 L145,35 L160,10 L170,20 L300,20" 
                  strokeDasharray="400"
                  strokeDashoffset="400"
                  style={{ animation: 'ekgPulse 1.2s linear infinite' }}
                />
              </svg>
            </div>

          </div>

          {/* RIGHT: LIVE LOGS */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-[#02070d]/90 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
            <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-transparent via-cyan-400 to-transparent opacity-50" />
            <div className="text-cyan-500 text-xs font-bold tracking-[0.4em] mb-4 uppercase font-mono">Live Logs</div>
            
            <div className="space-y-2 text-xs font-medium tracking-widest font-mono">
              {operations.map((item, index) => {
                const isActive = index === activeLogIndex;
                const isPast = index < activeLogIndex;
                
                return (
                  <div 
                    key={item} 
                    className={`flex items-center transition-all duration-300 ease-in-out ${
                      isActive ? "text-cyan-300 drop-shadow-[0_0_8px_#22d3ee] translate-x-3 scale-105" : 
                      isPast ? "text-cyan-800/80" : "text-slate-700"
                    }`}
                  >
                    <span className="w-8 opacity-60 font-bold border-r border-current mr-2">
                      0{index + 1}
                    </span>
                    <span className="truncate">
                      {item}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-2 h-4 bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
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
