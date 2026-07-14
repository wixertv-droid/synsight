"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "hero", label: "START" },
  { id: "platform", label: "PLATTFORM" },
  { id: "demo-scanner", label: "CHECK" },
  { id: "traces", label: "SPUREN" },
  { id: "technology", label: "ERKENNUNG" },
  { id: "trust", label: "VERTRAUEN" },
];

export default function SystemRail() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0, 0.2, 0.6] }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex"
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
