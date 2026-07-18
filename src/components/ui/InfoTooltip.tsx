"use client";

import { useId, useState } from "react";

interface InfoTooltipProps {
  label: string;
  children: string;
}

/** Compact ⓘ hint for Command-Center UIs (no API dependency). */
export default function InfoTooltip({ label, children }: InfoTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyber-cyan/25 bg-cyber-cyan/[0.06] font-mono text-[9px] leading-none text-cyber-cyan/70 transition hover:border-cyber-cyan/45 hover:text-cyber-cyan"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-40 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#07101c]/96 p-3 text-left text-[11px] leading-relaxed text-white/70 shadow-[0_16px_40px_rgba(0,0,0,.45)] backdrop-blur-xl"
        >
          <span className="mb-1 block font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            HINWEIS
          </span>
          {children}
        </span>
      ) : null}
    </span>
  );
}
