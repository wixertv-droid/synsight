"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScannerHUD from "./ScannerHUD";
import type { ScanPhase, ApiResult, ScanData, ScanFinding } from "./types";

interface ScannerOverlayProps {
  phase: ScanPhase;
  progress: number;
  target: string;
  logs: string[];
  apiResult: ApiResult | null;
  rawData: ScanData | null;
  onClose: () => void;
}

export default function ScannerOverlay({
  phase,
  progress,
  target,
  logs,
  apiResult,
  rawData,
  onClose
}: ScannerOverlayProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);

  // Zögert das Einblenden des Dossiers minimal heraus, für einen weichen Übergang
  useEffect(() => {
    if (phase === "fullscreen_result") {
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [phase]);

  // Wenn idle oder complete, ist das Overlay unsichtbar (Nutzer ist auf der normalen Seite)
  if (phase === "idle" || phase === "complete") return null;

  // 1. PHASE: DAS SCANNER HUD (Der 10-Sekunden Scan)
  if (phase === "scanning") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <ScannerHUD progress={progress} query={target} onClose={onClose} />
      </div>
    );
  }

  // 2. PHASE: DAS DOSSIER (Ergebnisseite im Cyber-Look)
  if (phase === "fullscreen_result") {
    // Sicheres Auslesen der Daten (inkl. Fallbacks, falls etwas fehlt)
    const findings = rawData?.findings || [];
    const riskLevel = apiResult?.riskLevel || "Unbekannt";
    const score = rawData?.exposureScore || 0;

    return (
      <div className="fixed inset-0 z-50 bg-[#02070d] font-mono text-white overflow-y-auto selection:bg-cyan-500/30">
        
        {/* HINTERGRUND VFX */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05)_0%,rgba(2,7,13,1)_80%)] pointer-events-none" />
        <div className="fixed inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" style={{ perspective: '800px', transform: 'rotateX(20deg) scale(1.2) translateY(-10%)' }} />
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="w-full h-[2px] bg-cyan-400/20 blur-[1px] shadow-[0_0_20px_#22d3ee]" style={{ animation: 'scanline 4s linear infinite' }} />
        </div>

        {/* HAUPTINHALT DOSSIER */}
        <div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* HEADER */}
          <div className="border-b border-cyan-500/30 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="text-cyan-500 text-[10px] tracking-[0.4em] mb-2 uppercase animate-pulse font-bold">
                SynSight Intelligence Network
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] uppercase">
                Digital Exposure Dossier
              </h1>
            </div>
            <div className="text-left md:text-right">
              <div className="text-cyan-700 text-[10px] tracking-widest font-bold">DOSSIER ID: {Math.random().toString(36).substring(2,10).toUpperCase()}</div>
              <div className="text-cyan-400 text-xs mt-1 tracking-widest">{new Date().toLocaleString('de-DE')}</div>
            </div>
          </div>

          {/* GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LINKE SPALTE: Ziel-Info & Score */}
            <div className="space-y-8">
              
              {/* Ziel Objekt */}
              <div className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                <TechCorners />
                <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] mb-4 font-bold">Ziel-Objekt</div>
                <div className="text-xl md:text-2xl text-white font-sans font-medium truncate drop-shadow-[0_0_8px_#fff]">
                  {target || "Unbekannt"}
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full animate-ping shadow-[0_0_10px_currentColor] ${riskLevel.includes('Erhöht') || riskLevel.includes('High') ? 'bg-red-500 text-red-500' : 'bg-cyan-500 text-cyan-500'}`} />
                   <div className="text-xs uppercase tracking-widest text-gray-300">Status: {riskLevel}</div>
                </div>
              </div>

              {/* Exposure Score (Das große Radar) */}
              <div className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 flex flex-col items-center justify-center py-12 shadow-[0_0_30px_rgba(34,211,238,0.05)] overflow-hidden">
                <TechCorners />
                {/* Score Background Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)]" />
                
                <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] mb-8 font-bold">Exposure Score</div>
                
                <div className="relative flex items-center justify-center">
                   {/* Animierte Score-Ringe */}
                   <div className="absolute w-36 h-36 rounded-full border-[3px] border-dashed border-cyan-500/40 animate-[spin_12s_linear_infinite]" />
                   <div className="absolute w-28 h-28 rounded-full border-[2px] border-cyan-400/60 animate-[spin_6s_linear_infinite_reverse]" />
                   <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_#22d3ee] z-10">
                     {score}
                   </div>
                </div>
                
                <div className="mt-8 text-cyan-600 text-[9px] tracking-[0.2em] text-center max-w-[200px] font-bold">
                  HÖHERER WERT BEDEUTET GRÖSSERE DIGITALE ANGRIFFSFLÄCHE
                </div>
              </div>
            </div>

            {/* RECHTE SPALTE: Zusammenfassung & Fundstellen */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Zusammenfassungs-Box (Hervorgehoben) */}
              <div className="relative border-l-4 border-l-cyan-500 border-y border-r border-cyan-500/30 bg-cyan-900/20 p-6 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                <div className="text-cyan-500 text-[10px] font-bold tracking-[0.3em] uppercase mb-4">KI-Analyse Zusammenfassung</div>
                <p className="text-gray-300 leading-relaxed font-sans text-base md:text-lg">
                  {apiResult?.summary}
                </p>
              </div>

              {/* Liste der Fundstellen (Findings) */}
              <div className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                <TechCorners />
                <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4">
                  <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] font-bold">Identifizierte Datenpunkte</div>
                  <div className="text-cyan-400 text-xs font-bold bg-cyan-950 px-3 py-1 border border-cyan-500/30">
                    TOTAL: {findings.length}
                  </div>
                </div>

                <div className="space-y-4">
                  {findings.map((finding, idx) => {
                    // Farben je nach Risiko-Level dynamisch anpassen
                    const risk = finding.risk?.toLowerCase() || "low";
                    let riskColors = "text-cyan-400 border-cyan-500/50 bg-cyan-500/10";
                    if (risk.includes("high") || risk.includes("hoch")) riskColors = "text-red-400 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
                    else if (risk.includes("medium") || risk.includes("mittel")) riskColors = "text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]";

                    return (
                      <div key={idx} className="group relative border border-cyan-900/50 bg-[#02070d]/60 p-4 hover:bg-cyan-900/30 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         
                         {/* Linke Seite: Zahl, Plattform, Detail */}
                         <div className="flex items-start gap-4 w-full">
                            <div className="text-cyan-800 font-black text-lg mt-0.5 border-r border-cyan-900 pr-3">
                              0{idx + 1}
                            </div>
                            <div className="flex-1">
                               <div className="text-cyan-300 font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_5px_#22d3ee]">
                                 {finding.title}
                               </div>
                               <div className="text-gray-400 text-xs mt-1.5 font-sans leading-relaxed">
                                 {finding.description}
                               </div>
                            </div>
                         </div>
                         
                         {/* Rechte Seite: Risiko-Badge */}
                         <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border shrink-0 ${riskColors}`}>
                            {finding.risk || "Info"}
                         </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Lade-Indikator am Ende der Liste (Simuliert den Deep-Scan im Hintergrund) */}
                <div className="mt-8 pt-6 border-t border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-4 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-[2px] border-cyan-900 border-t-cyan-400 animate-spin" />
                    <div className="text-[10px] text-cyan-500 font-bold tracking-[0.2em] uppercase">Deep-Scan im Hintergrund aktiv...</div>
                  </div>
                  <div className="w-full md:w-32 h-1 bg-[#02070d] rounded-full overflow-hidden border border-cyan-900/50">
                     <div className="h-full bg-cyan-500/50 w-1/3 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-8 pt-4">
                 <button 
                   onClick={onClose} 
                   className="px-6 py-4 border border-cyan-900 text-cyan-700 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-xs uppercase tracking-[0.2em] font-bold"
                 >
                    System verlassen
                 </button>
                 <button 
                   onClick={() => router.push('/register')} 
                   className="px-6 py-4 bg-[#041224] border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-[#02070d] transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] text-xs uppercase tracking-[0.2em] font-bold"
                 >
                    Vollständigen Deep-Scan anfordern
                 </button>
              </div>

            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}

// Eine kleine Hilfskomponente für die coolen Ecken an den Boxen
function TechCorners() {
  return (
    <>
      <div className="absolute top-0 left-0 w-4 h-4 border-t-[2px] border-l-[2px] border-cyan-500/70" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-[2px] border-r-[2px] border-cyan-500/70" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[2px] border-l-[2px] border-cyan-500/70" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[2px] border-r-[2px] border-cyan-500/70" />
    </>
  )
}
