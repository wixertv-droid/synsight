"use client";

import { useEffect, useState } from "react";

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
  /** Extra classes for positioning (e.g. inside dashboard layouts). */
  className?: string;
}

function resolveActiveSection(
  sections: SystemRailSection[],
  fallbackId: string
): string {
  const scrollY = window.scrollY;
  const anchor = scrollY + window.innerHeight * 0.35;
  let activeId = fallbackId;

  for (const { id } of sections) {
    const element = document.getElementById(id);
    if (!element) continue;
    if (element.offsetTop <= anchor) activeId = id;
  }

  return activeId;
}

export default function SystemRail({
  sectionsReady = true,
  sections = LANDING_SECTIONS,
  className = "",
}: SystemRailProps) {
  const fallbackId = sections[0]?.id ?? "hero";
  const [active, setActive] = useState(fallbackId);

  useEffect(() => {
    if (!sectionsReady || sections.length === 0) return;

    const syncActiveSection = () => {
      setActive(resolveActiveSection(sections, fallbackId));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActive(visible.target.id);
          return;
        }
        syncActiveSection();
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.6] }
    );

    for (const { id } of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, [sectionsReady, sections, fallbackId]);

  if (sections.length === 0) return null;

  return (
    <aside
      className={`fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex ${className}`}
      aria-label="Seitennavigation"
    >
      {sections.map(({ id, label }, index) => {
        const selected = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            className="group flex items-center gap-3"
            aria-label={label}
            aria-current={selected ? "location" : undefined}
            onClick={(event) => {
              const element = document.getElementById(id);
              if (!element) return;
              event.preventDefault();
              element.scrollIntoView({ behavior: "smooth", block: "start" });
              setActive(id);
            }}
          >
            <span
              className={`font-mono text-[8px] tracking-[.16em] transition-all duration-500 ${
                selected
                  ? "translate-x-0 text-cyan-100/70 opacity-100"
                  : "translate-x-2 text-white/20 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              {String(index + 1).padStart(2, "0")} / {label}
            </span>
            <span
              className={`block h-px transition-all duration-500 ${
                selected
                  ? "w-8 bg-cyber-cyan/70 shadow-[0_0_8px_rgba(112,231,255,.3)]"
                  : "w-3 bg-white/15 group-hover:w-5 group-hover:bg-white/35"
              }`}
            />
          </a>
        );
      })}
    </aside>
  );
}
