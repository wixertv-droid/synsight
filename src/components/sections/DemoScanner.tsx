"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type ScanPhase = "idle" | "scanning" | "complete";

interface ScanStep {
  text: string;
  delay: number;
}

const scanSteps: ScanStep[] = [
  { text: "Digitale Identität wird zugeordnet", delay: 0 },
  { text: "Öffentliche Quellen werden korreliert", delay: 1100 },
  { text: "KI bewertet Risiken und priorisiert", delay: 2500 },
];

const protectionBenefits = [
  "Vollständiger Identitäts- und Datenleck-Scan",
  "Kontinuierliche Überwachung neuer Risiken",
  "Priorisierte Handlungsempfehlungen statt Datenflut",
  "Persönlicher Schutzbericht zum Download",
];

// Neues Interface für unsere echte Server-Antwort
interface ApiResult {
  summary: string;
  riskLevel: string;
}

export default function DemoScanner() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const { ref, isVisible } = useScrollAnimation();

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") return;
    setPhase("scanning");
    setCurrentStep(0);
    setApiResult(null);

    // 1. Visuelle Animation starten (Cursor's Ladebalken)
    const timers = scanSteps.map((step, i) =>
      setTimeout(() => setCurrentStep(i), step.delay)
    );

    try {
      // 2. WÄHREND die Animation läuft, fragen wir unseren Server an!
      const response = await fetch("http://161.97.85.22:5000/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        setApiResult({
          summary: data.summary,
          riskLevel: data.risk_level || "Mittleres Risiko"
        });
      } else {
        setApiResult({
          summary: "Fehler bei der KI-Analyse: " + data.message,
          riskLevel: "Fehler"
        });
      }
    } catch (error) {
      setApiResult({
        summary: "Netzwerkfehler: Der Analyse-Server ist momentan nicht erreichbar.",
        riskLevel: "Offline"
      });
    } finally {
      // 3. Warten, bis die Animation (mind. 3.5s) garantiert fertig ist, dann Ergebnis zeigen
      setTimeout(() => {
        setPhase("complete");
      }, 3500); 
      
      // Timer aufräumen
      timers.forEach(clearTimeout);
    }
  }, [input, phase]);

  const reset = () => {
    setPhase("idle");
    setCurrentStep(0);
    setInput("");
    setApiResult(null);
  };

  return (
    <section
      id="demo-scanner"
      className="section-shell relative section-padding overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.09),transparent_42rem)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label">03 / Ihr Risiko-Check</span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Entdecken Sie Ihre{" "}
            <span className="cyber-gradient">digitale Spur.</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Erleben Sie, wie SynSight verstreute Signale zusammenführt, Risiken
            verständlich macht und daraus klare nächste Schritte entwickelt.
          </p>
        </div>

        <GlassCard
          hover={false}
          className="glass-strong relative overflow-hidden ring-1 ring-white/[0.025]"
        >
          {phase === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 300 300" className="w-64 h-64 opacity-20">
                <circle cx="150" cy="150" r="120" fill="none" stroke="#00BFFF" strokeWidth="1" strokeDasharray="4 8" />
                <g className="scanner-sweep">
                  <line x1="150" y1="150" x2="270" y2="150" stroke="#70E7FF" strokeWidth="1.5" />
                </g>
                <circle cx="150" cy="150" r="80" fill="none" stroke="rgba(0,255,255,0.3)" strokeWidth="0.5" />
              </svg>
            </div>
          )}

          <div className="relative z-10" aria-busy={phase === "scanning"}>
            {phase !== "complete" && (
              <>
                <div className="mb-6">
                  <p className="mb-1 font-semibold text-white">
                    Die meisten unterschätzen, was online über sie auffindbar ist.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-500">
                    Prüfen Sie es jetzt — unverbindlich. Den vollständigen
                    Überblick und Ihren persönlichen Schutzbereich sichern Sie
                    danach in wenigen Schritten mit einem SynSight-Konto.
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
                      disabled={phase === "scanning"}
                      className="w-full px-5 py-4 bg-space-black/60 border border-cyber-blue/20 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:shadow-[0_0_20px_rgba(0,191,255,0.15)] transition-all disabled:opacity-50"
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={startScan}
                    disabled={!input.trim() || phase === "scanning"}
                    className="sm:w-auto w-full"
                  >
                    {phase === "scanning" ? "Risiken werden geprüft..." : "Kostenlos prüfen"}
                  </Button>
                </div>
              </>
            )}

            {phase === "scanning" && (
              <div className="space-y-3 mb-8" role="status" aria-live="polite">
                {scanSteps.map((step, i) => (
                  <div
                    key={step.text}
                    className={`flex items-center gap-3 font-mono text-sm transition-all duration-500 ${
                      i <= currentStep ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        i < currentStep ? "bg-cyber-cyan" : i === currentStep ? "bg-cyber-blue animate-pulse" : "bg-gray-600"
                      }`}
                    />
                    <span className={i <= currentStep ? "text-cyber-cyan" : "text-gray-600"}>
                      {step.text}
                    </span>
                  </div>
                ))}
                <div className="mt-4 h-1 bg-space-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-1000 ease-out"
                    style={{ width: `${((currentStep + 1) / scanSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "complete" && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
                  <p className="font-mono text-sm text-cyber-cyan">
                    ANALYSE ABGESCHLOSSEN — Ergebnisse für "{input}"
                  </p>
                </div>

                {/* Hier kommt die echte KI-Antwort rein */}
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
                    Die KI hat erste Muster erkannt. Mit einem Konto speichert SynSight Ihren Status, 
                    kombiniert diese Daten mit echten Deep-Web-Scans und zeigt Ihnen, was zuerst 
                    geschützt werden sollte — bevor jemand anderes danach sucht.
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

        {/* SynSight Protect Banner bleibt erhalten */}
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
              <div className="rounded-xl border border-cyber-blue/20 bg-space-black/55 p-6">
                <p className="font-mono text-xs tracking-wider text-cyber-blue/70">SYNCREDITS</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">Flexibel aufladen</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Kein Abo — zahlen Sie nur für Analysen, die Sie wirklich starten.</p>
                <a href="#syncredits" className="mt-6 block">
                  <span className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-6 py-4 font-semibold text-space-black transition-all duration-500 hover:brightness-110 hover:shadow-[0_14px_40px_rgba(0,191,255,0.22)]">
                    SynCredits ansehen
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
