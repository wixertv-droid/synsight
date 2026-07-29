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
  "Gleiche Hash-Signaturen ab...",
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
  const [input, setInput] = useState<string>("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const { ref, isVisible } = useScrollAnimation();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (phase !== "scanning") return;

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 3;
      if (progressValue > 95) progressValue = 95;
      setProgress(Math.floor(progressValue));
    }, 150);

    const logInterval = setInterval(() => {
      const randomLog = terminalLogs[Math.floor(Math.random() * terminalLogs.length)];
      const time = new Date().toISOString().split('T')[1].slice(0, -1);
      setLogs((prev) => [...prev, `[${time}] ${randomLog}`].slice(-20));
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

    const minWaitTime = new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      // WICHTIG: Hier nutzen wir /api/scan für den Proxy, nicht die Contabo-IP!
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();
      await minWaitTime; // Wartet die 5s Animation ab
      
      setProgress(100);
      
      if (data) {
        setApiResult({
          summary: data.summary || "Keine Zusammenfassung verfügbar.",
          riskLevel: data.risk_level || "Erhöhtes Risiko"
        });
      }
    } catch (error) {
      setProgress(100);
      setApiResult({
        summary: "Fehler: Analyse-Server nicht erreichbar.",
        riskLevel: "Offline"
      });
    } finally {
      setPhase("complete");
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
        </div>

        <GlassCard hover={false} className="glass-strong relative overflow-hidden ring-1 ring-white/[0.025]">
          <div className="relative z-10 p-6">
            
            {phase === "idle" && (
              <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startScan()}
                      placeholder="Ihre E-Mail-Adresse oder Ihr Name"
                      className="w-full px-5 py-4 bg-space-black/60 border border-cyber-blue/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyber-blue/50 transition-all"
                    />
                  </div>
                  <Button size="lg" onClick={startScan} disabled={!input.trim()}>
                    Kostenlos prüfen
                  </Button>
                </div>
              </div>
            )}

            {phase === "scanning" && (
              <div className="animate-fade-in flex flex-col items-center">
                <div className="text-3xl font-mono text-cyber-cyan font-bold mb-4">{progress}%</div>
                <div ref={terminalRef} className="w-full h-40 bg-[#0a0a0f] border border-cyber-cyan/20 rounded p-4 font-mono text-xs text-cyber-cyan/70 overflow-y-auto">
                  {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
              </div>
            )}

            {phase === "complete" && apiResult && (
              <div className="animate-fade-in">
                <div className="mb-6 text-cyber-cyan font-mono text-sm">ANALYSE ABGESCHLOSSEN</div>
                <div className="glass rounded-xl p-6 mb-8 border border-cyber-blue/30 bg-cyber-blue/[0.03]">
                  <div className="text-cyber-cyan text-xl font-bold mb-2">{apiResult.riskLevel}</div>
                  <p className="text-white leading-relaxed">{apiResult.summary}</p>
                </div>
                <Button onClick={reset}>Neue Suche</Button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
