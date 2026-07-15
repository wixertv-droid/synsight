"use client";

import { useEffect, useState } from "react";
import { analysisSources } from "@/lib/platform-data";
import StatusDot from "@/components/ui/StatusDot";

export default function AnalysisWidget() {
  const [running, setRunning] = useState(true);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setRunning(false), 5200);
    return () => window.clearTimeout(timer);
  }, [running, cycle]);

  const restart = () => {
    setCycle((value) => value + 1);
    setRunning(true);
  };

  return (
    <section
      id="analysis-center"
      className="glass-strong hardware-panel relative min-h-[470px] overflow-hidden rounded-[1.4rem] border border-white/[0.08]"
    >
      <div className="flex min-h-16 items-center justify-between border-b border-white/[0.07] px-5 md:px-6">
        <div>
          <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
            KI ANALYSEZENTRUM
          </p>
          <p className="mt-1 text-[10px] text-white/22">
            Live-Korrelation digitaler Signale
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={running}
          className="flex items-center gap-2 rounded-lg border border-cyber-blue/15 bg-cyber-blue/[0.035] px-3 py-2 font-mono text-[8px] tracking-[.12em] text-cyber-cyan/60 transition-all hover:border-cyber-blue/30 disabled:cursor-default disabled:opacity-60"
        >
          <StatusDot pulse={running} tone={running ? "online" : "idle"} />
          {running ? "ANALYSE LÄUFT" : "NEUE ANALYSE"}
        </button>
      </div>

      <div className="grid min-h-[405px] md:grid-cols-[1fr_220px]">
        <div className="relative overflow-hidden border-b border-white/[0.06] p-5 md:border-b-0 md:border-r md:p-6">
          <div className="analysis-field absolute inset-0 opacity-45" aria-hidden="true">
            <div className={`analysis-scan-line absolute inset-x-0 h-20 ${running ? "block" : "hidden"}`} />
          </div>
          <svg viewBox="0 0 600 330" className="relative z-10 h-full min-h-[285px] w-full" aria-label="Visualisierung verbundener Datenquellen">
            <g stroke="rgba(112,231,255,.13)" strokeWidth="1" fill="none">
              <path d="M300 165 110 70M300 165 95 245M300 165 485 72M300 165 500 245M300 165 300 38" />
              <circle cx="300" cy="165" r="86" strokeDasharray="3 8" />
              <circle cx="300" cy="165" r="130" opacity=".45" />
            </g>
            <g fill="#70E7FF">
              {[
                [110, 70],
                [95, 245],
                [485, 72],
                [500, 245],
                [300, 38],
              ].map(([x, y], index) => (
                <g key={index}>
                  <circle cx={x} cy={y} r="4" opacity=".7" />
                  <circle cx={x} cy={y} r="12" fill="none" stroke="rgba(112,231,255,.16)" />
                </g>
              ))}
              <circle cx="300" cy="165" r="26" opacity=".12" />
              <circle cx="300" cy="165" r="7" />
            </g>
            <g fill="rgba(255,255,255,.34)" fontSize="9" fontFamily="monospace" letterSpacing="1.2">
              <text x="72" y="53">PROFILE</text>
              <text x="52" y="270">WEBSEITEN</text>
              <text x="462" y="53">ERWÄHNUNGEN</text>
              <text x="484" y="270">LEAKS</text>
              <text x="264" y="18">DATENQUELLEN</text>
            </g>
          </svg>
          <div className="absolute bottom-5 left-5 right-5 z-20 flex items-center justify-between font-mono text-[7px] tracking-[.12em] text-white/18 md:left-6 md:right-6">
            <span>SIGNALS / 247</span>
            <span>CORRELATION / ACTIVE</span>
            <span>QUEUE / 03</span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <p className="font-mono text-[8px] tracking-[.15em] text-white/25">
            QUELLENSTATUS
          </p>
          <div className="mt-5 space-y-4">
            {analysisSources.map((source, index) => (
              <div key={source.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] text-white/42">{source.label}</span>
                  <span className="font-mono text-[8px] tabular-nums text-cyber-cyan/45">
                    {source.value}%
                  </span>
                </div>
                <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-blue/45 to-cyber-cyan/75 transition-all duration-1000"
                    style={{
                      width: running
                        ? `${Math.max(12, source.value - index * 4)}%`
                        : `${source.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-white/[0.06] pt-5">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/22">
              AKTUELLER PROZESS
            </p>
            <p className="mt-3 text-[10px] leading-relaxed text-white/42">
              {running
                ? "Öffentliche Signale werden sicher korreliert und nach Relevanz bewertet."
                : "Analysezyklus abgeschlossen. Ergebnisse wurden dem Risikoprofil zugeordnet."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
