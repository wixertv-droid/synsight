"use client";

import { useId, useState } from "react";

interface InfoTooltipProps {
  label: string;
  children: string;
}

export default function InfoTooltip({ label, children }: InfoTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-cyber-cyan/25 font-mono text-[9px] text-cyber-cyan/60 transition hover:border-cyber-cyan/50 hover:text-cyber-cyan focus:outline-none focus:ring-2 focus:ring-cyber-blue/40"
        aria-label={`Mehr Informationen zu ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-[80] mb-3 w-64 -translate-x-1/2 rounded-xl border border-cyber-cyan/15 bg-[#07111e]/95 p-4 text-left text-[10px] font-normal leading-relaxed tracking-normal text-slate-200/70 shadow-[0_20px_60px_rgba(0,0,0,.5)] backdrop-blur-xl"
        >
          <span className="absolute inset-y-3 left-0 w-[2px] bg-gradient-to-b from-cyber-cyan/70 to-transparent" />
          {children}
        </span>
      )}
    </span>
  );
}
