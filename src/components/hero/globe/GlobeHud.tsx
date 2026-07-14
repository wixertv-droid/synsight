"use client";

import type { RefObject } from "react";
import { DEMO_USER } from "@/lib/demo/user";

/**
 * Presentational HUD overlay for the hero globe: the four floating security
 * panels, their SVG connector lines, and the monitoring footer. Kept
 * separate from `CyberGlobe.tsx` so the WebGL scene/animation code and the
 * markup describing "what the HUD looks like" can be read (and changed)
 * independently — the animation loop still owns *where* each panel is
 * positioned via the refs passed in here.
 */

interface GlobeHudProps {
  setPanelRef: (index: number) => (node: HTMLDivElement | null) => void;
  setConnectorRef: (index: number) => (node: SVGLineElement | null) => void;
  locationTitleRef: RefObject<HTMLParagraphElement | null>;
  locationDetailRef: RefObject<HTMLSpanElement | null>;
}

export default function GlobeHud({
  setPanelRef,
  setConnectorRef,
  locationTitleRef,
  locationDetailRef,
}: GlobeHudProps) {
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-[3] hidden h-full w-full xl:block"
        aria-hidden="true"
      >
        <defs>
          <filter id="connectorGlow">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 1, 2, 3].map((index) => (
          <line
            key={index}
            ref={setConnectorRef(index)}
            stroke={index === 3 ? "#ff8a5b" : "#70e7ff"}
            strokeWidth=".65"
            strokeDasharray="3 4"
            filter="url(#connectorGlow)"
          />
        ))}
      </svg>

      <div ref={setPanelRef(0)} className="globe-hud-panel globe-panel-top-left">
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-5 w-5 flex-none text-cyber-cyan"
            fill="none"
            stroke="currentColor"
          >
            <ellipse cx="12" cy="12" rx="9" ry="3.5" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <div>
            <p>DATENSTROM-ANALYSE AKTIV</p>
            <span>Status: Stabil</span>
          </div>
        </div>
      </div>

      <div
        ref={setPanelRef(1)}
        className="globe-hud-panel globe-panel-mid-left w-[248px]"
      >
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-5 w-5 flex-none text-cyber-cyan"
            fill="none"
            stroke="currentColor"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <div className="min-w-0 flex-1">
            <p ref={locationTitleRef}>STANDORT-LEAK-BEREICH (Paris)</p>
            <span ref={locationDetailRef}>
              Koordinaten: Lat 48.8 N, Lon 2.3 E
            </span>
            <span className="mt-3 block">Risk assessment:</span>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
              <i className="flex-1 bg-blue-700" />
              <i className="flex-1 bg-cyan-400" />
              <i className="flex-1 bg-orange-400" />
              <i className="relative flex-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.75)]">
                <b className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-white" />
              </i>
            </div>
          </div>
        </div>
      </div>

      <div ref={setPanelRef(2)} className="globe-hud-panel globe-panel-mid-right">
        <p>BEDROHUNGS-VEKTOR-VORSCHAU</p>
        <span>Sicherheitsstufe: Hoch</span>
        <span className="mt-2 block font-mono text-[7px] tracking-[.13em] text-cyber-cyan/65">
          [AKTIVE VERFOLGUNG]
        </span>
      </div>

      <div
        ref={setPanelRef(3)}
        className="globe-hud-panel globe-panel-bottom-right border-orange-300/20"
      >
        <p>SCAN-BESTÄTIGUNG: HOTSPOT IDENTIFIZIERT</p>
        <span>Sektor 7 G</span>
        <span className="mt-2 block text-orange-200/70">
          Sicherheits-Score: Kritisch
        </span>
      </div>

      <div className="absolute bottom-[5%] right-[5%] z-[4] hidden border-l border-cyber-cyan/25 pl-4 font-mono xl:block">
        <p className="text-[9px] tracking-[.2em] text-cyan-100/55">
          SYN-SIGHT GLOBAL MONITORING SYSTEM
        </p>
        <p className="mt-2 text-[7px] tracking-[.13em] text-white/25">
          Benutzer: {DEMO_USER.displayName} | {DEMO_USER.plan} | Active Node:{" "}
          {DEMO_USER.activeNode}
        </p>
      </div>
    </>
  );
}
