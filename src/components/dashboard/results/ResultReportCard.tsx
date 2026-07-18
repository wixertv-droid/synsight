"use client";

import { useState } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import ResultFindingItem from "@/components/dashboard/results/ResultFindingItem";
import type { DemoAnalysisResult } from "@/lib/dashboard/results-demo-data";
import type { RiskLevel } from "@/types/platform";

const riskStyles: Record<
  RiskLevel,
  {
    badge: string;
    bar: string;
    tone: "online" | "warning" | "danger";
    label: string;
  }
> = {
  low: {
    badge: "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-100/70",
    bar: "from-emerald-400 to-cyber-cyan",
    tone: "online",
    label: "Niedrig",
  },
  medium: {
    badge: "border-amber-300/15 bg-amber-300/[0.04] text-amber-100/70",
    bar: "from-amber-300 to-orange-400",
    tone: "warning",
    label: "Mittel",
  },
  high: {
    badge: "border-rose-300/15 bg-rose-300/[0.04] text-rose-100/70",
    bar: "from-rose-400 to-amber-300",
    tone: "danger",
    label: "Hoch",
  },
};

const statusLabel: Record<string, string> = {
  completed: "Abgeschlossen",
  partial: "Teilweise",
  queued: "In Warteschlange",
};

const priorityCls = {
  Jetzt: "text-rose-100/70",
  "Diese Woche": "text-amber-100/70",
  Optional: "text-white/40",
} as const;

export default function ResultReportCard({
  result,
  defaultOpen = false,
}: {
  result: DemoAnalysisResult;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const risk = riskStyles[result.riskLevel];

  return (
    <article
      id={result.id}
      className="glass-strong hardware-panel scroll-mt-24 overflow-hidden rounded-[1.4rem] border border-white/[0.08]"
    >
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
            ANALYSE STATUS · {statusLabel[result.status]?.toUpperCase()}
          </p>
          <h3 className="mt-2 flex flex-wrap items-center text-xl font-medium text-white/90">
            {result.title}
            <InfoTooltip label={`Hilfe: ${result.title}`}>
              {result.help}
            </InfoTooltip>
          </h3>
          <p className="mt-1 text-[12px] text-cyber-cyan/60">
            {result.tagline}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
            <StatusDot tone={risk.tone} pulse={result.status !== "completed"} />
            {result.statusLabel} · {result.findings.length} Fund
            {result.findings.length === 1 ? "" : "e"}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <div
            className={`rounded-xl border px-4 py-3 text-right ${risk.badge}`}
          >
            <p className="font-mono text-[8px] tracking-[.14em]">RISIKO</p>
            <p className="mt-1 text-2xl font-semibold">{result.riskScore}</p>
            <p className="mt-1 text-[10px] tracking-wider opacity-80">
              {risk.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={`result-body-${result.id}`}
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
        id={`result-body-${result.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.07]">
            <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[1.25fr_.75fr]">
              <div className="bg-[#050a13]/95 p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                    GEFUNDENE INFORMATIONEN
                  </h4>
                  <InfoTooltip label="Funde aufklappen">
                    Tippen Sie auf einen Fund, um Details, Bedeutung und
                    Beispielnachweise zu sehen — auch ohne Vorwissen
                    verständlich.
                  </InfoTooltip>
                </div>
                <p className="mb-4 text-[12px] leading-relaxed text-white/40">
                  {result.summary}
                </p>
                <ul className="space-y-2.5">
                  {result.findings.map((finding) => (
                    <ResultFindingItem key={finding.id} finding={finding} />
                  ))}
                </ul>
              </div>

              <div className="space-y-6 bg-[#050a13]/95 p-5 md:p-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      WAS BEDEUTET DAS?
                    </h4>
                    <InfoTooltip label="Risiko erklären">
                      Der Score von 0–100 fasst zusammen, wie auffällig und
                      missbrauchbar die gefundenen öffentlichen Informationen
                      wirken. Höher = mehr Handlungsbedarf.
                    </InfoTooltip>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${risk.bar}`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-white/40">
                    {result.whatThisMeans}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      EMPFEHLUNGEN
                    </h4>
                    <InfoTooltip label="Empfehlungen">
                      Konkrete Schritte, die Sie selbst umsetzen können. „Jetzt“
                      zuerst erledigen.
                    </InfoTooltip>
                  </div>
                  <ol className="mt-4 space-y-3">
                    {result.recommendations.map((item, index) => (
                      <li
                        key={item.title}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-medium text-white/75">
                            <span className="mr-2 font-mono text-[8px] text-cyber-cyan/45">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {item.title}
                          </p>
                          <span
                            className={`shrink-0 font-mono text-[7px] tracking-[.12em] ${priorityCls[item.priority]}`}
                          >
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/38">
                          {item.detail}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
