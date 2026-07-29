"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type ScanPhase = "idle" | "scanning" | "fullscreen_result" | "closing_crt" | "complete";

const terminalLogs = [
  "Bypassing Node-Security...",
  "Routing über verschlüsselte Proxys...",
  "OSINT-Datenbanken werden synchronisiert...",
  "Scanne öffentliche Repositories...",
  "Deep-Web-Crawler gestartet...",
  "Analysiere Metadaten-Fragmente...",
  "Gleiche Hash-Signaturen ab...",
];

export default function DemoScanner() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  
  // Speichert die finalen formatierten Daten
  const [apiResult, setApiResult] = useState<{ summary: string; riskLevel: string } | null>(null);
  
  // NEU: Speichert die exakten Rohdaten vom Server, damit du sie dir ansehen kannst
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const { ref, isVisible } = useScrollAnimation();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll für Logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Animations-Loop
  useEffect(() => {
    if (phase !== "scanning") return;

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 4;
      if (progressValue > 99) progressValue = 99; 
      setProgress(Math.floor(progressValue));
    }, 100);

    const logInterval = setInterval(() => {
      const randomLog = terminalLogs[Math.floor(Math.random() * terminalLogs.length)];
      const time = new Date().toISOString().split('T')[1].slice(0, -1);
      setLogs(prev => [...prev, `[${time}] ${randomLog}`].slice(-15));
    }, 300);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [phase]);

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") return;
    
    // Startet direkt in den Vollbild-HUD-Modus
    setPhase("scanning");
    setLogs(["[SYSTEM] INIT SYNSIGHT GLOBAL SCAN PROTOCOL..."]);
    setProgress(0);
    setApiResult(null);
    setRawData(null);

    const minWaitTime = new Promise(resolve => setTimeout(resolve, 6000)); // Längere Animation für das HUD

    try {
      const apiCall = fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      }).then(res => res.json());

      const [data] = await Promise.all([apiCall, minWaitTime]);
      
      setProgress(100);
      setRawData(data); // Die rohen Daten für dich sichern
      
      if (data.status === "success") {
        setApiResult({
          summary: data.summary,
          riskLevel: data.risk_level || "Erhöhtes Risiko"
        });
      } else {
        setApiResult({
          summary: "Fehler bei der Analyse: " + data.message,
          riskLevel: "Fehler"
        });
      }
    } catch (error) {
      setProgress(100);
      setRawData({ error: "Netzwerkfehler", details: error });
      setApiResult({
        summary: "Netzwerkfehler: Proxy nicht erreichbar.",
        riskLevel: "Offline"
      });
    } finally {
      // Nach dem Scan bleiben wir im Vollbild und zeigen die Rohdaten!
      setTimeout(() => {
        setPhase("fullscreen_result");
      }, 800); 
    }
  }, [input, phase]);

  const closeFullscreen = () => {
    // 1. Röhrenfernseher-Animation starten
    setPhase("closing_crt");
    
    // 2. Warten bis die Animation (0.6s) durch ist, dann zur normalen Box wechseln
    setTimeout(() => {
      setPhase("complete");
    }, 600);
  };

  const reset = () => {
    setPhase("idle");
    setInput("");
    setApiResult(null);
    setRawData(null);
    setLogs([]);
    setProgress(0);
  };

  return (
    <>
      {/* 
        Eingebettetes CSS für Jarvis HUD und Röhren-Effekt 
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes crt-off {
          0% { transform: scale(1, 1); opacity: 1; filter: brightness(1); }
          40% { transform: scale(1, 0.005); opacity: 1; filter: brightness(4); }
          70% { transform: scale(0.005, 0.005); opacity: 1; filter: brightness(4); }
          100% { transform: scale(0, 0); opacity: 0; filter: brightness(10); }
        }
        .animate-crt {
          animation: crt-off 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .hud-scanline {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 20vh;
          background: linear-gradient(to bottom, transparent, rgba(0, 255, 255, 0.2), transparent);
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }
      `}} />

      {/* --- VOLLBILD HUD & ROHDATEN ANSICHT --- */}
      {(phase === "scanning" || phase === "fullscreen_result" || phase === "closing_crt") && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl font-mono overflow-hidden ${phase === "closing_crt" ? "animate-crt" : "animate-in fade-in zoom-in duration-500"}`}>
          
          {/* Globale HUD Effekte */}
          <div className="absolute inset-0 border-[1px] border-cyber-cyan/20 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,255,255,0.05) 100%)' }}></div>
          <div className="hud-scanline"></div>
          
          {/* Ecken-Fadenkreuze */}
          <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-cyber-cyan/60"></div>
          <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-cyber-cyan/60"></div>
          <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-cyber-cyan/60"></div>
          <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-cyber-cyan/60"></div>

          {/* PHASE: SCANNING (JARVIS ANIMATION) */}
          {phase === "scanning" && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              
              <div className="absolute top-12 text-cyber-cyan/70 text-xs tracking-[0.5em] animate-pulse">
                S Y N S I G H T _ G L O B A L _ S C A N
              </div>

              {/* Riesiges rotierendes Radar */}
              <div className="relative w-96 h-96 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-cyber-cyan/30 animate-ping opacity-20" />
                <div className="absolute inset-4 rounded-full border-2 border-t-cyber-cyan border-transparent animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-10 rounded-full border border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
                <div className="absolute inset-16 rounded-full border border-cyber-blue/40 flex items-center justify-center bg-cyber-blue/5">
                  <span className="text-6xl font-bold text-cyber-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Ziel & Logs */}
              <div className="mt-12 text-center z-10 w-full max-w-2xl px-4">
                <div className="text-xl text-white mb-2 tracking-widest uppercase">Target: {input}</div>
                <div className="h-[2px] w-full bg-cyber-cyan/30 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-cyber-cyan shadow-[0_0_10px_#00ffff]" style={{ width: `${progress}%`, transition: 'width 0.2s' }}></div>
                </div>
                
                <div ref={terminalRef} className="h-32 text-left bg-black/50 border border-cyber-cyan/20 p-4 rounded overflow-hidden text-xs text-cyber-cyan/70 font-mono">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PHASE: FULLSCREEN RESULT (ROHDATEN ANZEIGEN) */}
          {phase === "fullscreen_result" && (
            <div className="relative z-10 w-full max-w-5xl max-h-screen overflow-y-auto p-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
              <div className="flex items-center justify-between mb-8 border-b border-cyber-cyan/30 pb-4">
                <h2 className="text-2xl text-cyber-cyan tracking-widest uppercase">
                  Scan-Rohdaten empfangen
                </h2>
                <Button onClick={closeFullscreen} className="bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                  System schließen (CRT OFF)
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Linke Seite: Deine formatierten Daten (wie sie der User später sehen würde) */}
                <div className="bg-cyber-blue/10 border border-cyber-blue/30 p-6 rounded-lg backdrop-blur-sm">
                  <h3 className="text-white mb-4 border-b border-white/10 pb-2">Frontend Ansicht</h3>
                  <div className="mb-4">
                    <span className="text-gray-400 text-xs">RISIKO LEVEL:</span>
                    <div className="text-cyber-cyan text-xl font-bold">{apiResult?.riskLevel}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">ZUSAMMENFASSUNG:</span>
                    <p className="text-white mt-1 leading-relaxed whitespace-pre-line">{apiResult?.summary}</p>
                  </div>
                </div>

                {/* Rechte Seite: Die knallharten Server-Rohdaten */}
                <div className="bg-black/80 border border-yellow-500/30 p-6 rounded-lg shadow-[inset_0_0_20px_rgba(255,255,0,0.05)]">
                  <h3 className="text-yellow-500 mb-4 border-b border-yellow-500/20 pb-2 flex justify-between">
                    <span>Backend Rohdaten (JSON)</span>
                    <span className="text-xs text-gray-500">Nur für Entwickler</span>
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Das ist der exakte Datenstrom, den die `api.py` von Contabo über die Next.js Brücke hierher gesendet hat. 
                    Wenn du hier nicht alle Daten von SpiderFoot siehst, liegt das daran, dass dein Python-Skript sie momentan herausfiltert, bevor es sie sendet.
                  </p>
                  <pre className="text-xs text-yellow-400/80 overflow-x-auto p-4 bg-black rounded border border-white/5">
                    {rawData ? JSON.stringify(rawData, null, 2) : "Keine Rohdaten verfügbar."}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- NORMALE SEITEN-ANSICHT (HINTERGRUND & NACH DEM SCHLIESSEN) --- */}
      <section id="demo-scanner" className="section-shell relative section-padding overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.09),transparent_42rem)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div ref={ref} className={`text-center mb-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <span className="hud-label">03 / Ihr Risiko-Check</span>
            <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
              Entdecken Sie Ihre <span className="cyber-gradient">digitale Spur.</span>
            </h2>
          </div>

          <GlassCard hover={false} className="glass-strong relative overflow-hidden ring-1 ring-white/[0.025]">
            <div className="relative z-10 p-2">
              
              {/* VOR DEM SCAN */}
              {phase === "idle" && (
                <div className="animate-fade-in">
                  <div className="mb-6">
                    <p className="mb-1 font-semibold text-white">System-Check initialisieren</p>
                    <p className="text-sm text-gray-500">Geben Sie eine E-Mail oder einen Namen ein, um das globale Radar zu aktivieren.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && startScan()}
                        placeholder="Ziel eingeben..."
                        className="w-full px-5 py-4 bg-space-black/60 border border-cyber-blue/20 rounded-lg text-white font-mono focus:outline-none focus:border-cyber-cyan"
                      />
                    </div>
                    <Button size="lg" onClick={startScan} disabled={!input.trim()}>
                      GLOBAL SCAN STARTEN
                    </Button>
                  </div>
                </div>
              )}

              {/* NACH DEM SCHLIESSEN (KOMPAKTE ANSICHT) */}
              {phase === "complete" && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
                    <p className="font-mono text-sm text-cyber-cyan">ANALYSE BEENDET — {input}</p>
                  </div>

                  {apiResult && (
                    <div className="glass rounded-xl p-6 mb-8 border border-cyber-blue/30 bg-cyber-blue/[0.03]">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono text-gray-400">KOMPAKT-BERICHT</span>
                        <span className="text-xs font-mono px-3 py-1 rounded bg-cyber-blue/10 text-cyber-cyan border border-cyber-cyan/20">
                          {apiResult.riskLevel}
                        </span>
                      </div>
                      <p className="text-white text-base leading-relaxed whitespace-pre-line">
                        {apiResult.summary}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => router.push("/register")}>Vollständigen Schutzbereich öffnen</Button>
                    <Button variant="ghost" onClick={reset}>Neuer Scan</Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  );
}
