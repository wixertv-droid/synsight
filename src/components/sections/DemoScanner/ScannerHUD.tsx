"use client";

import type { ScanPhase, ScanData } from "./types";

interface ScannerHUDProps {
  phase?: ScanPhase;
  progress: number;
  query: string;
  data?: ScanData;
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
  query
}: ScannerHUDProps) {
  // Berechnet, welcher Schritt gerade aktiv ist, basierend auf dem Fortschritt (0-100%)
  const activeLogIndex = Math.min(
    Math.floor((progress / 100) * operations.length),
    operations.length - 1
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#030712] flex items-center justify-center select-none font-mono">
      
      {/* 1. Deep Space Grid & Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,30,55,1)_0%,rgba(3,7,18,1)_100%)]" />
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(0,200,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,200,255,.2)_1px,transparent_1px)] bg-[size:100px_100px]" />
      
      {/* 2. Top/Bottom Cinematic Bars (Letterbox) */}
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent z-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-30 pointer-events-none" />

      {/* 3. Main Scanner Core (Central HUD) */}
      <div className="relative z-10 w-[700px] h-[700px] flex items-center justify-center">
        
        {/* Outer Targeting Reticle (Corners) */}
        <div className="absolute w-full h-full border border-cyan-500/10 rounded-full" />
        <div className="absolute w-[105%] h-[105%]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50 rounded-br-xl" />
        </div>

        {/* Outer Dashed Orbit (Spinning Clockwise) */}
        <div className="absolute w-[600px] h-[600px] rounded-full border-[1px] border-dashed border-cyan-500/30 animate-[spin_25s_linear_infinite]" />

        {/* Inner Solid Orbit with Glow Dot (Spinning Counter-Clockwise) */}
        <div className="absolute w-[480px] h-[480px] rounded-full border-[1px] border-cyan-400/20 animate-[spin_15s_linear_infinite_reverse]">
          <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-8 bg-cyan-400 rounded-full shadow-[0_0_20px_#22d3ee]" />
        </div>

        {/* Radar Sweep Cone (Using Conic Gradient) */}
        <div className="absolute w-[450px] h-[450px] rounded-full overflow-hidden animate-[spin_4s_linear_infinite]">
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,rgba(34,211,238,0.1)_95%,rgba(34,211,238,0.4)_100%)]" />
        </div>

        {/* Data Ring (Dotted) */}
        <div className="absolute w-[340px] h-[340px] rounded-full border-[3px] border-dotted border-cyan-500/40 animate-[spin_40s_linear_infinite]" />

        {/* Core Protection Shield (Pulsing) */}
        <div className="absolute w-[220px] h-[220px] rounded-full border border-cyan-300/30 bg-cyan-900/20 animate-pulse blur-[2px]" />

        {/* AI Core Center */}
        <div className="relative w-48 h-48 rounded-full border border-cyan-300/60 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.2)]">
          {/* Inner rotating element */}
          <div className="absolute w-full h-full rounded-full border-t-2 border-cyan-400 animate-[spin_2s_linear_infinite]" />
          <div className="absolute w-full h-full rounded-full border-b-2 border-emerald-400 animate-[spin_3s_linear_infinite_reverse]" />
          
          <div className="text-cyan-400/80 text-[10px] tracking-[0.4em] mb-1">
            SYNSIGHT AI
          </div>
          <div className="text-white text-5xl font-light tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            {progress}<span className="text-2xl text-cyan-500">%</span>
          </div>
          <div className="text-emerald-400/80 text-[9px] tracking-[0.3em] mt-2 animate-pulse">
            ANALYZING
          </div>
        </div>
      </div>

      {/* 4. Bottom HUD Panels (Dashboard) */}
      <div className="absolute z-40 bottom-8 left-0 w-full px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel 1: Target Info */}
        <div className="relative bg-[#05101a]/80 backdrop-blur-md border-l-4 border-l-cyan-500 border-y border-r border-cyan-900/50 rounded-r-lg p-5">
          <div className="absolute top-0 right-0 w-16 h-[1px] bg-cyan-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-cyan-500 tracking-[0.3em] font-bold">PRIMARY TARGET</div>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-white text-xl uppercase tracking-widest truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {query || "UNKNOWN ENTITY"}
          </div>
          <div className="mt-2 text-xs text-cyan-700">
            ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
          </div>
        </div>

        {/* Panel 2: System Status */}
        <div className="relative bg-[#05101a]/80 backdrop-blur-md border border-cyan-900/50 rounded-lg p-5 flex flex-col justify-center items-center">
           {/* Decorative corner brackets */}
           <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-cyan-500" />
           <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-cyan-500" />
           <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-cyan-500" />
           <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-cyan-500" />

          <div className="text-[10px] text-cyan-500 tracking-[0.3em] mb-2 font-bold">SYSTEM STATUS</div>
          <div className="text-emerald-400 text-lg tracking-widest animate-pulse">
             CONNECTION SECURE
          </div>
          
          {/* Progress Bar Mini */}
          <div className="w-full h-1 bg-gray-900 mt-4 rounded-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 shadow-[0_0_10px_#22d3ee] transition-all duration-300"
               style={{ width: `${progress}%` }}
             />
          </div>
        </div>

        {/* Panel 3: Live Process Feed */}
        <div className="relative bg-[#05101a]/80 backdrop-blur-md border-r-4 border-r-cyan-500 border-y border-l border-cyan-900/50 rounded-l-lg p-5">
          <div className="text-[10px] text-cyan-500 tracking-[0.3em] mb-3 font-bold">LIVE PROCESS THREADS</div>
          <div className="space-y-1.5 text-[10px] tracking-wider">
            {operations.map((item, index) => {
              const isActive = index === activeLogIndex;
              const isPast = index < activeLogIndex;
              
              return (
                <div 
                  key={item} 
                  className={`flex items-center transition-all duration-300 ${
                    isActive ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)] translate-x-2" : 
                    isPast ? "text-cyan-700/60" : "text-gray-700"
                  }`}
                >
                  <span className="w-6 opacity-50 font-bold">
                    0{index + 1}
                  </span>
                  <span className="truncate">
                    {item}
                  </span>
                  {isActive && (
                    <span className="ml-auto w-1 h-3 bg-emerald-400 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Particles/Data points (Optional decoration) */}
      <div className="absolute top-20 left-20 text-[8px] text-cyan-800 font-bold tracking-widest">
        SEC: ALPHA-9<br/>
        LAT: 45.992<br/>
        LONG: 12.001
      </div>
      <div className="absolute top-32 right-32 text-[8px] text-cyan-800 font-bold tracking-widest text-right">
        UPLINK: ACTIVE<br/>
        ENC: AES-256<br/>
        MOD: OSINT-DEEP
      </div>

    </div>
  );
}
