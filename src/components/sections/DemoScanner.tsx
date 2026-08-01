"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import {
  ScanPhase,
  ApiResult,
  ScanData,
  ScanQueries,
  ScanModule,
} from "./DemoScanner/types";
import ScannerOverlay from "./DemoScanner/ScannerOverlay";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type FieldKey = keyof ScanQueries;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  {
    key: "email",
    label: "E-Mail",
    placeholder: "name@domain.de",
    type: "email",
  },
  {
    key: "username",
    label: "Username",
    placeholder: "alias / handle",
  },
  {
    key: "phone",
    label: "Telefon",
    placeholder: "+49 …",
    type: "tel",
  },
  {
    key: "domain",
    label: "Domain",
    placeholder: "beispiel.de",
  },
  {
    key: "url",
    label: "URL",
    placeholder: "https://…",
    type: "url",
  },
];

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

function filledQueries(fields: ScanQueries): ScanQueries {
  const out: ScanQueries = {};
  for (const { key } of FIELDS) {
    const value = fields[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

export default function DemoScanner() {
  const router = useRouter();
  const { ref, isVisible } = useScrollAnimation();
  const aliveRef = useRef(true);

  const [fields, setFields] = useState<ScanQueries>({
    email: "",
    username: "",
    phone: "",
    domain: "",
    url: "",
  });
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [rawData, setRawData] = useState<ScanData | null>(null);

  const activeQueries = useMemo(() => filledQueries(fields), [fields]);
  const activeCount = Object.keys(activeQueries).length;
  const targetLabel = useMemo(
    () => Object.values(activeQueries).join(" · ") || "Unbekannt",
    [activeQueries]
  );

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const startScan = useCallback(async () => {
    const queries = filledQueries(fields);
    if (Object.keys(queries).length === 0 || phase === "scanning") return;

    setPhase("scanning");
    setProgress(0);
    setApiResult(null);
    setRawData(null);

    const scanPromise = fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queries),
    });

    const startedAt = Date.now();
    // Visual progress waits for API (Contabo tools can take 1–3 min).
    const progressTimer = setInterval(() => {
      if (!aliveRef.current) {
        clearInterval(progressTimer);
        return;
      }
      const elapsed = Date.now() - startedAt;
      const visual = Math.min(92, Math.floor((elapsed / 90_000) * 92));
      setProgress(visual);
    }, 120);

    try {
      const response = await scanPromise;
      const data = await response.json();
      if (!aliveRef.current) return;

      clearInterval(progressTimer);
      setProgress(100);

      if (data.status === "success") {
        const modules = (data.modules || []) as ScanModule[];
        const scanData: ScanData = {
          query: data.query ?? Object.values(queries).join(" · "),
          queries: data.queries ?? queries,
          queryType: String(data.query_type || "mixed"),
          findings: data.findings || [],
          modules,
          platforms: data.platforms ?? ["OSINT"],
          exposureScore: Number(data.exposure_score ?? 0) || 0,
          riskLevel: data.risk_level ?? "Erhöht",
          summary:
            data.summary ??
            `Multi-Modul-Analyse für „${Object.values(queries).join(" · ")}“ abgeschlossen.`,
          timestamp: data.timestamp || new Date().toISOString(),
          exposure_count: (data.findings || []).length,
          sources_found: modules.length || data.platforms?.length || 0,
        };

        setRawData(scanData);
        setApiResult({
          status: "success",
          data: scanData,
          riskLevel: scanData.riskLevel,
          summary: scanData.summary,
          findings: scanData.findings,
          modules: scanData.modules,
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
      clearInterval(progressTimer);
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
    }, 600);
  }, [fields, phase]);

  const closeFullscreen = () => {
    setPhase("complete");
  };

  const reset = () => {
    setPhase("idle");
    setFields({ email: "", username: "", phone: "", domain: "", url: "" });
    setProgress(0);
    setApiResult(null);
    setRawData(null);
  };

  const score = rawData?.exposureScore ?? 0;
  const tone = riskTone(apiResult?.riskLevel, score);
  const modules = rawData?.modules ?? [];
  const findingCount = rawData?.findings?.length ?? 0;

  return (
    <>
      <ScannerOverlay
        phase={phase}
        progress={progress}
        target={targetLabel}
        queries={activeQueries}
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
              Multi-Modul-Voranalyse über Holehe, Maigret, PhoneInfoga,
              theHarvester, Photon und SpiderFoot. Nur ausgefüllte Felder werden
              gescannt.
            </p>
          </div>

          <GlassCard
            hover={false}
            className="glass-strong relative overflow-hidden"
          >
            <div className="p-6 md:p-8">
              {phase === "idle" && (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
                    <div>
                      <h3 className="text-white text-xl tracking-[-.02em]">
                        Kostenloser Sicherheitscheck
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Felder optional — leere Eingaben werden ignoriert.
                      </p>
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-cyber-cyan/60">
                      {activeCount} Ziel(e) aktiv
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                    {FIELDS.map((field) => (
                      <label key={field.key} className="block text-left">
                        <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">
                          {field.label}
                        </span>
                        <input
                          value={fields[field.key] || ""}
                          onChange={(e) =>
                            setFields((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") startScan();
                          }}
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          maxLength={160}
                          className="w-full px-4 py-3.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyber-cyan/50"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <p className="text-xs text-white/35 max-w-md leading-relaxed">
                      Contabo Deep-Scan · echte Modul-Ergebnisse · kein
                      Simulieren der Trefferlisten.
                    </p>
                    <Button
                      size="lg"
                      onClick={startScan}
                      disabled={activeCount === 0}
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
                    MULTI-MODUL SCAN LÄUFT …
                  </div>
                  <p className="text-gray-500 text-sm mt-3">
                    Module können je nach Ziel 1–3 Minuten benötigen.
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
                        Modular Exposure Briefing
                      </h3>
                      <p className="mt-2 font-mono text-sm text-white/55 truncate max-w-[32rem]">
                        Ziele: {rawData?.query || targetLabel}
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
                        Module
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
                        {modules.length}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="font-mono text-[10px] tracking-[0.22em] text-cyber-cyan/70 uppercase">
                      Modul-Zusammenfassung
                    </div>
                    {modules.length === 0 ? (
                      <p className="text-sm text-white/50">
                        {apiResult?.summary || "Keine Moduldaten."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modules.map((mod) => (
                          <div
                            key={mod.id}
                            className="rounded-xl border border-white/[0.07] bg-[linear-gradient(145deg,rgba(41,182,246,0.06),rgba(7,11,19,0.35))] p-4"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase">
                                {mod.label}
                              </div>
                              <div className="font-mono text-[10px] text-cyber-cyan/70">
                                {mod.count}
                              </div>
                            </div>
                            <p className="text-sm text-white/55 leading-relaxed">
                              {mod.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-cyber-cyan/20 bg-[linear-gradient(145deg,rgba(41,182,246,0.08),rgba(7,11,19,0.35))] p-5 md:p-6">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
                    <div className="mb-3 font-mono text-[10px] tracking-[0.22em] text-cyber-cyan/70 uppercase">
                      Gesamt-Briefing
                    </div>
                    <p className="text-left text-base leading-relaxed text-white/80 md:text-[17px]">
                      {apiResult?.summary ?? "Analyse abgeschlossen."}
                    </p>
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
