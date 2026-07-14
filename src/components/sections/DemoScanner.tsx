"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type ScanPhase = "idle" | "scanning" | "complete";

interface ScanStep {
  text: string;
  delay: number;
}

const scanSteps: ScanStep[] = [
  { text: "Analyse gestartet...", delay: 0 },
  { text: "Öffentliche Datenquellen geprüft...", delay: 1200 },
  { text: "Risikoanalyse abgeschlossen...", delay: 2800 },
];

interface ResultCard {
  label: string;
  value: string;
  status: "safe" | "warning" | "danger";
}

const fakeResults: ResultCard[] = [
  { label: "Öffentliche Profile", value: "3 gefunden", status: "warning" },
  { label: "Datenlecks", value: "1 Warnung", status: "danger" },
  { label: "Digitale Erwähnungen", value: "12 Einträge", status: "safe" },
  { label: "Risiko-Score", value: "Mittel", status: "warning" },
];

const statusColors = {
  safe: "text-green-400 border-green-400/30",
  warning: "text-yellow-400 border-yellow-400/30",
  danger: "text-red-400 border-red-400/30",
};

export default function DemoScanner() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [scanAngle, setScanAngle] = useState(0);
  const { ref, isVisible } = useScrollAnimation();

  const startScan = useCallback(() => {
    if (!input.trim() || phase === "scanning") return;
    setPhase("scanning");
    setCurrentStep(0);
  }, [input, phase]);

  useEffect(() => {
    if (phase !== "scanning") return;

    const timers = scanSteps.map((step, i) =>
      setTimeout(() => setCurrentStep(i), step.delay)
    );

    const completeTimer = setTimeout(() => setPhase("complete"), 4000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "scanning") return;
    const interval = setInterval(() => {
      setScanAngle((a) => (a + 3) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, [phase]);

  const reset = () => {
    setPhase("idle");
    setCurrentStep(0);
    setInput("");
  };

  return (
    <section id="demo-scanner" className="relative section-padding overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-space-black via-space-panel/50 to-space-black pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="font-mono text-xs text-cyber-blue/50 tracking-[0.3em] uppercase">
            Live Demo
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            <span className="cyber-gradient">KI-Scanner</span> Demo
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Erleben Sie die SynSight-Analyse in Echtzeit. Geben Sie eine
            E-Mail oder einen Namen ein.
          </p>
        </div>

        <GlassCard hover={false} className="glass-strong relative overflow-hidden">
          {/* Scanner background */}
          {phase === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 300 300" className="w-64 h-64 opacity-20">
                <circle
                  cx="150"
                  cy="150"
                  r="120"
                  fill="none"
                  stroke="#00BFFF"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />
                <line
                  x1="150"
                  y1="150"
                  x2={150 + 120 * Math.cos((scanAngle * Math.PI) / 180)}
                  y2={150 + 120 * Math.sin((scanAngle * Math.PI) / 180)}
                  stroke="#00FFFF"
                  strokeWidth="2"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="80"
                  fill="none"
                  stroke="rgba(0,255,255,0.3)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          )}

          <div className="relative z-10">
            {/* Input area */}
            {phase !== "complete" && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startScan()}
                    placeholder="E-Mail oder Name eingeben"
                    disabled={phase === "scanning"}
                    className="w-full px-5 py-4 bg-space-black/60 border border-cyber-blue/20 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:shadow-[0_0_20px_rgba(0,191,255,0.15)] transition-all disabled:opacity-50"
                  />
                  {phase === "scanning" && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-scan-line" />
                    </div>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={startScan}
                  disabled={!input.trim() || phase === "scanning"}
                  className="sm:w-auto w-full"
                >
                  {phase === "scanning" ? "Analysiere..." : "Analyse starten"}
                </Button>
              </div>
            )}

            {/* Scan progress */}
            {phase === "scanning" && (
              <div className="space-y-3 mb-8">
                {scanSteps.map((step, i) => (
                  <div
                    key={step.text}
                    className={`flex items-center gap-3 font-mono text-sm transition-all duration-500 ${
                      i <= currentStep
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        i < currentStep
                          ? "bg-cyber-cyan"
                          : i === currentStep
                            ? "bg-cyber-blue animate-pulse"
                            : "bg-gray-600"
                      }`}
                    />
                    <span
                      className={
                        i <= currentStep ? "text-cyber-cyan" : "text-gray-600"
                      }
                    >
                      {step.text}
                    </span>
                  </div>
                ))}
                <div className="mt-4 h-1 bg-space-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-1000 ease-out"
                    style={{
                      width: `${((currentStep + 1) / scanSteps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {phase === "complete" && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
                  <p className="font-mono text-sm text-cyber-cyan">
                    ANALYSE ABGESCHLOSSEN — Ergebnisse für &quot;{input}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {fakeResults.map((result, i) => (
                    <div
                      key={result.label}
                      className="glass rounded-lg p-4 flex items-center justify-between glow-border transition-all duration-500"
                      style={{
                        animationDelay: `${i * 200}ms`,
                        opacity: 0,
                        animation: `fade-in-up 0.6s ease-out ${i * 200}ms forwards`,
                      }}
                    >
                      <span className="text-sm text-gray-400">
                        {result.label}
                      </span>
                      <span
                        className={`font-mono text-sm font-semibold px-3 py-1 rounded border ${statusColors[result.status]}`}
                      >
                        {result.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button variant="secondary" onClick={reset}>
                    Neue Analyse starten
                  </Button>
                </div>
              </div>
            )}

            {/* Idle state hint */}
            {phase === "idle" && (
              <div className="text-center py-4">
                <p className="font-mono text-xs text-gray-500">
                  DEMO-MODUS — Keine echten Daten werden abgefragt
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
