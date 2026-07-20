"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import type { RiskLevel } from "@/types/platform";

const riskUi: Record<
  RiskLevel,
  { cls: string; label: string; tone: "online" | "warning" | "danger" }
> = {
  low: {
    cls: "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-100/70",
    label: "Niedrig",
    tone: "online",
  },
  medium: {
    cls: "border-amber-300/15 bg-amber-300/[0.04] text-amber-100/70",
    label: "Mittel",
    tone: "warning",
  },
  high: {
    cls: "border-rose-300/15 bg-rose-300/[0.04] text-rose-100/70",
    label: "Hoch",
    tone: "danger",
  },
};

export type ResultBoxStatus = "completed" | "empty" | "ready";

export default function AnalysisResultBox({
  id,
  title,
  help,
  tagline,
  status,
  statusLabel,
  riskScore,
  riskLevel,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  help: string;
  tagline: string;
  status: ResultBoxStatus;
  statusLabel: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const risk = riskLevel ? riskUi[riskLevel] : null;

  return (
    <article
      id={id}
      className="glass-strong hardware-panel scroll-mt-24 overflow-hidden rounded-[1.4rem] border border-white/[0.08]"
    >
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
            {status === "completed"
              ? "ERGEBNIS VERFÜGBAR"
              : status === "ready"
                ? "BEREIT FÜR ANALYSE"
                : "NOCH KEINE ANALYSE"}
          </p>
          <h3 className="mt-2 flex flex-wrap items-center text-xl font-medium text-white/90">
            {title}
            <InfoTooltip label={`Hilfe: ${title}`}>{help}</InfoTooltip>
          </h3>
          <p className="mt-1 text-[12px] text-white/40">{tagline}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
            <StatusDot
              tone={
                status === "completed"
                  ? (risk?.tone ?? "online")
                  : status === "ready"
                    ? "idle"
                    : "idle"
              }
              pulse={status === "completed"}
            />
            {statusLabel}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {status === "completed" && risk && typeof riskScore === "number" ? (
            <div
              className={`rounded-xl border px-4 py-3 text-right ${risk.cls}`}
            >
              <p className="font-mono text-[8px] tracking-[.14em]">RISIKO</p>
              <p className="mt-1 text-2xl font-semibold">{riskScore}</p>
              <p className="mt-1 text-[10px] tracking-wider">{risk.label}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={`analysis-box-${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-[8px] tracking-[.12em] text-white/45 transition hover:border-cyber-cyan/30 hover:text-cyber-cyan/80"
          >
            {open ? "ZUKLAPPEN" : "AUFKLAPPEN"}
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        id={`analysis-box-${id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.07] px-5 py-5 md:px-6 md:py-6">
            {status === "completed" && children ? (
              children
            ) : status === "ready" && children ? (
              children
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
                  NOCH KEIN ERGEBNIS
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Für „{title}“ wurde noch keine Analyse durchgeführt. Sobald
                  Sie sie im Analyse Center starten, erscheint der Report in
                  dieser Box.
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/35">
                  {help}
                </p>
                <Link
                  href="/dashboard/analysis"
                  className="mt-4 inline-flex rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/[0.08] px-4 py-2 text-xs font-medium text-cyber-cyan transition hover:border-cyber-cyan/50"
                >
                  Im Analyse Center starten
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
