"use client";

import { useEffect, useRef, useState } from "react";

export interface SystemRailSection {
  id: string;
  label: string;
}

export const LANDING_SECTIONS: SystemRailSection[] = [
  { id: "hero", label: "START" },
  { id: "platform", label: "PLATTFORM" },
  { id: "demo-scanner", label: "CHECK" },
  { id: "traces", label: "SPUREN" },
  { id: "technology", label: "ERKENNUNG" },
  { id: "syncredits", label: "CREDITS" },
  { id: "trust", label: "VERTRAUEN" },
];

interface SystemRailProps {
  sectionsReady?: boolean;
  sections?: SystemRailSection[];
  className?: string;
  /** Keep section labels always visible (better for dense report pages). */
  alwaysShowLabels?: boolean;
  /** Distance from viewport top used as the “active” reading line. */
  activeOffsetPx?: number;
  /**
   * `fixed` = landing-style viewport rail.
   * `sticky` = sits in page flow under tabs / beside content.
   */
  placement?: "fixed" | "sticky";
}

function resolveActiveSection(
  sections: SystemRailSection[],
  fallbackId: string,
  activeOffsetPx: number
): string {
  let activeId = fallbackId;

  for (const { id } of sections) {
    const element = document.getElementById(id);
    if (!element) continue;
    const top = element.getBoundingClientRect().top;
    if (top <= activeOffsetPx) activeId = id;
  }

  return activeId;
}

export default function SystemRail({
  sectionsReady = true,
  sections = LANDING_SECTIONS,
  className = "",
  alwaysShowLabels = false,
  activeOffsetPx = 120,
  placement = "fixed",
}: SystemRailProps) {
  const fallbackId = sections[0]?.id ?? "hero";
  const [active, setActive] = useState(fallbackId);
  const navigatingToRef = useRef<string | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sectionsReady || sections.length === 0) return;

    const syncActiveSection = () => {
      if (navigatingToRef.current) {
        const target = document.getElementById(navigatingToRef.current);
        if (target) {
          const top = target.getBoundingClientRect().top;
          if (Math.abs(top - activeOffsetPx) < 48) {
            setActive(navigatingToRef.current);
            navigatingToRef.current = null;
          }
        }
        return;
      }
      setActive(resolveActiveSection(sections, fallbackId, activeOffsetPx));
    };

    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncActiveSection();
      });
    };

    syncActiveSection();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (unlockTimerRef.current != null) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, [sectionsReady, sections, fallbackId, activeOffsetPx]);

  if (sections.length === 0) return null;

  const shellClass =
    placement === "sticky"
      ? "pointer-events-none sticky top-24 z-20 hidden w-[9.5rem] flex-col items-end gap-2.5 self-start xl:flex"
      : "pointer-events-none fixed right-4 top-1/2 z-40 hidden w-[9.5rem] -translate-y-1/2 flex-col items-end gap-2.5 xl:flex";

  return (
    <aside
      className={`${shellClass} ${className}`}
      aria-label="Seitennavigation"
    >
      {sections.map(({ id, label }, index) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            className="pointer-events-auto group flex min-h-8 items-center justify-end gap-3 rounded-md px-1 py-1 text-right"
            aria-label={label}
            aria-current={selected ? "location" : undefined}
            onClick={() => {
              const element = document.getElementById(id);
              if (!element) return;

              navigatingToRef.current = id;
              setActive(id);
              if (unlockTimerRef.current != null) {
                window.clearTimeout(unlockTimerRef.current);
              }
              unlockTimerRef.current = window.setTimeout(() => {
                navigatingToRef.current = null;
              }, 900);

              const top =
                window.scrollY +
                element.getBoundingClientRect().top -
                Math.max(72, activeOffsetPx - 16);
              window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
            }}
          >
            <span
              className={`font-mono text-[9px] tracking-[.14em] transition-all duration-150 ${
                selected
                  ? "translate-x-0 text-cyan-100/85 opacity-100"
                  : alwaysShowLabels
                    ? "translate-x-0 text-white/35 opacity-80 group-hover:text-white/70"
                    : "translate-x-1 text-white/25 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              {String(index + 1).padStart(2, "0")} / {label}
            </span>
            <span
              className={`block h-0.5 rounded-full transition-all duration-150 ${
                selected
                  ? "w-9 bg-cyber-cyan shadow-[0_0_10px_rgba(112,231,255,.45)]"
                  : "w-3.5 bg-white/25 group-hover:w-6 group-hover:bg-white/45"
              }`}
            />
          </button>
        );
      })}
    </aside>
  );
}
