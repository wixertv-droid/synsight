"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { ScanPhase, ApiResult, ScanData } from "./DemoScanner/types";
import ScannerOverlay from "./DemoScanner/ScannerOverlay";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const scanStages = [
  "Initialisiere SynSight Intelligence Core",
  "Analysiere öffentliche Identitätsdaten",
  "Suche digitale Erwähnungen",
  "Korreliere Benutzernamen und Profile",
  "Prüfe öffentliche Datenquellen",
  "Analysiere technische Spuren",
  "Bewerte mögliche Exposure-Faktoren",
  "Berechne digitales Risikoprofil",
  "Generiere Voranalyse"
];

export default function DemoScanner() {
  const router = useRouter();
  const { ref, isVisible } = useScrollAnimation();

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [rawData, setRawData] = useState<ScanData | null>(null);

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") return;

    setPhase("scanning");
    setProgress(0);
    setApiResult(null);
    setRawData(null);

    const scanPromise = fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input })
    });

    let current = 0;
    let scanFinished = false;

    const scanInterval = setInterval(() => {
      current += 1;
      setProgress(current);
      if (current >= 100) {
        clearInterval(scanInterval);
        scanFinished = true;
      }
    }, 100);

    await new Promise((resolve) => {
      const wait = setInterval(() => {
        if (scanFinished) {
          clearInterval(wait);
          resolve(true);
        }
      }, 50);
    });

    try {
      const response = await scanPromise;
      const data = await response.json();

      if (data.status === "success") {
        const mappedFindings = (data.findings || []).map((f: { category?: string; title?: string; description?: string; detail?: string; platform?: string; risk?: string }) => ({
          category: f.category || "GENERAL",
          title: f.title || "Unbekanntes Finding",
          description: f.detail || f.description || "Keine Beschreibung verfügbar.",
          platform: f.platform || "Unbekannt",
          detail: f.detail || "",
          risk: (f.risk ? f.risk.toLowerCase() : "low") as "low" | "medium" | "high" 
        }));

        if (mappedFindings.length === 0) {
            mappedFindings.push({
                category: "OSINT",
                title: "Keine kritischen Treffer",
                description: "Es wurden in der Schnellanalyse keine direkten Treffer gefunden.",
                platform: "System",
                risk: "low"
            });
        }

        const scanData: ScanData = {
          query: data.query ?? input,
          queryType: (data.query_type ? data.query_type.toLowerCase() : "unknown") as "email" | "username" | "name" | "unknown",
          findings: mappedFindings,
          platforms: data.platforms ?? ["OSINT-Search"],
          exposureScore: data.exposure_score ?? 0,
          riskLevel: data.risk_level ?? "Erhöht",
          summary: data.summary ?? `Die Basis-Analyse für '${input}' wurde abgeschlossen.`,
          timestamp: new Date().toISOString(),
          exposure_count: mappedFindings.length,
          sources_found: data.platforms?.length ?? 0
        };

        setRawData(scanData);
        setApiResult({
          status: "success",
          data: scanData,
          riskLevel: scanData.riskLevel,
          summary: scanData.summary,
          findings: scanData.findings,
          platforms: scanData.platforms
        });
      } else {
        setApiResult({
          status: "error",
          message: data.message || "Analyse konnte nicht abgeschlossen werden.",
          riskLevel: "Keine Bewertung",
          summary: "Die öffentliche Analyse konnte nicht vollständig abgeschlossen werden."
        });
      }
    } catch (error) {
      console.error(error);
      setApiResult({
        status: "error",
        message: "Analyse Dienst nicht erreichbar.",
        riskLevel: "Offline",
        summary: "Der Analyse-Dienst konnte nicht erreicht werden."
      });
    }

    setTimeout(() => {
      setPhase("fullscreen_result");
    }, 800);

  }, [input, phase]);

  const closeFullscreen = () => {
    // Da das Overlay jetzt die Animation übernimmt, setzen wir es direkt auf complete
    setPhase("complete");
  };

  const reset = () => {
    setPhase("idle");
    setInput("");
    setProgress(0);
    setApiResult(null);
    setRawData(null);
  };

  return (
    <>
      <ScannerOverlay
        phase={phase}
        progress={progress}
        target={input}
        apiResult={apiResult}
        rawData={rawData}
        onClose={closeFullscreen}
      />

      <section id="demo-scanner" className="section-shell relative section-padding overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.12),transparent_42rem)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          
          {/* Überschrift wird ausgeblendet, sobald der Scan fertig ist */}
          {phase === "idle" && (
            <div
              ref={ref}
              className={`text-center mb-12 transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="hud-label">03 / FREE INTELLIGENCE SCAN</span>
              <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] mt-5 mb-7">
                Erkennen Sie Ihre <span className="cyber-gradient">digitale Angriffsfläche.</span>
              </h2>
              <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-relaxed">
                SynSight analysiert öffentlich sichtbare Informationen, digitale Spuren und mögliche Risikoindikatoren. Erhalten Sie eine erste Einschätzung Ihrer digitalen Präsenz.
              </p>
            </div>
          )}

          <GlassCard hover={false} className="glass-strong relative overflow-hidden">
            <div className="p-8">
              
              {/* EINGABE-PHASE (Links ausgerichtet + Cyber Look) */}
              {phase === "idle" && (
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-cyan-500 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                    <h3 className="text-cyan-400 font-mono text-sm tracking-[0.2em] uppercase">Intelligence Node</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-8 font-sans">
                    Ziel-Entität spezifizieren. Das System durchsucht offene Datenbanken, Leaks und Social-Graphen.
                  </p>

                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                    <div className="relative flex flex-col md:flex-row items-stretch bg-[#02070d] border border-cyan-500/30 rounded-lg overflow-hidden focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      <div className="flex items-center pl-5 pr-3 bg-cyan-950/30 border-r border-cyan-500/30">
                        <span className="text-cyan-500 font-mono text-sm tracking-widest font-bold">&gt;_</span>
                      </div>
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") startScan();
                        }}
                        placeholder="TARGET: E-Mail, Username oder Name"
                        className="flex-1 bg-transparent px-5 py-4 text-white font-mono text-sm placeholder:text-cyan-900 focus:outline-none"
                      />
                      <Button 
                        className="md:rounded-none rounded-t-none border-l border-cyan-500/30 px-8 bg-[#041224] hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 transition-all font-mono tracking-widest text-xs" 
                        onClick={startScan} 
                        disabled={!input.trim()}
                      >
                        SCAN STARTEN
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ERGEBNIS-PHASE (Links ausgerichtet + Terminal Look) */}
              {phase === "complete" && (
                <div className="text-left animate-fade-in">
                  <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/20 pb-4">
                    <div className="w-2 h-2 bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
                    <h3 className="text-cyan-400 font-mono text-sm tracking-[0.2em] uppercase">Scan Protokoll beendet</h3>
                  </div>

                  <div className="bg-[#02070d] border-l-2 border-cyan-500 p-6 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)] mb-8 relative">
                    <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </div>
                    <p className="text-gray-300 font-mono text-sm leading-relaxed">
                      {apiResult?.summary ?? "Analyse abgeschlossen. Es wurden keine weiteren Vektoren gemeldet."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => router.push("/register")} className="flex-1 bg-[#041224] border border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:bg-cyan-400 hover:text-black">
                      VOLLSTÄNDIGE ANALYSE AKTIVIEREN
                    </Button>
                    <Button variant="ghost" onClick={reset} className="border border-cyan-900 text-cyan-700 hover:text-cyan-400 hover:bg-cyan-900/30 font-mono tracking-widest text-xs uppercase">
                      Neues Ziel scannen
                    </Button>
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
