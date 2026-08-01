"use client";

import type { ModuleStepState } from "@/lib/demo/scan-plan";
import { MODULE_META } from "@/lib/demo/scan-plan";

interface ModuleArcGaugeProps {
  step: ModuleStepState;
}

/** Cyber half-circle progress gauge for one Contabo module step. */
export default function ModuleArcGauge({ step }: ModuleArcGaugeProps) {
  const meta = MODULE_META[step.module];
  const color = meta?.color || "#70e7ff";
  const pct = Math.max(0, Math.min(100, step.progress));
  // Half-circle: 180° arc, circumference of semicircle ≈ π * r
  const r = 36;
  const circumference = Math.PI * r;
  const dash = (pct / 100) * circumference;

  const statusLabel =
    step.status === "running"
      ? "SCAN"
      : step.status === "done"
        ? "OK"
        : step.status === "error"
          ? "ERR"
          : step.status === "skipped"
            ? "SKIP"
            : "WAIT";

  const dim =
    step.status === "pending" || step.status === "skipped"
      ? "opacity-40"
      : "opacity-100";

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border border-white/[0.08] bg-[#03050a]/85 px-2 py-3 backdrop-blur-md transition-all duration-500 ${dim} ${
        step.status === "running"
          ? "border-cyber-cyan/40 shadow-[0_0_24px_rgba(41,182,246,0.15)]"
          : ""
      }`}
    >
      <svg
        viewBox="0 0 100 62"
        className="h-[52px] w-[88px] md:h-[64px] md:w-[108px]"
        aria-hidden="true"
      >
        <path
          d="M 10 54 A 40 40 0 0 1 90 54"
          fill="none"
          stroke="rgba(112,231,255,0.12)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 54 A 40 40 0 0 1 90 54"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-300 ease-out"
          style={{
            filter:
              step.status === "running"
                ? `drop-shadow(0 0 6px ${color})`
                : undefined,
          }}
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-white text-[14px] font-semibold"
          style={{ fontSize: 14 }}
        >
          {step.status === "done" ? step.findingCount : Math.round(pct)}
        </text>
      </svg>

      <div
        className="mt-0.5 font-mono text-[9px] tracking-[0.2em] uppercase"
        style={{ color }}
      >
        {step.label}
      </div>
      <div className="font-mono text-[8px] tracking-[0.16em] text-white/35 uppercase">
        {statusLabel}
        {step.status === "running" ? " · LIVE" : ""}
      </div>
      {step.message ? (
        <div className="mt-1 max-w-[7.5rem] truncate text-center text-[9px] text-white/40">
          {step.message}
        </div>
      ) : (
        <div className="mt-1 max-w-[7.5rem] truncate text-center text-[9px] text-white/30">
          {step.hint}
        </div>
      )}
    </div>
  );
}
