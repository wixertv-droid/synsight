"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type {
  ComponentHealth,
  StatusComponent,
} from "@/lib/content/system-status";
import { getComponentStatusLabel } from "@/lib/content/system-status";

const tone: Record<
  ComponentHealth,
  { dot: string; badge: string; pulse?: boolean }
> = {
  online: {
    dot: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.55)]",
    badge: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100/75",
    pulse: true,
  },
  degraded: {
    dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.45)]",
    badge: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100/75",
  },
  offline: {
    dot: "bg-rose-300",
    badge: "border-rose-300/20 bg-rose-300/[0.06] text-rose-100/75",
  },
  in_development: {
    dot: "bg-amber-300/90",
    badge: "border-amber-300/20 bg-amber-300/[0.05] text-amber-100/70",
  },
  preparing: {
    dot: "bg-amber-200/80",
    badge: "border-amber-200/15 bg-amber-200/[0.04] text-amber-100/65",
  },
};

export default function StatusComponentGrid({
  components,
}: {
  components: StatusComponent[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {components.map((component, index) => (
        <StatusCard key={component.id} component={component} index={index} />
      ))}
    </div>
  );
}

function StatusCard({
  component,
  index,
}: {
  component: StatusComponent;
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({
    threshold: 0.15,
  });
  const style = tone[component.status];

  return (
    <article
      ref={ref}
      className={`glass hardware-panel rounded-2xl border border-white/[0.07] p-5 transition duration-700 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
            COMPONENT / {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-base font-medium text-white/85">
            {component.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/35">
            {component.description}
          </p>
        </div>
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot} ${
            style.pulse ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
      </div>
      <div className="mt-4">
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${style.badge}`}
        >
          {getComponentStatusLabel(component.status)}
        </span>
      </div>
    </article>
  );
}
