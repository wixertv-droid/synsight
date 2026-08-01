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
  ScanFinding,
  ModuleStepState,
} from "./DemoScanner/types";
import ScannerOverlay from "./DemoScanner/ScannerOverlay";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  buildScanPlan,
  initialModuleStates,
  MODULE_META,
} from "@/lib/demo/scan-plan";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

type FieldKey = keyof ScanQueries;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  type?: string;
  help: string;
  modules: string;
}> = [
  {
    key: "email",
    label: "E-Mail",
    placeholder: "name@domain.de",
    type: "email",
    help: "Beste Quelle für Account-Leaks und Korrelation.",
    modules: "Holehe → SpiderFoot",
  },
  {
    key: "username",
    label: "Username",
    placeholder: "alias / handle",
    help: "Social-/Foren-Profile und Alias-Cluster.",
    modules: "Maigret → SpiderFoot",
  },
  {
    key: "phone",
    label: "Telefon",
    placeholder: "+49 …",
    type: "tel",
    help: "Carrier-/Länder-Hinweise zur Nummer.",
    modules: "PhoneInfoga",
  },
  {
    key: "domain",
    label: "Domain",
    placeholder: "beispiel.de  (ohne https://)",
    help: "Nur Hostname, z. B. synsight.de — nicht die volle URL.",
    modules: "theHarvester → SpiderFoot",
  },
  {
    key: "url",
    label: "URL",
    placeholder: "https://synsight.de/…",
    type: "url",
    help: "Vollständige Seiten-URL für Web-Crawl (Photon).",
    modules: "Photon",
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
  return normalizeScanQueries(out);
}

async function runModuleStep(
  query: string,
  module: string
): Promise<{
  ok: boolean;
  findings: ScanFinding[];
  message?: string;
}> {
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, module }),
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }

  if (!data || data.status !== "success") {
    return {
      ok: false,
      findings: [],
      message:
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        `HTTP ${response.status}`,
    };
  }

  return {
    ok: true,
    findings: (data.findings as ScanFinding[]) || [],
    message:
      typeof data.summary === "string"
        ? data.summary
        : `${(data.findings as unknown[])?.length ?? 0} Treffer`,
  };
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
  const [moduleSteps, setModuleSteps] = useState<ModuleStepState[]>([]);
  const [activeStepLabel, setActiveStepLabel] = useState("");

  const activeQueries = useMemo(() => filledQueries(fields), [fields]);
  const activeCount = Object.keys(activeQueries).length;
  const plannedSteps = useMemo(
    () => buildScanPlan(activeQueries),
    [activeQueries]
  );
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
    const plan = buildScanPlan(queries);
    if (plan.length === 0 || phase === "scanning") return;

    setPhase("scanning");
    setProgress(0);
    setApiResult(null);
    setRawData(null);

    const states = initialModuleStates(plan);
    setModuleSteps(states);
    setActiveStepLabel(plan[0]?.label || "");

    const allFindings: ScanFinding[] = [];
    let tickTimers: ReturnType<typeof setInterval>[] = [];

    const clearTicks = () => {
      for (const t of tickTimers) clearInterval(t);
      tickTimers = [];
    };

    for (let i = 0; i < plan.length; i += 1) {
      if (!aliveRef.current) {
        clearTicks();
        return;
      }

      const step = plan[i];
      setActiveStepLabel(`${step.label} · ${step.hint}`);
      setModuleSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? { ...s, status: "running", progress: 8, message: "Starte…" }
            : s
        )
      );

      // Soft progress while Contabo works (real completion jumps to 100)
      const tick = setInterval(() => {
        if (!aliveRef.current) return;
        setModuleSteps((prev) =>
          prev.map((s) =>
            s.id === step.id && s.status === "running"
              ? {
                  ...s,
                  progress: Math.min(88, s.progress + 2 + Math.random() * 3),
                }
              : s
          )
        );
      }, 400);
      tickTimers.push(tick);

      try {
        const result = await runModuleStep(step.query, step.module);
        clearInterval(tick);
        tickTimers = tickTimers.filter((t) => t !== tick);

        if (!aliveRef.current) return;

        if (result.ok) {
          allFindings.push(...result.findings);
          setModuleSteps((prev) =>
            prev.map((s) =>
              s.id === step.id
                ? {
                    ...s,
                    status: "done",
                    progress: 100,
                    findingCount: result.findings.length,
                    message: `${result.findings.length} Signal(e)`,
                  }
                : s
            )
          );
        } else {
          setModuleSteps((prev) =>
            prev.map((s) =>
              s.id === step.id
                ? {
                    ...s,
                    status: "error",
                    progress: 100,
                    findingCount: 0,
                    message: result.message || "Fehler",
                  }
                : s
            )
          );
        }
      } catch (error) {
        clearInterval(tick);
        tickTimers = tickTimers.filter((t) => t !== tick);
        if (!aliveRef.current) return;
        setModuleSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  status: "error",
                  progress: 100,
                  message:
                    error instanceof Error ? error.message : "Netzwerkfehler",
                }
              : s
          )
        );
      }

      setProgress(Math.round(((i + 1) / plan.length) * 100));
    }

    clearTicks();
    if (!aliveRef.current) return;

    const normalized = normalizeUpstreamPayload({
      payloads: [
        {
          status: "success",
          findings: allFindings,
          scan_id: `seq-${Date.now()}`,
        },
      ],
      queries: queries as Record<string, string>,
    });

    const modules = (normalized.modules || []) as ScanModule[];
    // Ensure every planned module appears in summary even if empty
    for (const step of plan) {
      const id = step.module === "spiderfoot" ? "SpiderFoot" : step.module;
      if (!modules.some((m) => m.id === id || m.id === step.module)) {
        modules.push({
          id: step.module,
          label: MODULE_META[step.module].label,
          status: "empty",
          findings: [],
          count: 0,
          summary: "Keine Treffer in diesem Modul",
        });
      }
    }

    const scanData: ScanData = {
      query: normalized.query,
      queries,
      queryType: String(normalized.queryType || "mixed"),
      findings: normalized.findings,
      modules,
      platforms: normalized.platforms,
      exposureScore: normalized.exposure_score,
      riskLevel: normalized.risk_level,
      summary: normalized.summary,
      timestamp: normalized.timestamp,
      exposure_count: normalized.findings.length,
      sources_found: modules.length,
    };

    setRawData(scanData);
    setApiResult({
      status: allFindings.length > 0 || plan.length > 0 ? "success" : "error",
      data: scanData,
      riskLevel: scanData.riskLevel,
      summary: scanData.summary,
      findings: scanData.findings,
      modules: scanData.modules,
      platforms: scanData.platforms,
      message:
        allFindings.length === 0
          ? "Module durchgelaufen — keine öffentlichen Treffer."
          : undefined,
    });
    setProgress(100);
    setActiveStepLabel("Abgeschlossen");

    setTimeout(() => {
      if (aliveRef.current) setPhase("fullscreen_result");
    }, 700);
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
    setModuleSteps([]);
    setActiveStepLabel("");
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
        moduleSteps={moduleSteps}
        activeStepLabel={activeStepLabel}
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
              Module laufen nacheinander: Holehe, Maigret, PhoneInfoga,
              theHarvester, Photon und SpiderFoot. Je mehr Felder, desto
              vollständiger — ohne Parallel-Timeout.
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
                        Kostenloser Multi-Modul-Check
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Felder optional. Leere Eingaben werden übersprungen.
                        Pipeline: {plannedSteps.length} Schritt(e) geplant.
                      </p>
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-cyber-cyan/60">
                      {activeCount} Ziel(e) · {plannedSteps.length} Module
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                    {FIELDS.map((field) => (
                      <label key={field.key} className="block text-left">
                        <span className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">
                            {field.label}
                          </span>
                          <span className="font-mono text-[9px] tracking-[0.12em] text-cyber-cyan/45">
                            {field.modules}
                          </span>
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
                        <span className="mt-1.5 block text-[11px] leading-snug text-white/35">
                          {field.help}
                        </span>
                      </label>
                    ))}
                  </div>

                  {plannedSteps.length > 0 ? (
                    <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="font-mono text-[9px] tracking-[0.18em] text-white/35 uppercase mb-1.5">
                        Geplante Reihenfolge
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {plannedSteps.map((step, idx) => (
                          <span
                            key={step.id}
                            className="rounded border border-cyber-cyan/20 bg-cyber-cyan/5 px-2 py-0.5 font-mono text-[10px] text-cyber-cyan/80"
                          >
                            {idx + 1}. {step.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <p className="text-xs text-white/35 max-w-md leading-relaxed">
                      Für maximale Tiefe: E-Mail + Username + Domain. Module
                      werden strikt nacheinander auf Contabo ausgeführt.
                    </p>
                    <Button
                      size="lg"
                      onClick={startScan}
                      disabled={activeCount === 0}
                    >
                      SEQUENZ-SCAN STARTEN
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
                    MODULE LAUFEN SEQUENZIELL …
                  </div>
                  <p className="text-gray-500 text-sm mt-3">
                    {activeStepLabel ||
                      "Bitte warten — Vollbild-Analyse aktiv."}
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
                      Die sequenzielle Voranalyse ist abgeschlossen. Für den
                      vollständigen Deep-Scan Konto aktivieren.
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
