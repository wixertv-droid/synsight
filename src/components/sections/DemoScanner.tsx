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

const protectionBenefits = [
  "Vollständiger Identitäts- und Datenleck-Scan",
  "Kontinuierliche Überwachung neuer Risiken",
  "Priorisierte Handlungsempfehlungen statt Datenflut",
  "Persönlicher Schutzbericht zum Download",
];

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
    <section id="demo-scanner" className="section-shell relative section-padding overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.09),transparent_42rem)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label">
            04 / Risiko-Analyse
          </span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Wissen Sie, was das Internet{" "}
            <span className="cyber-gradient">über Sie weiß?</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Ein einziges geleaktes Passwort oder ein vergessenes Profil kann
            Ihre digitale Identität angreifbar machen. Der SynSight-Scanner
            zeigt, wo Handlungsbedarf besteht — und was Sie als Nächstes tun
            können.
          </p>
        </div>

        <GlassCard hover={false} className="glass-strong relative overflow-hidden ring-1 ring-white/[0.025]">
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
              <>
                <div className="mb-6">
                  <p className="text-white font-semibold mb-1">
                    Starten Sie Ihren kostenlosen Risiko-Check
                  </p>
                  <p className="text-sm text-gray-500">
                    In wenigen Sekunden erhalten Sie einen ersten Überblick.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startScan()}
                      placeholder="E-Mail-Adresse oder vollständiger Name"
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
                    {phase === "scanning"
                      ? "Risiken werden geprüft..."
                      : "Kostenlos prüfen"}
                  </Button>
                </div>
                {phase === "idle" && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                      <span className="text-cyber-cyan">✓</span> Unverbindliche
                      Demo
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-cyber-cyan">✓</span> Keine
                      Registrierung
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-cyber-cyan">✓</span> Keine echten
                      Datenabfragen
                    </span>
                  </div>
                )}
              </>
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

                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5 mb-8">
                  <p className="text-white font-semibold mb-2">
                    Ein mittleres Risiko ist kein Grund zur Panik — aber ein
                    klarer Grund zu handeln.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Sichtbare Profile, geleakte Zugangsdaten und öffentliche
                    Erwähnungen können miteinander verknüpft werden. SynSight
                    hilft Ihnen, die wichtigsten Risiken zuerst zu schließen,
                    bevor daraus ein echtes Problem entsteht.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-mono text-gray-500">
                    DEMO-ERGEBNIS — Beispielhafte Darstellung
                  </p>
                  <Button variant="secondary" onClick={reset}>
                    Andere Identität prüfen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <div
          className={`mt-10 transition-all duration-700 ${
            phase === "complete"
              ? "opacity-100 translate-y-0"
              : "opacity-70 translate-y-0"
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-cyber-blue/30 bg-gradient-to-br from-cyber-blue/[0.12] via-space-panel/95 to-cyber-cyan/[0.06] p-6 md:p-8 shadow-[0_0_50px_rgba(0,191,255,0.08)]">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyber-cyan/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-cyber-cyan/25 bg-cyber-cyan/10 px-3 py-1 font-mono text-[10px] tracking-widest text-cyber-cyan">
                  SYNSIGHT PROTECT
                </span>
                <h3 className="mt-5 text-2xl md:text-3xl font-bold text-white">
                  Erkennen ist der erste Schritt.
                  <br />
                  <span className="cyber-gradient">Schützen ist der entscheidende.</span>
                </h3>
                <p className="mt-4 max-w-xl text-sm md:text-base leading-relaxed text-gray-400">
                  Statt einzelne Fundstellen selbst zu bewerten, erhalten Sie
                  einen klaren Schutzplan: Was ist kritisch, was kann warten und
                  welche Maßnahme reduziert Ihr Risiko am stärksten?
                </p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {protectionBenefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-cyber-cyan/10 text-xs text-cyber-cyan">
                        ✓
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-cyber-blue/20 bg-space-black/55 p-6">
                <p className="font-mono text-xs tracking-wider text-cyber-blue/70">
                  IHR SCHUTZPAKET
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-bold text-white">19,90 €</span>
                  <span className="pb-1 text-sm text-gray-500">/ Monat</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Weniger als 0,67 € pro Tag für mehr Kontrolle über Ihre
                  digitale Identität.
                </p>
                <a
                  href="mailto:hello@synsight.de?subject=Interesse%20am%20SynSight%20Protect%20Paket"
                  className="mt-6 block"
                >
                  <span className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-6 py-4 font-semibold text-space-black transition-all duration-500 hover:brightness-110 hover:shadow-[0_14px_40px_rgba(0,191,255,0.22)]">
                    Schutzpaket auswählen
                  </span>
                </a>
                <div className="mt-4 space-y-2 text-xs text-gray-500">
                  <p className="flex items-center gap-2">
                    <span className="text-cyber-cyan">✓</span> Monatlich
                    kündbar
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-cyber-cyan">✓</span> Transparente
                    Ergebnisse ohne Fachjargon
                  </p>
                </div>
                <p className="mt-5 border-t border-white/5 pt-4 text-center text-[10px] leading-relaxed text-gray-600">
                  Der Button öffnet aktuell eine unverbindliche
                  Produktanfrage. Es erfolgt keine automatische Buchung.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
