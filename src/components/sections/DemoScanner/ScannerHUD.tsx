"use client";

import { useState, useEffect } from "react";
import type { ScanQueries, ModuleStepState } from "./types";
import ScanCodeRain from "./ScanCodeRain";
import BgCss from "./BgCss";

interface ScannerHUDProps {
  progress: number;
  query: string;
  queries?: ScanQueries;
  moduleSteps?: ModuleStepState[];
  activeStepLabel?: string;
}

const SYSTEM_MESSAGES = [
  "Mounting UI framework...",
  "Allocating memory...",
  "Parsing heavy CSS vectors...",
  "Initializing secure pipeline...",
  "Loading background shadows...",
  "Fingerprinting entities...",
  "Connecting to intelligence network...",
];

export default function ScannerHUD({
  progress,
  query,
  queries,
  moduleSteps = [],
  activeStepLabel,
}: ScannerHUDProps) {
  const [isBooting, setIsBooting] = useState(true);
  // NEU: Steuert, wann das extrem schwere CSS geladen wird
  const [mountHeavyCss, setMountHeavyCss] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // 1. CRT-Röhren-Effekt startet SOFORT
    const bootTimer = setTimeout(() => setIsBooting(false), 700);

    // 2. Erst wenn der große Loader sicher auf dem Bildschirm sichtbar ist (nach 800ms),
    // zünden wir das schwere CSS. So blockiert der Browser nicht beim Startbildschirm!
    const cssTimer = setTimeout(() => setMountHeavyCss(true), 800);

    // 3. Nach 3.2 Sekunden ist das CSS geparst und der Vorhang blendet flüssig aus
    const readyTimer = setTimeout(() => setIsAppReady(true), 3200);

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(cssTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % SYSTEM_MESSAGES.length);
    }, 800);
    return () => clearInterval(msgTimer);
  }, []);

  const doneCount = moduleSteps.filter((s) => s.status === "done").length;
  const total = moduleSteps.length || 1;
  const isComplete = progress >= 100;

  const emailStep = moduleSteps.find(
    (s) => s.field === "email" || String(s.module) === "holehe"
  );
  const usernameStep = moduleSteps.find(
    (s) =>
      s.field === "username" ||
      String(s.module) === "maigret" ||
      String(s.module) === "sherlock"
  );
  const phoneStep = moduleSteps.find(
    (s) => s.field === "phone" || String(s.module) === "phoneinfoga"
  );

  const LargeModuleLoader = ({
    label,
    value,
    status,
    queryValue,
  }: {
    label: string;
    value: string;
    status?: string;
    queryValue?: string;
  }) => {
    const isDone = status === "done";
    const isActive = status === "running";
    const accentColor = isDone
      ? "text-[#00ff66]"
      : isActive
        ? "text-[#00f3ff]"
        : "text-white/40";
    const statusText = isDone
      ? "VERIFIED & SECURED"
      : isActive
        ? "ACTIVE SCANNING..."
        : "AWAITING QUEUE";

    return (
      <div className="relative flex items-center justify-between w-full max-w-[520px] p-5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xs overflow-hidden">
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDone ? "bg-[#00ff66]" : isActive ? "bg-[#00f3ff] animate-pulse" : "bg-white/15"}`}
        />

        <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0 mr-5">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            style={{
              animation: isActive ? "spin-slow 8s linear infinite" : "none",
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="60 30 20 10"
              className={accentColor}
              opacity="0.8"
            />
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="5 5"
              className={accentColor}
              opacity="0.4"
            />
          </svg>
          <div className={`text-lg font-bold ${accentColor}`}>
            {isDone ? "✓" : isActive ? "◎" : "−"}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[10px] font-bold tracking-[0.3em] uppercase ${accentColor}`}
            >
              {label}
            </span>
            <span
              className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border rounded-xs ${isDone ? "border-[#00ff66]/40 text-[#00ff66] bg-[#00ff66]/10" : isActive ? "border-[#00f3ff]/40 text-[#00f3ff] bg-[#00f3ff]/10 animate-pulse" : "border-white/10 text-white/30"}`}
            >
              {statusText}
            </span>
          </div>
          <div className="text-sm font-mono tracking-wider text-white truncate w-full">
            {value || queryValue || "PENDING TARGET INPUT"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes crtTurnOn {
          0% { transform: scale(0, 0.002); filter: brightness(0); opacity: 0; }
          35% { transform: scale(1, 0.002); filter: brightness(12); opacity: 1; }
          100% { transform: scale(1, 1); filter: brightness(1); opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        @keyframes spin-slow-rev { 100% { transform: rotate(-360deg); } }
        @keyframes spin-fast { 100% { transform: rotate(360deg); } }
        .crt-boot { animation: crtTurnOn 0.65s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      {/* Röhren-Effekt Container */}
      <div
        className={`relative h-full w-full overflow-hidden bg-[#020306] font-mono font-light select-none ${isBooting ? "crt-boot" : ""}`}
      >
        {/* =====================================================================
            DER VORHANG: ÜBERLAGERT ALLES, SOFORT SICHTBAR
            ===================================================================== */}
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center bg-[#020306] transition-opacity duration-[1200ms] ease-out ${
            isAppReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative w-[380px] h-[380px] md:w-[480px] md:h-[480px] flex items-center justify-center text-[#00f3ff]">
            <svg
              className="absolute inset-0 w-full h-full opacity-90 drop-shadow-[0_0_12px_rgba(0,243,255,0.4)]"
              viewBox="0 0 260 260"
            >
              <g
                style={{
                  transformOrigin: "130px 130px",
                  animation: "spin-slow 22s linear infinite",
                }}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="565 189"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              </g>
              <g
                style={{
                  transformOrigin: "130px 130px",
                  animation: "spin-slow-rev 30s linear infinite",
                }}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="112"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="527 176"
                  opacity="0.5"
                  strokeLinecap="round"
                />
              </g>
              <g
                style={{
                  transformOrigin: "130px 130px",
                  animation: "spin-fast 14s linear infinite",
                }}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="90 30 40 20 60 25"
                  opacity="0.8"
                />
              </g>
              <g
                style={{
                  transformOrigin: "130px 130px",
                  animation: "spin-slow-rev 18s linear infinite",
                }}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="76"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                  opacity="0.6"
                />
              </g>
              <g
                style={{
                  transformOrigin: "130px 130px",
                  animation: "spin-slow 18s linear infinite",
                }}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="2 8"
                  opacity="0.7"
                />
              </g>
              <g className="opacity-70">
                <line
                  x1="40"
                  y1="130"
                  x2="220"
                  y2="130"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
                <line
                  x1="130"
                  y1="40"
                  x2="130"
                  y2="220"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
                <circle
                  cx="130"
                  cy="130"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="10 5"
                  style={{
                    transformOrigin: "130px 130px",
                    animation: "spin-fast 5s linear infinite",
                  }}
                />
                <circle
                  cx="130"
                  cy="130"
                  r="3"
                  fill="currentColor"
                  opacity="0.9"
                />
              </g>
            </svg>
            <div className="relative z-10 flex flex-col items-center text-center mt-32">
              <div className="text-[12px] tracking-[0.5em] text-[#00f3ff] font-bold mb-1 animate-pulse drop-shadow-[0_0_8px_#00f3ff]">
                BUILDING ENVIRONMENT
              </div>
              <div className="text-[9px] font-mono tracking-widest text-white/70 uppercase">
                {SYSTEM_MESSAGES[msgIndex]}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            DIE ECHTE APP (Unter dem Vorhang)
            ===================================================================== */}

        {/* Hintergrund-Effekte */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.05)_0%,rgba(2,3,6,1)_80%)]" />
        <ScanCodeRain />

        {/* HIER DIE LÖSUNG: Das extrem schwere CSS rendert erst, WENN der Loader schon sicher auf dem Bild ist! */}
        {mountHeavyCss && <BgCss />}

        <div
          className="absolute inset-0 z-[2] opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,243,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.2) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            perspective: "1000px",
            transform: "rotateX(70deg) scale(2.5) translateY(-30%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden opacity-20">
          <div
            className="w-full h-[1px] bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]"
            style={{ animation: "scanline 8s linear infinite" }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(2,3,6,1)] z-30" />

        {/* --- MAIN UI CONTAINER --- */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between">
          {/* HEADER */}
          <div className="w-full px-6 md:px-12 pt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-3">
              <div>
                <div className="text-[#00f3ff]/60 text-[9px] tracking-[0.5em] uppercase mb-2">
                  SynSight // Identity Intelligence
                </div>
                <div className="text-white/90 text-xl md:text-2xl tracking-widest font-medium truncate max-w-[90vw]">
                  {query || "UNDEFINED TARGET"}
                </div>
              </div>
              <div className="text-left md:text-right">
                <div
                  className={`font-light tracking-widest text-2xl md:text-3xl tabular-nums transition-colors duration-500 ${isComplete ? "text-[#00ff66]" : "text-[#00f3ff]"}`}
                >
                  {progress}%
                </div>
                <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mt-1">
                  MODULES: {doneCount}/{total}
                </div>
              </div>
            </div>
            <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${isComplete ? "bg-[#00ff66]" : "bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* MITTE: DIE MODULE */}
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 py-8">
            <div className="w-full lg:w-[35%] flex flex-col justify-center gap-6 bg-transparent p-6 border-l-2 border-[#00f3ff]/40 backdrop-blur-sm">
              <div className="text-[10px] tracking-[0.4em] uppercase text-[#00f3ff]">
                TARGET DISPATCH
              </div>
              <div className="text-lg font-mono text-white">
                {query || "Multitarget Analysis"}
              </div>
              <div className="text-xs font-mono text-white/50 leading-relaxed">
                System is sequentially querying intelligence databases without
                parallel timeouts. Verifying security vectors in real-time.
              </div>
            </div>
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              <LargeModuleLoader
                label="EMAIL INTELLIGENCE (HOLEHE)"
                value={emailStep?.query || ""}
                queryValue={queries?.email}
                status={emailStep?.status}
              />
              <LargeModuleLoader
                label="USERNAME MATRIX (MAIGRET / SHERLOCK)"
                value={usernameStep?.query || ""}
                queryValue={queries?.username}
                status={usernameStep?.status}
              />
              <LargeModuleLoader
                label="PHONE TELEMETRY (PHONEINFOGA)"
                value={phoneStep?.query || ""}
                queryValue={queries?.phone}
                status={phoneStep?.status}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="w-full px-6 md:px-12 pb-8">
            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <div className="text-[9px] tracking-[0.3em] uppercase text-white/40 flex items-center gap-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-[#00ff66]" : "bg-[#00f3ff] opacity-60 animate-pulse"}`}
                />
                SEQ. PIPELINE
              </div>
              <div
                className={`text-[9px] tracking-[0.4em] uppercase transition-colors duration-500 ${isComplete ? "text-[#00ff66]" : "text-[#00f3ff]"}`}
              >
                {activeStepLabel || "IDLE"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
