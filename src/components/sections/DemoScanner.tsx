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

function riskTone(riskLevel?: string, score = 0) {
  const value = `${riskLevel ?? ""}`.toLowerCase();
  if (score >= 70 || /kritisch|critical|hoch|high/.test(value)) {
    return {
      chip: "border-red-400/30 bg-red-400/10 text-red-300",
      pulse: "bg-red-400",
    };
  }
  if (score >= 40 || /erhöht|mittel|medium/.test(value)) {
    return {
      chip: "border-amber-400/30 bg-amber-400/10 text-amber-200",
      pulse: "bg-amber-400",
    };
  }
  return {
    chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    pulse: "bg-emerald-400",
  };
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
      // ~16s visual progress — aligned with Contabo SpiderFoot poll window
    }, 160);

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
            `Öffentliche SpiderFoot-Analyse für '${input}' abgeschlossen.`,
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
        summary: "Der SpiderFoot-Analyse-Dienst konnte nicht erreicht werden.",
      });
    }

    if (!aliveRef.current) return;

    setTimeout(() => {
      if (aliveRef.current) setPhase("fullscreen_result");
    }, 800);
  }, [input, phase]);

  const closeFullscreen = () => {
    setPhase("complete");
  };

  const reset = () => {
    setPhase("idle");
    setInput("");
    setProgress(0);
    setApiResult(null);
    setRawData(null);
  };

  const score = rawData?.exposureScore ?? 0;
  const tone = riskTone(apiResult?.riskLevel, score);
  const findingCount = rawData?.findings?.length ?? 0;
  const platformCount = rawData?.platforms?.length ?? 0;

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
            <div className="p-6 md:p-8">
              {phase === "idle" && (
                <>
                  <h3 className="text-white text-xl mb-2 tracking-[-.02em]">
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
                      className="flex-1 px-5 py-4 rounded-lg bg-black/40 border border-white/10 text-white font-mono focus:outline-none focus:border-cyber-cyan/50"
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
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-cyber-cyan/30 bg-cyber-cyan/5">
                    <div className="h-7 w-7 rounded-full border-2 border-transparent border-t-cyber-cyan animate-spin" />
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.28em] text-cyber-cyan/80">
                    SCAN LÄUFT …
                  </div>
                  <p className="text-gray-500 text-sm mt-3">
                    Die Vollbild-Analyse ist aktiv. Bitte warten.
                  </p>
                </div>
              )}

              {phase === "complete" && (
                <div className="animate-fade-in space-y-6">
                  <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <span className="hud-label mb-3">
                        Voranalyse abgeschlossen
                      </span>
                      <h3 className="text-2xl font-semibold tracking-[-.03em] text-white">
                        Digital Exposure Briefing
                      </h3>
                      <p className="mt-2 font-mono text-sm text-white/55 truncate max-w-[28rem]">
                        Ziel: {rawData?.query || input || "Unbekannt"}
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] uppercase ${tone.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${tone.pulse} shadow-[0_0_8px_currentColor]`}
                      />
                      {apiResult?.riskLevel || "Unbekannt"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">
                        Exposure Score
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-cyber-cyan">
                        {score}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">
                        Datenpunkte
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
                        {findingCount}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">
                        Quellen
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
                        {platformCount}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-cyber-cyan/20 bg-[linear-gradient(145deg,rgba(41,182,246,0.08),rgba(7,11,19,0.35))] p-5 md:p-6">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="font-mono text-[10px] tracking-[0.22em] text-cyber-cyan/70 uppercase">
                        KI-Zusammenfassung
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <span className="h-px w-8 bg-cyber-cyan/30" />
                        <span className="font-mono text-[9px] tracking-[0.18em] text-white/30">
                          SYN|SIGHT CORE
                        </span>
                      </div>
                    </div>
                    <p className="text-left text-base leading-relaxed text-white/80 md:text-[17px]">
                      {apiResult?.summary ?? "Analyse abgeschlossen."}
                    </p>
                    {(rawData?.findings?.length ?? 0) > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {rawData!.findings.slice(0, 4).map((finding, idx) => (
                          <span
                            key={`${finding.title}-${idx}`}
                            className="rounded-md border border-white/[0.08] bg-black/25 px-2.5 py-1 font-mono text-[10px] tracking-wide text-white/55"
                          >
                            {finding.platform || finding.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-md text-sm leading-relaxed text-white/40">
                      Die Voranalyse ist abgeschlossen. Für den vollständigen
                      Deep-Scan und priorisierte Schutzmaßnahmen Konto
                      aktivieren.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button onClick={() => router.push("/register")}>
                        VOLLSTÄNDIGE ANALYSE AKTIVIEREN
                      </Button>
                      <Button variant="ghost" onClick={reset}>
                        Neuer Scan
                      </Button>
                    </div>
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
