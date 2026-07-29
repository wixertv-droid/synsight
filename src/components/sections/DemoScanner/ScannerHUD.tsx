"use client";

import { useState, useEffect } from "react";
import type { ScanPhase, ScanData } from "./types";

interface ScannerHUDProps {
  phase?: ScanPhase;
  progress: number;
  query: string;
  data?: ScanData;
  onClose?: () => void; // Optionaler Callback, wenn das HUD fertig geschlossen ist
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

  // Kurzer Boot-Effekt beim Start
  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const activeLogIndex = Math.min(
    Math.floor((progress / 100) * operations.length),
    operations.length - 1
  );

  // Funktion zum Auslösen des Röhrenfernseher-Effekts
  const triggerShutdown = () => {
    setIsShuttingDown(true);
    // Nach der Animation (500ms) die echte Schließen-Aktion feuern
    setTimeout(() => {
      if (onClose) onClose();
    }, 500);
  };

  return (
    <>
      <style>{`
        /* CRT Röhrenfernseher Boot & Shutdown Effekte */
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
        /* Holographisches Flackern */
        @keyframes hologramFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.6; filter: drop-shadow(0 0 10px rgba(0,255,255,0.8)); }
        }
        /* Holographische Scanline (fährt von oben nach unten) */
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        
        .crt-boot { animation: crtTurnOn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .crt-shutdown { animation: crtTurnOff 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .holo-text { text-shadow: 0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff; }
      `}</style>

      <div 
        className={`relative h-full w-full overflow-hidden bg-[#01050b] flex items-center justify-center font-mono select-none ${isBooting ? 'crt-boot' : ''} ${isShuttingDown ? 'crt-shutdown' : ''}`}
      >
        
        {/* === GLOBALE VFX EFFEKTE === */}
        {/* Radar Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,180,255,0.15)_0%,rgba(0,0,0,1)_70%)]" />
        
        {/* Grid-Netz */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" style={{ perspective: '800px', transform: 'rotateX(60deg) scale(2) translateY(-20%)' }} />
        
        {/* Laufende Scanline (Der Laser, der übers Bild wandert) */}
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="w-full h-2 bg-cyan-400/30 blur-[2px] opacity-50 shadow-[0_0_20px_#0ff]" style={{ animation: 'scanline 4s linear infinite' }} />
        </div>

        {/* Bildschirm-Rand-Verdunkelung (Vignette) */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-40" />


        {/* === ZENTRALER SCANNER CORE === */}
        <div className="relative z-10 flex items-center justify-center w-[800px] h-[800px]" style={{ animation: 'hologramFlicker 10s infinite' }}>
          
          {/* Äußerster Target-Ring (Stark leuchtend, dreht sich extrem langsam) */}
          <div className="absolute w-[90%] h-[90%] rounded-full border border-cyan-500/20 shadow-[0_0_50px_rgba(0,255,255,0.1)_inset,0_0_50px_rgba(0,255,255,0.1)]" />
          
          {/* Gestrichelte Orbital-Ringe (3D Effekt) */}
          <div className="absolute w-[75%] h-[75%] rounded-full border-[3px] border-dashed border-cyan-400/40 animate-[spin_30s_linear_infinite]" />
          <div className="absolute w-[68%] h-[68%] rounded-full border-[2px] border-dotted border-emerald-500/50 animate-[spin_20s_linear_infinite_reverse]" />

          {/* Der Radar Scan-Kegel (Sweep) */}
          <div className="absolute w-[60%] h-[60%] rounded-full overflow-hidden animate-[spin_3s_linear_infinite]">
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,rgba(0,255,255,0.1)_90%,rgba(0,255,255,0.6)_100%)]" />
          </div>

          {/* Tech-Ringe mit dicken Rahmen-Elementen (CSS-Tricks für den Mechanik-Look) */}
          <div className="absolute w-[50%] h-[50%] rounded-full border-[8px] border-transparent border-t-cyan-500 border-b-cyan-500 animate-[spin_8s_linear_infinite] opacity-70 drop-shadow-[0_0_15px_#0ff]" />
          <div className="absolute w-[45%] h-[45%] rounded-full border-[4px] border-transparent border-l-emerald-400 border-r-emerald-400 animate-[spin_4s_linear_infinite_reverse] drop-shadow-[0_0_10px_#10b981]" />

          {/* Core Shielding (Pulsierendes Zentrum) */}
          <div className="absolute w-[30%] h-[30%] rounded-full border-2 border-cyan-300 bg-cyan-900/30 animate-pulse backdrop-blur-md shadow-[0_0_40px_#0ff_inset]" />

          {/* Daten-Kreis (Die Anzeige in der absoluten Mitte) */}
          <div className="relative z-20 flex flex-col items-center justify-center w-[25%] h-[25%] rounded-full border border-cyan-100/50 bg-black/80 shadow-[0_0_50px_rgba(0,255,255,0.8)]">
            <span className="text-cyan-400 text-[10px] tracking-[0.4em] mb-2 uppercase opacity-80">Syncing</span>
            <div className="text-white text-6xl font-black tracking-tighter holo-text">
              {progress}
            </div>
            <span className="text-emerald-400 text-[10px] tracking-[0.3em] mt-2 animate-pulse">ACTIVE</span>
            
            {/* Kleine Target-Crosshairs am Core */}
            <div className="absolute -top-3 w-[1px] h-3 bg-cyan-400" />
            <div className="absolute -bottom-3 w-[1px] h-3 bg-cyan-400" />
            <div className="absolute -left-3 w-3 h-[1px] bg-cyan-400" />
            <div className="absolute -right-3 w-3 h-[1px] bg-cyan-400" />
          </div>

        </div>


        {/* === BOTTOM DASHBOARD PANELS === */}
        {/* Wir heben die Panels mit 3D-Borders, Backdrops und Glows auf das nächste Level */}
        <div className="absolute z-40 bottom-10 left-0 w-full px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT: TARGET INFO */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#001020]/90 to-black/90 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,255,255,0.1)] clip-path-polygon">
            {/* Glühende Kante oben */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-sm animate-ping shadow-[0_0_10px_#ef4444]" />
              <div className="text-cyan-500 text-xs font-bold tracking-[0.4em] uppercase">Target Entity</div>
            </div>
            <div className="text-white text-2xl uppercase tracking-widest font-bold holo-text truncate">
              {query || "UNKNOWN_SYSTEM"}
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-1 w-12 bg-cyan-500 shadow-[0_0_8px_#0ff]" />
              <div className="h-1 w-4 bg-cyan-700" />
              <div className="h-1 w-2 bg-cyan-800" />
            </div>
          </div>

          {/* CENTER: SYSTEM STATUS & TEST-BUTTON */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-[#001020]/80 backdrop-blur-xl p-6 flex flex-col justify-center items-center shadow-[inset_0_0_20px_rgba(0,255,255,0.1)]">
             {/* Tech-Ecken */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

            <div className="text-cyan-500 text-xs font-bold tracking-[0.4em] mb-2 uppercase">Core Status</div>
            <div className="text-emerald-400 text-xl font-bold tracking-widest animate-pulse drop-shadow-[0_0_8px_#10b981]">
               ONLINE / ANALYZING
            </div>
            
            {/* Progress Bar High-Tech */}
            <div className="w-full h-2 bg-gray-950 mt-5 border border-cyan-900/50 relative overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_15px_#0ff] transition-all duration-300 ease-out"
                 style={{ width: `${progress}%` }}
               />
            </div>

            {/* Versteckter Button, um den CRT-Effekt für dich zum Testen auszulösen! */}
            <button 
              onClick={triggerShutdown}
              className="absolute -top-3 px-2 text-[8px] bg-red-900/80 text-white border border-red-500 uppercase hover:bg-red-600 transition-colors cursor-pointer"
            >
              Test CRT Shutdown
            </button>
          </div>

          {/* RIGHT: LIVE TERMINAL LOGS */}
          <div className="relative overflow-hidden border border-cyan-500/30 bg-gradient-to-l from-[#001020]/90 to-black/90 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-transparent via-emerald-400 to-transparent opacity-50" />
            <div className="text-emerald-500 text-xs font-bold tracking-[0.4em] mb-4 uppercase">Live Process Feed</div>
            
            <div className="space-y-2 text-xs font-medium tracking-widest">
              {operations.map((item, index) => {
                const isActive = index === activeLogIndex;
                const isPast = index < activeLogIndex;
                
                return (
                  <div 
                    key={item} 
                    className={`flex items-center transition-all duration-300 ease-in-out ${
                      isActive ? "text-emerald-400 drop-shadow-[0_0_8px_#10b981] translate-x-3 scale-105" : 
                      isPast ? "text-cyan-800/80" : "text-gray-800"
                    }`}
                  >
                    <span className="w-8 opacity-60 font-bold border-r border-current mr-2">
                      0{index + 1}
                    </span>
                    <span className="truncate">
                      {item}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-2 h-4 bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
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
