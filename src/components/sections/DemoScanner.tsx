"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type ScanPhase = "idle" | "scanning" | "complete";

// Coole Cyber-Logs für den Terminal-Effekt
const terminalLogs = [
  "Initialisiere sichere Verbindung...",
  "Routing über verschlüsselte Proxys...",
  "OSINT-Datenbanken werden synchronisiert...",
  "Scanne öffentliche Repositories...",
  "Deep-Web-Crawler gestartet...",
  "Analysiere Metadaten-Fragmente...",
  "Gleiche Hash-Signaturen ab (HaveIBeenPwned API)...",
  "Suche nach geleakten Passwörtern im Darknet...",
  "Korreliere Geo-IP-Pings...",
  "Extrahiere verknüpfte Social-Media-IDs...",
  "Bypassing Node-Security...",
  "Aggregiere Risiko-Faktoren...",
  "Kompiliere digitalen Fußabdruck...",
];

const protectionBenefits = [
  "Vollständiger Identitäts- und Datenleck-Scan",
  "Kontinuierliche Überwachung neuer Risiken",
  "Priorisierte Handlungsempfehlungen statt Datenflut",
  "Persönlicher Schutzbericht zum Download",
];

interface ApiResult {
  summary: string;
  riskLevel: string;
}

export default function DemoScanner() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const { ref, isVisible } = useScrollAnimation();
  
  // States für die Animationen
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
  // NEU: Ref für das Terminal-Fenster (nicht mehr das Ende der Seite)
  const terminalRef = useRef<HTMLDivElement>(null);

  // Gefixter Auto-Scroll: Scrollt nur innerhalb der Box, lässt die Seite in Ruhe!
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Der Animations-Loop während des Scannens
  useEffect(() => {
    if (phase !== "scanning") return;

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 3;
      if (progressValue > 95) progressValue = 95; // Hält bei 95% an, bis KI fertig ist
      setProgress(Math.floor(progressValue));
    }, 150);

    const logInterval = setInterval(() => {
      const randomLog = terminalLogs[Math.floor(Math.random() * terminalLogs.length)];
      const time = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
      setLogs(prev => [...prev, `[${time}] ${randomLog}`].slice(-20)); // Behält mehr Logs im Speicher
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [phase]);

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") return;
    setPhase("scanning");
    setLogs(["[SYSTEM] Initialisiere SynSight Cyber-Scan..."]);
    setProgress(0);
    setApiResult(null);

    const minWaitTime = new Promise(resolve => setTimeout(resolve, 5000)); // Mindestens 5 Sekunden Animation

    try {
      const apiCall = fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      }).then(res => res.json());

      const [data] = await Promise.all([apiCall, minWaitTime]);
      
      setProgress(100);
      
      if (data.status === "success") {
        setApiResult({
          summary: data.summary,
          riskLevel: data.risk_level || "Erhöhtes Risiko"
        });
      } else {
        setApiResult({
          summary: "Fehler bei der KI-Analyse: " + data.message,
          riskLevel: "Fehler"
        });
      }
    } catch (error) {
      setProgress(100);
      setApiResult({
        summary: "Netzwerkfehler: Der Analyse-Server ist momentan nicht erreichbar.",
        riskLevel: "Offline"
      });
    } finally {
      setTimeout(() => {
        setPhase("complete");
      }, 500); 
    }
  }, [input, phase]);

  const reset = () => {
    setPhase("idle");
    setInput("");
    setApiResult(null);
    setLogs([]);
    setProgress(0);
  };

  return (
    <section id="demo-scanner" className="section-shell relative section-padding overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.09),transparent_42rem)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div ref={ref} className={`text-center mb-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="hud-label">03 / Ihr Risiko-Check</span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Entdecken Sie Ihre <span className="cyber-gradient">digitale Spur.</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Erleben Sie, wie SynSight verstreute Signale zusammenführt, Risiken verständlich macht und daraus klare nächste Schritte entwickelt.
          </p>
        </div>

        <GlassCard hover={false} className="glass-strong relative overflow-hidden ring-1 ring-white/[0.025]">
          <div className="relative z-10" aria-busy={phase === "scanning"}>
            
            {phase === "idle" && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <p className="mb-1 font-semibold text-white">Die meisten unterschätzen, was online über sie auffindbar ist.</p>
                  <p className="text-sm leading-relaxed text-gray-500">
                    Prüfen Sie es jetzt — unverbindlich. Den vollständigen Überblick sichern Sie danach in wenigen Schritten mit einem Konto.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startScan()}
                      placeholder="Ihre E-Mail-Adresse oder Ihr Name"
                      className="w-full px-5 py-4 bg-space-black/60 border border-cyber-blue/20 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:shadow-[0_0_20px_rgba(0,191,255,0.15)] transition-all"
                    />
                  </div>
                  <Button size="lg" onClick={startScan} disabled={!input.trim()} className="sm:w-auto w-full">
                    Kostenlos prüfen
                  </Button>
                </div>
              </div>
            )}

            {phase === "scanning" && (
              <div className="animate-fade-in flex flex-col items-center">
                
                {/* 3D Cyber Radar Animation */}
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-cyber-cyan/30 animate-ping opacity-20" />
                  <div className="absolute inset-2 rounded-full border border-cyber-blue/50 animate-spin" style={{ animationDuration: '3s' }}>
                     <div className="w-2 h-2 bg-cyber-cyan rounded-full absolute -top-1 left-1/2 shadow-[0_0_10px_#00ffff]" />
                  </div>
                  <div className="absolute inset-6 rounded-full border border-dashed border-cyber-cyan/40 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
                  <div className="text-3xl font-mono text-cyber-cyan font-bold tracking-tighter shadow-cyber-cyan text-shadow">
                    {progress}%
                  </div>
                </div>

                {/* Terminal Feed - Jetzt mit sicherem, internem Scroll! */}
                <div className="w-full bg-[#0a0a0f] border border-cyber-cyan/20 rounded-lg p-4 font-mono text-xs text-cyber-cyan/80 h-40 overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                  {/* Blenden-Effekt oben und unten, pointer-events-none lässt Klicks durch */}
                  <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
                  
                  {/* Das ist die Box, die scrollt */}
                  <div ref={terminalRef} className="space-y-1 mt-2 h-full overflow-y-auto pb-8 scrollbar-hide">
                    {logs.map((log, i) => (
                      <div key={i} className="animate-fade-in-up whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="text-gray-500 mr-2">&gt;</span>{log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phase === "complete" && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
                  <p className="font-mono text-sm text-cyber-cyan">
                    ANALYSE ABGESCHLOSSEN — Ergebnisse für &quot;{input}&quot;
                  </p>
                </div>

                {apiResult && (
                  <div className="glass rounded-xl p-6 mb-8 border border-cyber-blue/30 bg-cyber-blue/[0.03] shadow-[0_0_30px_rgba(0,191,255,0.05)] transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-cyan"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono tracking-widest text-gray-400">KI-ZUSAMMENFASSUNG</span>
                      <span className="text-xs font-mono px-3 py-1 rounded bg-cyber-blue/10 text-cyber-cyan border border-cyber-cyan/20">
                        {apiResult.riskLevel}
                      </span>
                    </div>
                    <p className="text-white text-base leading-relaxed">
                      {apiResult.summary}
                    </p>
                  </div>
                )}

                <div className="mb-8 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
                  <p className="mb-2 font-semibold text-white">Das war nur die Oberfläche.</p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    Die KI hat erste Muster erkannt. Mit einem Konto speichert SynSight Ihren Status, kombiniert diese Daten mit echten Deep-Web-Scans und zeigt Ihnen, was zuerst geschützt werden sollte.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
                    <Button onClick={() => router.push("/register")} className="w-full sm:w-auto">
                      Persönlichen Schutzbereich öffnen
                    </Button>
                    <Button variant="ghost" onClick={reset} className="w-full sm:w-auto">
                      Neue Suche
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* SynSight Protect Banner */}
        <div className={`mt-10 transition-all duration-700 ${phase === "complete" ? "opacity-100 translate-y-0" : "opacity-70 translate-y-0"}`}>
          <div id="protect-package" className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-cyber-blue/30 bg-gradient-to-br from-cyber-blue/[0.12] via-space-panel/95 to-cyber-cyan/[0.06] p-6 md:p-8 shadow-[0_0_50px_rgba(0,191,255,0.08)]">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyber-cyan/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-cyber-cyan/25 bg-cyber-cyan/10 px-3 py-1 font-mono text-[10px] tracking-widest text-cyber-cyan">
                  SYNSIGHT PROTECT
                </span>
                <h3 className="mt-5 text-2xl md:text-3xl font-bold text-white">
                  Erkennen ist der erste Schritt.<br />
                  <span className="cyber-gradient">Schützen ist der entscheidende.</span>
                </h3>
                <p className="mt-4 max-w-xl text-sm md:text-base leading-relaxed text-gray-400">
                  Statt einzelne Fundstellen selbst zu bewerten, erhalten Sie einen klaren Schutzplan: Was ist kritisch, was kann warten und welche Maßnahme reduziert Ihr Risiko am stärksten?
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {protectionBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-cyber-cyan/10 text-xs text-cyber-cyan">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
