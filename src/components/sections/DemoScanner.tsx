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
  const [logs, setLogs] = useState<string[]>([]);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [rawData, setRawData] = useState<ScanData | null>(null);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString("de-DE", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${text}`].slice(-12));
  };

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") {
      return;
    }

    setPhase("scanning");
    setProgress(0);
    setLogs([]);
    setApiResult(null);
    setRawData(null);

    addLog("SYN|SIGHT CORE ONLINE");

    // 1. API Fetch im Hintergrund starten (NICHT awaiten!)
    const scanPromise = fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: input })
    });

    // 2. Visuellen Timer starten (exakt 10 Sekunden)
    let current = 0;
    let scanFinished = false;

    const scanInterval = setInterval(() => {
      current += 1;
      setProgress(current);

      const stageIndex = Math.floor((current / 100) * scanStages.length);
      // Verhindern, dass undefinierte Logs hinzugefügt werden, wenn der Index springt
      if (scanStages[stageIndex] && current % 12 === 0) { 
        addLog(scanStages[stageIndex]);
      }

      if (current >= 100) {
        clearInterval(scanInterval);
        scanFinished = true;
      }
    }, 100);

    // 3. Warten, bis der visuelle Scanner (10 Sekunden) fertig ist
    await new Promise((resolve) => {
      const wait = setInterval(() => {
        if (scanFinished) {
          clearInterval(wait);
          resolve(true);
        }
      }, 50);
    });

    // 4. Jetzt erst auf die API-Antwort warten und verarbeiten
    try {
      const response = await scanPromise;
      const data = await response.json();

      addLog("Analyse abgeschlossen");

      if (data.status === "success") {
        const scanData: ScanData = {
          query: data.query ?? input,
          queryType: data.query_type ?? "unknown",
          findings: data.findings ?? [],
          platforms: data.platforms ?? [],
          exposureScore: data.exposure_score ?? 0,
          riskLevel: data.risk_level ?? "Niedrig",
          summary: data.summary ?? "Analyse abgeschlossen.",
          timestamp: new Date().toISOString(),
          exposure_count: data.exposure_count,
          sources_found: data.sources_found
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
          message: "Analyse konnte nicht abgeschlossen werden.",
          riskLevel: "Keine Bewertung",
          summary: "Die öffentliche Analyse konnte nicht vollständig abgeschlossen werden."
        });
      }

      // Verzögerung für den Phasen-Wechsel, damit das 100% Bild kurz stehen bleibt
      setTimeout(() => {
        setPhase("fullscreen_result");
      }, 800);

    } catch (error) {
      console.error(error);
      setApiResult({
        status: "error",
        message: "Analyse Dienst nicht erreichbar.",
        riskLevel: "Offline",
        summary: "Der Analyse-Dienst konnte nicht erreicht werden."
      });
      setPhase("fullscreen_result");
    }
  }, [input, phase]);

  const closeFullscreen = () => {
    setPhase("closing_crt");
    setTimeout(() => {
      setPhase("complete");
    }, 700);
  };

  const reset = () => {
    setPhase("idle");
    setInput("");
    setProgress(0);
    setLogs([]);
    setApiResult(null);
    setRawData(null);
  };

  return (
    <>
      <ScannerOverlay
        phase={phase}
        progress={progress}
        target={input}
        logs={logs}
        apiResult={apiResult}
        rawData={rawData}
        onClose={closeFullscreen}
      />

      <section
        id="demo-scanner"
        className="section-shell relative section-padding overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.12),transparent_42rem)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
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

          <GlassCard hover={false} className="glass-strong relative overflow-hidden">
            <div className="p-8">
              {phase === "idle" && (
                <>
                  <h3 className="text-white text-xl mb-2">Kostenloser Sicherheitscheck</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    E-Mail, Benutzername oder Name eingeben und erste digitale Spuren entdecken.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          startScan();
                        }
                      }}
                      placeholder="E-Mail, Username oder Name"
                      className="flex-1 px-5 py-4 rounded-lg bg-black/40 border border-cyan-400/20 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />

                    <Button size="lg" onClick={startScan} disabled={!input.trim()}>
                      INTELLIGENCE SCAN STARTEN
                    </Button>
                  </div>
                </>
              )}

              {phase === "complete" && (
                <div className="text-center animate-fade-in">
                  <div className="text-cyan-400 font-mono mb-6">SCAN ABGESCHLOSSEN</div>

                  <div className="border border-cyan-400/20 rounded-xl p-6 bg-cyan-400/5 mb-6">
                    <p className="text-white leading-relaxed">
                      {apiResult?.summary ?? "Analyse abgeschlossen."}
                    </p>
                  </div>

                  <Button onClick={() => router.push("/register")}>
                    VOLLSTÄNDIGE ANALYSE AKTIVIEREN
                  </Button>

                  <Button variant="ghost" onClick={reset}>
                    Neuer Scan
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  );
}
