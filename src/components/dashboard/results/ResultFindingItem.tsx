"use client";

import { useState } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { DemoFinding } from "@/lib/dashboard/results-demo-data";
import type { RiskLevel } from "@/types/platform";

const severityUi: Record<RiskLevel, { label: string; cls: string }> = {
  low: {
    label: "NIEDRIG",
    cls: "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100/70",
  },
  medium: {
    label: "MITTEL",
    cls: "border-amber-300/20 bg-amber-300/[0.05] text-amber-100/70",
  },
  high: {
    label: "HOCH",
    cls: "border-rose-300/20 bg-rose-300/[0.05] text-rose-100/70",
  },
};

export default function ResultFindingItem({
  finding,
}: {
  finding: DemoFinding;
}) {
  const [open, setOpen] = useState(false);
  const severity = severityUi[finding.severity];

  return (
    <li className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <span
          className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 font-mono text-[7px] tracking-[.12em] ${severity.cls}`}
        >
          {severity.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1 text-sm font-medium text-white/82">
            {finding.label}
            <InfoTooltip label={`Erklärung: ${finding.label}`}>
              {finding.whyItMatters}
            </InfoTooltip>
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-white/38">
            {finding.detail}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`mt-1 h-4 w-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-white/[0.06] px-4 py-3">
            <div>
              <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
                WARUM IST DAS WICHTIG?
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                {finding.whyItMatters}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
                BEISPIEL-DETAILS · {finding.sourceHint.toUpperCase()}
              </p>
              <ul className="mt-2 space-y-1.5">
                {finding.evidence.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2 text-[11px] leading-snug text-white/40"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyber-cyan/60" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
