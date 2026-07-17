"use client";

import { useEffect, useId } from "react";

interface HelpModalProps {
  open: boolean;
  title: string;
  children: string;
  onClose: () => void;
}

export default function HelpModal({
  open,
  title,
  children,
  onClose,
}: HelpModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hardware-panel w-full max-w-lg rounded-[1.2rem] border border-cyber-cyan/15 bg-[#07111e]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
              ERKLÄRUNG
            </p>
            <h2
              id={titleId}
              className="mt-2 text-lg font-medium tracking-[-.02em] text-white/90"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[8px] tracking-[.12em] text-white/45 transition hover:border-white/20 hover:text-white/70"
          >
            SCHLIESSEN
          </button>
        </div>
        <p className="text-sm leading-relaxed text-slate-200/70">{children}</p>
      </div>
    </div>
  );
}
