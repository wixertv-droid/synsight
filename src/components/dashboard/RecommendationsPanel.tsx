"use client";

import { useState } from "react";
import { recommendations } from "@/lib/platform-data";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";

export default function RecommendationsPanel() {
  const [completed, setCompleted] = useState<string[]>([]);

  return (
    <section className="glass hardware-panel rounded-[1.4rem] p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
            WIR EMPFEHLEN
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/28">
            Priorisiert durch die SynSight KI
            <InfoTooltip label="Empfehlungen">
              {guidance.dashboard.recommendations}
            </InfoTooltip>
          </p>
        </div>
        <span className="font-mono text-[8px] text-white/18">
          {completed.length}/{recommendations.length} ERLEDIGT
        </span>
      </div>
      <div className="mt-6 space-y-3">
        {recommendations.map((item, index) => {
          const done = completed.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setCompleted((current) =>
                  done
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id]
                )
              }
              className={`group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                done
                  ? "border-emerald-300/10 bg-emerald-300/[0.02] opacity-60"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-cyber-blue/18 hover:bg-cyber-blue/[0.025]"
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg border font-mono text-[8px] ${done ? "border-emerald-300/20 text-emerald-200/60" : "border-white/[0.08] text-white/25"}`}
              >
                {done ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span
                  className={`block text-xs font-medium ${done ? "text-white/38 line-through" : "text-white/72"}`}
                >
                  {item.title}
                </span>
                <span className="mt-1.5 block text-[10px] leading-relaxed text-white/25">
                  {item.description}
                </span>
              </span>
              <span className="rounded border border-cyber-blue/12 bg-cyber-blue/[0.025] px-2 py-1 font-mono text-[7px] tracking-[.1em] text-cyber-cyan/45">
                {item.priority}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
