"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HelpModal from "./HelpModal";

interface InfoTooltipProps {
  label: string;
  children: string;
  /** Open full help modal on small screens for better readability. */
  modalOnMobile?: boolean;
}

const TOOLTIP_WIDTH = 288;

export default function InfoTooltip({
  label,
  children,
  modalOnMobile = true,
}: InfoTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preferModal, setPreferModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOnMobile) return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setPreferModal(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [modalOnMobile]);

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement =
      spaceAbove >= 120 || spaceAbove > spaceBelow ? "top" : "bottom";
    const centerX = rect.left + rect.width / 2;
    const clampedX = Math.min(
      window.innerWidth - 16 - TOOLTIP_WIDTH / 2,
      Math.max(16 + TOOLTIP_WIDTH / 2, centerX)
    );

    setCoords({
      left: clampedX,
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open || preferModal) return;

    updateCoords();
    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, preferModal, updateCoords]);

  useEffect(() => {
    if (!open || preferModal) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, preferModal]);

  const tooltipNode =
    mounted && open && !preferModal && coords
      ? createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_WIDTH,
              zIndex: 9999,
              transform:
                coords.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
            }}
            className="pointer-events-none rounded-xl border border-cyber-cyan/15 bg-[#07111e]/98 p-4 text-left text-[10px] font-normal leading-relaxed tracking-normal text-slate-200/70 shadow-[0_20px_60px_rgba(0,0,0,.55)] backdrop-blur-xl"
          >
            <span className="absolute inset-y-3 left-0 w-[2px] bg-gradient-to-b from-cyber-cyan/70 to-transparent" />
            {children}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span className="relative inline-flex align-middle">
        <button
          ref={triggerRef}
          type="button"
          className="flex h-4 w-4 items-center justify-center rounded-full border border-cyber-cyan/25 font-mono text-[9px] text-cyber-cyan/70 transition hover:border-cyber-cyan/50 hover:text-cyber-cyan focus:outline-none focus:ring-2 focus:ring-cyber-blue/40"
          aria-label={`Mehr Informationen zu ${label}`}
          aria-describedby={open && !preferModal ? id : undefined}
          aria-expanded={open || modalOpen}
          onMouseEnter={() => {
            if (!preferModal) {
              updateCoords();
              setOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (!preferModal) setOpen(false);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (preferModal && modalOnMobile) {
              setModalOpen((value) => !value);
              return;
            }
            updateCoords();
            setOpen((value) => !value);
          }}
          onFocus={() => {
            if (!preferModal) {
              updateCoords();
              setOpen(true);
            }
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
      </span>
      {tooltipNode}
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
