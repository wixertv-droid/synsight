"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import {
  ScanPhase,
  ApiResult,
  ScanData,
  ScanFinding,
} from "./DemoScanner/types";
import ScannerOverlay from "./DemoScanner/ScannerOverlay";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

function mapFindings(
  findings: Array<{
    category?: string;
    title?: string;
    description?: string;
    detail?: string;
    platform?: string;
    risk?: string;
  }>
): ScanFinding[] {
  const mapped = (findings || []).map((f) => ({
    category: f.category || "GENERAL",
    title: f.title || "Unbekanntes Finding",
    description: f.detail || f.description || "Keine Beschreibung verfügbar.",
    platform: f.platform || "Unbekannt",
    detail: f.detail || "",
    risk: (f.risk ? f.risk.toLowerCase() : "low") as ScanFinding["risk"],
  }));

  if (mapped.length === 0) {
    mapped.push({
      category: "OSINT",
      title: "Keine kritischen Treffer",
      description:
        "Es wurden in der Schnellanalyse keine direkten Treffer gefunden.",
      platform: "System",
      detail: "",
      risk: "low",
    });
  }

  return mapped;
}

export default function DemoScanner() {
  const router = useRouter();
  const { ref, isVisible } = useScrollAnimation();
  const aliveRef = useRef(true);

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [rawData, setRawData] = useState<ScanData | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") {
      return;
    }

    setPhase("scanning");
    setProgress(0);
    setApiResult(null);
    setRawData(null);

    const scanPromise = fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input.trim() }),
    });

    let current = 0;
    let scanFinished = false;

    const scanInterval = setInterval(() => {
      current += 1;
      if (!aliveRef.current) {
        clearInterval(scanInterval);
        return;
      }
      setProgress(current);

      if (current >= 100) {
        clearInterval(scanInterval);
        scanFinished = true;
      }
    }, 100);

    await new Promise((resolve) => {
      const wait = setInterval(() => {
        if (scanFinished || !aliveRef.current) {
          clearInterval(wait);
          resolve(true);
        }
      }, 50);
    });

    if (!aliveRef.current) return;

    try {
      const response = await scanPromise;
      const data = await response.json();

      if (!aliveRef.current) return;

      if (data.status === "success") {
        const mappedFindings = mapFindings(data.findings || []);

        const scanData: ScanData = {
          query: data.query ?? input,
          queryType: (data.query_type
            ? String(data.query_type).toLowerCase()
            : "unknown") as ScanData["queryType"],
          findings: mappedFindings,
          platforms: data.platforms ?? ["OSINT-Search"],
          exposureScore: Number(data.exposure_score ?? 0) || 0,
          riskLevel: data.risk_level ?? "Erhöht",
          summary:
            data.summary ??
            `Die Basis-Analyse für '${input}' wurde abgeschlossen.`,
          timestamp: new Date().toISOString(),
          exposure_count: mappedFindings.length,
          sources_found: data.platforms?.length ?? 0,
        };

        setRawData(scanData);
        setApiResult({
          status: "success",
          data: scanData,
          riskLevel: scanData.riskLevel,
          summary: scanData.summary,
          findings: scanData.findings,
          platforms: scanData.platforms,
        });
      } else {
        setApiResult({
          status: "error",
          message: data.message || "Analyse konnte nicht abgeschlossen werden.",
          riskLevel: "Keine Bewertung",
          summary:
            "Die öffentliche Analyse konnte nicht vollständig abgeschlossen werden.",
        });
      }
    } catch (error) {
      console.error(error);
      if (!aliveRef.current) return;
      setApiResult({
        status: "error",
        message: "Analyse Dienst nicht erreichbar.",
        riskLevel: "Offline",
        summary: "Der Analyse-Dienst konnte nicht erreicht werden.",
      });
    }

    if (!aliveRef.current) return;

    setTimeout(() => {
      if (aliveRef.current) setPhase("fullscreen_result");
    }, 800);
  }, [input, phase]);

  const closeFullscreen = () => {
    // Overlay already played the CRT animation before calling this.
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

      <section
        id="demo-scanner"
        className="section-shell relative section-padding overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.12),transparent_42rem)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <div
            ref={ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <span className="hud-label">03 / FREE INTELLIGENCE SCAN</span>

            <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] mt-5 mb-7">
              Erkennen Sie Ihre{" "}
              <span className="cyber-gradient">digitale Angriffsfläche.</span>
            </h2>

            <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-relaxed">
              SynSight analysiert öffentlich sichtbare Informationen, digitale
              Spuren und mögliche Risikoindikatoren. Erhalten Sie eine erste
              Einschätzung Ihrer digitalen Präsenz.
            </p>
          </div>

          <GlassCard
            hover={false}
            className="glass-strong relative overflow-hidden"
          >
            <div className="p-8">
              {phase === "idle" && (
                <>
                  <h3 className="text-white text-xl mb-2">
                    Kostenloser Sicherheitscheck
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    E-Mail, Benutzername oder Name eingeben und erste digitale
                    Spuren entdecken.
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
                      maxLength={120}
                      className="flex-1 px-5 py-4 rounded-lg bg-black/40 border border-cyan-400/20 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />

                    <Button
                      size="lg"
                      onClick={startScan}
                      disabled={!input.trim()}
                    >
                      INTELLIGENCE SCAN STARTEN
                    </Button>
                  </div>
                </>
              )}

              {(phase === "scanning" ||
                phase === "fullscreen_result" ||
                phase === "closing_crt") && (
                <div className="text-center py-10">
                  <div className="text-cyan-400 font-mono text-sm tracking-[0.3em] animate-pulse">
                    SCAN LÄUFT …
                  </div>
                  <p className="text-gray-500 text-sm mt-3">
                    Die Vollbild-Analyse ist aktiv. Bitte warten.
                  </p>
                </div>
              )}

              {phase === "complete" && (
                <div className="text-center animate-fade-in">
                  <div className="text-cyan-400 font-mono mb-6">
                    SCAN ABGESCHLOSSEN
                  </div>

                  <div className="border border-cyan-400/20 rounded-xl p-6 bg-cyan-400/5 mb-6">
                    <p className="text-white leading-relaxed">
                      {apiResult?.summary ?? "Analyse abgeschlossen."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => router.push("/register")}>
                      VOLLSTÄNDIGE ANALYSE AKTIVIEREN
                    </Button>

                    <Button variant="ghost" onClick={reset}>
                      Neuer Scan
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
