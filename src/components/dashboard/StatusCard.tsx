import type { DashboardMetric } from "@/types/platform";

const toneStyles = {
  cyan: "text-cyan-100 border-cyber-blue/15 bg-cyber-blue/[0.035]",
  amber: "text-amber-100 border-amber-300/12 bg-amber-300/[0.025]",
  green: "text-emerald-100 border-emerald-300/12 bg-emerald-300/[0.025]",
  red: "text-rose-100 border-rose-300/12 bg-rose-300/[0.025]",
};

export default function StatusCard({
  metric,
  index,
}: {
  metric: DashboardMetric;
  index: number;
}) {
  return (
    <article className="glass hardware-panel group min-h-[170px] rounded-2xl p-5 transition-all duration-500 hover:border-cyber-blue/22">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-[.16em] text-white/28">
          KPI / {String(index + 1).padStart(2, "0")}
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${toneStyles[metric.tone].split(" ")[0]} bg-current opacity-70`} />
      </div>
      <p className="mt-5 text-[10px] font-medium uppercase tracking-[.14em] text-white/35">
        {metric.label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">
          {metric.value}
        </p>
        <span className={`rounded-md border px-2 py-1 font-mono text-[7px] tracking-[.1em] ${toneStyles[metric.tone]}`}>
          {metric.detail}
        </span>
      </div>
      <p className="mt-4 border-t border-white/[0.05] pt-3 text-[9px] text-white/24">
        {metric.trend}
      </p>
    </article>
  );
}
