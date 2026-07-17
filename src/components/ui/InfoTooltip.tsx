"use client";

import { useEffect, useId, useState } from "react";
import HelpModal from "./HelpModal";

interface InfoTooltipProps {
  label: string;
  children: string;
  /** Open full help modal on small screens for better readability. */
  modalOnMobile?: boolean;
}

export default function InfoTooltip({
  label,
  children,
  modalOnMobile = true,
}: InfoTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preferModal, setPreferModal] = useState(false);

  useEffect(() => {
    if (!modalOnMobile) return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setPreferModal(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [modalOnMobile]);

  return (
    <>
      <span
        className="relative inline-flex"
        onMouseEnter={() => {
          if (!preferModal) setOpen(true);
        }}
        onMouseLeave={() => {
          if (!preferModal) setOpen(false);
        }}
      >
        <button
          type="button"
          className="flex h-4 w-4 items-center justify-center rounded-full border border-cyber-cyan/25 font-mono text-[9px] text-cyber-cyan/70 transition hover:border-cyber-cyan/50 hover:text-cyber-cyan focus:outline-none focus:ring-2 focus:ring-cyber-blue/40"
          aria-label={`Mehr Informationen zu ${label}`}
          aria-describedby={open && !preferModal ? id : undefined}
          aria-expanded={open || modalOpen}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (preferModal && modalOnMobile) {
              setModalOpen((value) => !value);
              return;
            }
            setOpen((value) => !value);
          }}
          onFocus={() => {
            if (!preferModal) setOpen(true);
          }}
          onBlur={() => {
            if (!preferModal) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setModalOpen(false);
            }
          }}
        >
          i
        </button>
        {open && !preferModal && (
          <span
            id={id}
            role="tooltip"
            className="absolute bottom-full left-1/2 z-[80] mb-3 w-64 -translate-x-1/2 rounded-xl border border-cyber-cyan/15 bg-[#07111e]/95 p-4 text-left text-[10px] font-normal leading-relaxed tracking-normal text-slate-200/70 shadow-[0_20px_60px_rgba(0,0,0,.5)] backdrop-blur-xl sm:w-72"
          >
            <span className="absolute inset-y-3 left-0 w-[2px] bg-gradient-to-b from-cyber-cyan/70 to-transparent" />
            {children}
          </span>
        )}
      </span>
      <HelpModal
        open={modalOpen}
        title={label}
        onClose={() => setModalOpen(false)}
      >
        {children}
      </HelpModal>
    </>
  );
}
