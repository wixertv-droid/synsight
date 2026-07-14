import type { RiskSignal } from "@/types/platform";
import StatusDot from "@/components/ui/StatusDot";

const levels = {
  low: {
    label: "LOW RISK",
    tone: "online" as const,
    styles: "border-emerald-300/10 bg-emerald-300/[0.02] text-emerald-100/60",
  },
  medium: {
    label: "MEDIUM RISK",
    tone: "warning" as const,
    styles: "border-amber-300/12 bg-amber-300/[0.025] text-amber-100/65",
  },
  high: {
    label: "HIGH RISK",
    tone: "danger" as const,
    styles: "border-rose-300/12 bg-rose-300/[0.025] text-rose-100/65",
  },
};

export default function RiskCard({ risk }: { risk: RiskSignal }) {
  const level = levels[risk.level];

  return (
    <article className={`rounded-xl border p-4 transition-all duration-300 hover:translate-x-1 ${level.styles}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[8px] tracking-[.15em]">
          <StatusDot tone={level.tone} />
          {level.label}
        </span>
        <span className="font-mono text-[7px] tracking-[.1em] text-white/18">
          {risk.source}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-medium text-white/78">{risk.title}</h3>
      <p className="mt-2 text-[11px] leading-relaxed text-white/32">
        {risk.description}
      </p>
    </article>
  );
}
