"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IntelligenceScanStep } from "@/lib/analysis/types";

const TERMINAL_LINES = [
  "Scanning Footprint…",
  "Building Identity Fingerprint…",
  "Querying Vector 1 · Direct Identifiers…",
  "Querying Vector 2 · Identity + Location…",
  "Querying Vector 3 · Professional…",
  "Querying Vector 4 · Alias Social…",
  "Querying Vector 5 · Business Profiles…",
  "Querying Vector 6 · Adult / Niche (Bing)…",
  "Querying Vector 7 · Public Records…",
  "Connecting Node cluster α…",
  "Connecting Node cluster β…",
  "Normalizing entities…",
  "Resolving duplicate hosts…",
  "Computing confidence matrix…",
  "Evaluating threat dimensions…",
  "Assembling KI-Lagebild payload…",
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
}: {
  steps: IntelligenceScanStep[];
  minDurationMs: number;
  running: boolean;
  onComplete: () => void;
  subjectName: string;
}) {
  const safeSteps = useMemo(() => (Array.isArray(steps) ? steps : []), [steps]);
  const [elapsed, setElapsed] = useState(0);
  const [entities, setEntities] = useState(0);
  const [edges, setEdges] = useState(0);
  const [signals, setSignals] = useState(0);
  const [deduped, setDeduped] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; r: number }>
  >([]);
  const terminalIndexRef = useRef(0);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      setEntities(0);
      setEdges(0);
      setSignals(0);
      setDeduped(0);
      setTerminalLines([]);
      nodesRef.current = [];
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
    if (!running) return;
    const targetMs = Math.max(
      minDurationMs,
      safeSteps.at(-1)?.atMs ?? minDurationMs
    );
    if (elapsed >= targetMs) {
      const timer = window.setTimeout(onComplete, 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [elapsed, minDurationMs, onComplete, running, safeSteps]);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 640;
      const h = 240;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Deutlich mehr Knoten für die Recon-Matrix
      if (nodesRef.current.length === 0) {
        nodesRef.current = Array.from({ length: 64 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          // doppelte Animationsgeschwindigkeit
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          r: 1.4 + Math.random() * 2.4,
        }));
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      frame += 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const nodes = nodesRef.current;
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      }

      // Edges: größere Reichweite + schnellere Sweep-Wahrnehmung
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.22 * (1 - dist / 110)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.fillStyle = "rgba(125, 211, 252, 0.9)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sweep doppelt so schnell
      const sweepX = ((frame * 4) % (w + 80)) - 40;
      const grad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.14)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 40, 0, 80, h);

      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [running]);

  const targetMs = Math.max(
    minDurationMs,
    safeSteps.at(-1)?.atMs ?? minDurationMs
  );
  const progress = Math.min(100, Math.round((elapsed / targetMs) * 100));

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
            STATUS · RUNNING · {(elapsed / 1000).toFixed(1)}s
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600/80 via-sky-400 to-cyan-300 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[8px] tracking-[.12em] text-white/35">
          <span>PIPELINE</span>
          <span className="text-sky-300/80">{progress}%</span>
        </div>
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r lg:border-white/[0.06]">
          <p className="mb-3 font-mono text-[8px] tracking-[.14em] text-white/35">
            ENTITY GRAPH · DATA POINTS
          </p>
          <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#05080e]">
            <canvas ref={canvasRef} className="block w-full" />
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
                      {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                    </span>
                    <span
                      className={`text-[12px] ${
                        state === "pending" ? "text-white/30" : "text-white/75"
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
        </div>
      </div>
    </section>
  );
}
