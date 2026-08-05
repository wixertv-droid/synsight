"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  startTransition,
} from "react";
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
import { computeDemoExposureScore } from "@/lib/demo/demo-exposure-score";
import {
  DEMO_FIELD_TO_ANALYSIS_KEYS,
  type DemoFieldKey,
} from "@/lib/seo/module-maps";

type FieldKey = keyof ScanQueries;

const ALL_FIELDS: Array<{
  key: DemoFieldKey;
  label: string;
  placeholder: string;
  type?: string;
  help: string;
}> = [
  {
    key: "email",
    label: "E-Mail Adresse",
    placeholder: "name@domain.de",
    type: "email",
    help: "Prüft auf Daten-Leaks und verknüpfte Accounts.",
  },
  {
    key: "username",
    label: "Benutzername / Alias",
    placeholder: "z.B. shadow_99",
    help: "Durchsucht Foren & Social-Media-Plattformen.",
  },
  {
    key: "phone",
    label: "Telefonnummer",
    placeholder: "+49 151 ...",
    type: "tel",
    help: "Überprüft Provider-, Messenger- & Standortdaten.",
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

/** Only count filled values for fields that are currently visible (admin-active). */
function filledQueries(
  fields: ScanQueries,
  visibleKeys: DemoFieldKey[]
): ScanQueries {
  const out: ScanQueries = {};
  for (const key of visibleKeys) {
    const value = fields[key]?.trim();
    if (value) {
      // E-Mail muss ein @ enthalten, sonst wird sie noch nicht als gültig gezählt
      if (key === "email" && !value.includes("@")) {
        continue;
      }
      out[key] = value;
    }
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
  /** Until /api/pricing loads, show all fields; then only admin-active modules. */
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<DemoFieldKey[]>([
    "email",
    "username",
    "phone",
  ]);

  const visibleFields = useMemo(
    () => ALL_FIELDS.filter((field) => visibleFieldKeys.includes(field.key)),
    [visibleFieldKeys]
  );

  const activeQueries = useMemo(
    () => filledQueries(fields, visibleFieldKeys),
    [fields, visibleFieldKeys]
  );
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled || !body?.success) return;
        const activeKeys = new Set<string>(
          (
            (body.data?.analyses as Array<{ key: string }> | undefined) ?? []
          ).map((row) => row.key)
        );
        const next = (
          Object.keys(DEMO_FIELD_TO_ANALYSIS_KEYS) as DemoFieldKey[]
        ).filter((field) =>
          DEMO_FIELD_TO_ANALYSIS_KEYS[field].some((key) => activeKeys.has(key))
        );
        // If catalog is empty (misconfig), keep UX usable rather than blank form.
        if (next.length > 0) setVisibleFieldKeys(next);
      })
      .catch(() => {
        // Pricing unavailable — keep default fields for Contabo demo path.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const handleInputChange = (key: FieldKey, value: string) => {
    let formattedValue = value;

    // Telefonnummern-Intelligenz: 0 zu +49 umwandeln und nur Nummern/Plus/Leerzeichen erlauben
    if (key === "phone") {
      if (formattedValue.startsWith("0")) {
        formattedValue = "+49" + formattedValue.substring(1);
      }
      formattedValue = formattedValue.replace(/[^\d\s+]/g, "");
    }

    setFields((prev) => ({
      ...prev,
      [key]: formattedValue,
    }));
  };

  const startScan = useCallback(async () => {
    const queries = filledQueries(fields, visibleFieldKeys);
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
      startTransition(() => {
        setModuleSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? { ...s, status: "running", progress: 8, message: "Starte…" }
              : s
          )
        );
      });

      const tick = setInterval(() => {
        if (!aliveRef.current) return;
        startTransition(() => {
          setModuleSteps((prev) =>
            prev.map((s) =>
              s.id === step.id && s.status === "running"
                ? {
                    ...s,
                    progress: Math.min(88, s.progress + 3 + Math.random() * 4),
                  }
                : s
            )
          );
        });
      }, 700);
      tickTimers.push(tick);

      try {
        const result = await runModuleStep(step.query, step.module);
        clearInterval(tick);
        tickTimers = tickTimers.filter((t) => t !== tick);

        if (!aliveRef.current) return;

        if (result.ok) {
          allFindings.push(...result.findings);
          startTransition(() => {
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
          });
        } else {
          startTransition(() => {
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
          });
        }
      } catch (error) {
        clearInterval(tick);
        tickTimers = tickTimers.filter((t) => t !== tick);
        if (!aliveRef.current) return;
        startTransition(() => {
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
        });
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

    // Score explizit aus Modul-Findings (ohne SpiderFoot / Noise)
    const scored = computeDemoExposureScore(normalized.findings);

    const modules = (normalized.modules || []) as ScanModule[];
    for (const step of plan) {
      if (!modules.some((m) => m.id === step.module || m.id === step.id)) {
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
      exposureScore: scored.score,
      riskLevel: scored.risk,
      summary:
        scored.usableCount === 0
          ? normalized.summary
          : `Multi-Modul-Analyse für „${normalized.query}“: Exposure-Score ${scored.score}/100 (${scored.risk}) · ${scored.usableCount} öffentliche Signal(e).`,
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
  }, [fields, phase, visibleFieldKeys]);

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
            <span className="hud-label">03 / LIVE OSINT SCAN</span>

            <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] mt-5 mb-7">
              Ist Ihre Identität bereits{" "}
              <span className="cyber-gradient">kompromittiert?</span>
            </h2>

            <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-relaxed">
              Hacker benötigen oft nur ein einziges Puzzleteil, um ein digitales
              Profil zu übernehmen. Unser Scanner durchkämmt öffentliche
              Netzwerke nach Ihren Spuren. Geben Sie die Daten ein, die Sie
              überprüfen möchten.
            </p>
          </div>

          <GlassCard
            hover={false}
            className="glass-strong relative overflow-hidden shadow-2xl shadow-cyber-cyan/10"
          >
            <div className="p-6 md:p-8">
              {phase === "idle" && (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                    <div>
                      <h3 className="text-white text-xl font-medium tracking-tight mb-2">
                        Starten Sie Ihre Voranalyse
                      </h3>
                      <p className="text-sm text-gray-400">
                        Sie können ein, zwei oder alle drei Felder ausfüllen. Je
                        mehr Datenpunkte Sie angeben, desto präziser können
                        unsere KI-Module verborgene Zusammenhänge herstellen.
                      </p>
                    </div>
                    {activeCount > 0 && (
                      <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-full">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-cyan opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-cyan"></span>
                        </span>
                        <span className="font-mono text-xs text-cyber-cyan tracking-wider uppercase">
                          {activeCount} Ziel{activeCount > 1 ? "e" : ""} bereit
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {visibleFields.map((field) => (
                      <label key={field.key} className="block text-left group">
                        <span className="mb-2 block font-mono text-[11px] tracking-[0.15em] uppercase text-white/60 group-focus-within:text-cyber-cyan transition-colors">
                          {field.label}
                        </span>
                        <input
                          value={fields[field.key] || ""}
                          onChange={(e) =>
                            handleInputChange(field.key, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && activeCount > 0)
                              startScan();
                          }}
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          maxLength={160}
                          className="w-full px-4 py-4 rounded-lg bg-black/50 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyber-cyan/60 focus:bg-cyber-cyan/5 transition-all shadow-inner placeholder:text-white/20"
                        />
                        <span className="mt-2.5 block text-[11px] leading-snug text-gray-500">
                          {field.help}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between bg-black/30 p-5 rounded-xl border border-white/5">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-amber-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                          Wichtiger Hinweis zur Tiefe
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-400 leading-relaxed">
                        Dieser Scanner wertet im ersten Schritt Clearnet-Quellen
                        aus. Um tiefgreifende Leaks, Darkweb-Erwähnungen und
                        unzensierte Details zu sehen, benötigen Sie im Anschluss
                        ein Konto.
                      </p>
                    </div>

                    <Button
                      size="lg"
                      onClick={startScan}
                      disabled={activeCount === 0}
                      className="shrink-0 relative overflow-hidden"
                    >
                      <span className="relative z-10 font-bold tracking-wider">
                        SCAN STARTEN
                      </span>
                    </Button>
                  </div>
                </>
              )}

              {(phase === "scanning" ||
                phase === "fullscreen_result" ||
                phase === "closing_crt") && (
                <div className="text-center py-16">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cyber-cyan/30 bg-cyber-cyan/5 shadow-[0_0_30px_rgba(41,182,246,0.15)]">
                    <div className="h-8 w-8 rounded-full border-2 border-transparent border-t-cyber-cyan animate-spin" />
                  </div>
                  <div className="font-mono text-sm tracking-[0.28em] text-cyber-cyan/80 mb-4 font-bold">
                    ANALYSE WIRD DURCHGEFÜHRT ...
                  </div>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    {activeStepLabel ||
                      "Bitte warten Sie, während unsere Module das Netz nach Ihren Datenpunkten scannen."}
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
                        Öffentliche Datenpunkte
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
                        {findingCount}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">
                        Aktive Module
                      </div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
                        {modules.length}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="font-mono text-[10px] tracking-[0.22em] text-cyber-cyan/70 uppercase">
                      Modul-Zusammenfassung (Clearnet)
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
                              {mod.count} Treffer
                            </div>
                          </div>
                          <p className="text-sm text-white/55 leading-relaxed">
                            {mod.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-cyber-cyan/20 bg-[linear-gradient(145deg,rgba(41,182,246,0.08),rgba(7,11,19,0.35))] p-5 md:p-6 mt-6">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="max-w-2xl">
                        <div className="mb-3 font-mono text-[11px] tracking-[0.22em] font-bold text-cyber-cyan uppercase">
                          Deep-Web & Full-Scale Analyse freischalten
                        </div>
                        <p className="text-left text-sm leading-relaxed text-gray-300">
                          Wir haben soeben nur die Oberfläche angekratzt. Hacker
                          nutzen weitaus tiefere Datenbanken, Darknet-Leaks und
                          KI-Korrelationen, um Profile vollständig zu
                          übernehmen. Registrieren Sie sich jetzt, um den
                          vollständigen Bericht einzusehen und herauszufinden,
                          was wirklich über Sie im Netz zirkuliert.
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/register")}
                        className="shrink-0 whitespace-nowrap shadow-[0_0_20px_rgba(41,182,246,0.3)]"
                      >
                        VOLLSTÄNDIGEN BERICHT FREISCHALTEN
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 text-center">
                    <button
                      onClick={reset}
                      className="text-xs font-mono tracking-widest text-white/30 hover:text-white/60 transition-colors uppercase border-b border-transparent hover:border-white/30 pb-0.5"
                    >
                      Neuen Scan starten
                    </button>
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
