"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { IntelligenceScanStep } from "@/lib/analysis/types";
import MissionProgressBar from "@/components/analysis/intelligence/MissionProgressBar";
import EntityGraphCanvas from "@/components/analysis/intelligence/EntityGraphCanvas";

const TERMINAL_LINES = [
  "Building Identity Fingerprint…",
  "Assembling Identity Matrix…",
  "Planning Search Vectors (max 15)…",
  "Querying Priority 1 · Name + Location…",
  "Querying Priority 2 · Name + Company…",
  "Querying Priority 3 · Exact Name…",
  "Querying Priority 4–5 · Email / Phone…",
  "Querying Priority 6–8 · Alias / Username / Domain…",
  "Entity Matching · Name / Alias / Contact…",
  "Entity Graph · Relationship Network…",
  "Live Hashes · Data Nodes correlating…",
  "Confidence Engine · Score Matrix…",
  "Duplicate Resolver · Profile Aggregation…",
  "Threat Matrix · Risk Evaluation…",
  "Timeline · Source Correlation…",
  "KI Summary · Digital Forensics Analyst…",
];

/**
 * Enterprise SOC Intelligence Scan — modern security-console aesthetic
 * (Sentinel / Chronicle / CrowdStrike inspired). Canvas graph + live terminal.
 */
export default function IntelligenceScanSequence({
  steps,
  minDurationMs,
  running,
  onComplete,
  subjectName,
  apiReady = false,
  rightPanel,
  engineProgress = null,
  engineProgressDetail = null,
}: {
  steps: IntelligenceScanStep[];
  minDurationMs: number;
  running: boolean;
  onComplete: () => void;
  subjectName: string;
  /** true sobald die Analyse-API fertig ist — erst dann darf der Balken 100 % erreichen */
  apiReady?: boolean;
  /** Optional panel on the right (e.g. live reverse-image scan) */
  rightPanel?: ReactNode;
  /**
   * Realer Fortschritt 0–100 (z. B. verglichene Bilder / Auswahl).
   * Wenn gesetzt, ersetzt die Zeit-Theater-Kurve (kein 94 %-Warten).
   */
  engineProgress?: number | null;
  /** Zusatztext rechts, z. B. „12/28 BILDER“ */
  engineProgressDetail?: string | null;
}) {
  const safeSteps = useMemo(() => (Array.isArray(steps) ? steps : []), [steps]);
  const [elapsed, setElapsed] = useState(0);
  const [entities, setEntities] = useState(0);
  const [edges, setEdges] = useState(0);
  const [signals, setSignals] = useState(0);
  const [deduped, setDeduped] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalIndexRef = useRef(0);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      setEntities(0);
      setEdges(0);
      setSignals(0);
      setDeduped(0);
      setTerminalLines([]);
      terminalIndexRef.current = 0;
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(ms);
      setEntities((v) => v + 2 + Math.floor(Math.random() * 5));
      setEdges((v) => v + 2 + Math.floor(Math.random() * 6));
      setSignals((v) => v + 4 + Math.floor(Math.random() * 8));
      if (ms > 4000) setDeduped((v) => v + (Math.random() > 0.5 ? 1 : 0));
    }, 70);

    const stream = window.setInterval(() => {
      const idx = terminalIndexRef.current % TERMINAL_LINES.length;
      terminalIndexRef.current += 1;
      const stamp = (Date.now() - started) / 1000;
      const line = `[${stamp.toFixed(1)}s] ${TERMINAL_LINES[idx]}`;
      setTerminalLines((prev) => [...prev.slice(-11), line]);
    }, 380);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(stream);
    };
  }, [running]);

  const activeIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < safeSteps.length; i += 1) {
      if (elapsed >= safeSteps[i].atMs) index = i;
    }
    return index;
  }, [elapsed, safeSteps]);

  useEffect(() => {
    if (!running || !apiReady) return;
    const targetMs = Math.max(
      minDurationMs,
      safeSteps.at(-1)?.atMs ?? minDurationMs
    );
    // Erst abschließen wenn Mindestanimation UND API fertig sind
    if (elapsed >= targetMs) {
      const timer = window.setTimeout(onComplete, 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [apiReady, elapsed, minDurationMs, onComplete, running, safeSteps]);

  const targetMs = Math.max(
    minDurationMs,
    safeSteps.at(-1)?.atMs ?? minDurationMs
  );
  const timeProgress = Math.min(100, Math.round((elapsed / targetMs) * 100));
  // Realer Engine-Fortschritt (z. B. Bildvergleich) — sonst Theater bis 94 %
  const progress =
    engineProgress != null
      ? apiReady
        ? 100
        : Math.max(0, Math.min(100, Math.round(engineProgress)))
      : !apiReady
        ? Math.min(94, timeProgress)
        : timeProgress >= 94 || elapsed >= targetMs
          ? 100
          : timeProgress;

  const progressRightLabel =
    engineProgress != null
      ? `${String(progress).padStart(3, "0")}%${
          engineProgressDetail ? ` · ${engineProgressDetail}` : ""
        }`
      : `${String(progress).padStart(3, "0")}%${
          !apiReady && progress >= 94 ? " · WARTE AUF ENGINE" : ""
        }`;

  if (!running) return null;

  const counters = [
    { label: "ENTITIES", value: entities },
    { label: "EDGES", value: edges },
    { label: "SIGNALS", value: signals },
    { label: "DEDUPED", value: deduped },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.2rem] border border-slate-500/25 bg-[#070b12]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(14,165,233,0.12), transparent 55%)",
        }}
        aria-hidden="true"
      />

      <div className="relative border-b border-white/[0.06] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[.18em] text-sky-300/70">
              OSINT RECON MATRIX · LIVE PIPELINE
            </p>
            <p className="mt-1 text-base text-white/85 md:text-lg">
              Subject · <span className="text-sky-200">{subjectName}</span>
            </p>
          </div>
          <div className="font-mono text-[10px] text-emerald-300/80">
            STATUS · {apiReady ? "FINALIZING" : "RUNNING"} ·{" "}
            {(elapsed / 1000).toFixed(1)}s
          </div>
        </div>

        {/* Landingpage-identischer Mission-Progress — nur Balken, Theater unverändert */}
        <MissionProgressBar
          progress={progress}
          leftLabel="PIPELINE"
          rightLabel={progressRightLabel}
        />
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r lg:border-white/[0.06]">
          <p className="mb-3 font-mono text-[8px] tracking-[.14em] text-white/35">
            ENTITY GRAPH · DATA POINTS
          </p>
          <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#05080e]">
            <EntityGraphCanvas running={running} height={240} nodeCount={64} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {counters.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-sm text-sky-200/90">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.06] bg-[#04070c]">
            <p className="border-b border-white/[0.05] px-3 py-1.5 font-mono text-[8px] tracking-[.14em] text-white/35">
              LIVE TERMINAL · CODE STREAM
            </p>
            <div className="h-[140px] space-y-1 overflow-hidden px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-300/75">
              {terminalLines.length === 0 ? (
                <p className="text-white/25">Initializing recon stream…</p>
              ) : (
                terminalLines.map((line) => (
                  <p key={line} className="truncate">
                    {line}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {rightPanel ?? (
            <>
              <p className="mb-3 font-mono text-[8px] tracking-[.14em] text-white/35">
                PHASE LOG · 8-STAGE PIPELINE
              </p>
              <ul className="space-y-1.5">
                {safeSteps.map((step, index) => {
                  const state =
                    index < activeIndex
                      ? "done"
                      : index === activeIndex
                        ? "active"
                        : "pending";
                  return (
                    <li
                      key={step.id}
                      className={`rounded-lg border px-3 py-2 transition ${
                        state === "active"
                          ? "border-sky-400/40 bg-sky-400/[0.08]"
                          : state === "done"
                            ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                            : "border-white/[0.05] bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[8px] ${
                            state === "done"
                              ? "text-emerald-300/80"
                              : state === "active"
                                ? "text-sky-300"
                                : "text-white/25"
                          }`}
                        >
                          {state === "done"
                            ? "✓"
                            : state === "active"
                              ? "●"
                              : "○"}
                        </span>
                        <span
                          className={`text-[12px] ${
                            state === "pending"
                              ? "text-white/30"
                              : "text-white/75"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {state === "active" ? (
                        <p className="mt-1 font-mono text-[9px] text-sky-200/50">
                          {step.terminal}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
