"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
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

const BOOT_MESSAGES = [
  "Analyseumgebung wird initialisiert",
  "Zieldaten werden vorbereitet",
  "Sichere Prüfkanäle werden synchronisiert",
  "Öffentliche Signale werden korreliert",
  "Metadaten werden verdichtet",
  "Expositionsprofil wird berechnet",
  "Ergebnisübersicht wird vorbereitet",
];

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusMessage(progress: number, activeStepLabel?: string): string {
  if (activeStepLabel && progress > 4 && progress < 98) return activeStepLabel;
  if (progress < 12) return "Analyseumgebung wird initialisiert";
  if (progress < 30) return "Zieldaten werden vorbereitet";
  if (progress < 52) return "Öffentliche Signale werden korreliert";
  if (progress < 74) return "Metadaten werden verdichtet";
  if (progress < 94) return "Expositionsprofil wird berechnet";
  return "Ergebnisübersicht wird erstellt";
}

function fieldLabel(step: ModuleStepState): string {
  if (step.field === "email") return "Identitätsebene";
  if (step.field === "username" || step.field === "name") return "Profilnetz";
  if (step.field === "phone") return "Telefoncheck";
  return "Prüfebene";
}

function fieldHint(step: ModuleStepState): string {
  if (step.field === "email") return "Konto- und Identitätssignale";
  if (step.field === "username" || step.field === "name") {
    return "Öffentliche Profilspuren";
  }
  if (step.field === "phone") return "Telefon-Metadaten";
  return "Öffentliche Korrelation";
}

function statusText(status?: string) {
  if (status === "done") return "ABGESCHLOSSEN";
  if (status === "running") return "AKTIVE AUSWERTUNG";
  if (status === "error") return "NICHT VERFÜGBAR";
  if (status === "skipped") return "ÜBERSPRUNGEN";
  return "BEREIT";
}

function statusTone(status?: string) {
  if (status === "done")
    return "text-[#00ff66] border-[#00ff66]/40 bg-[#00ff66]/10";
  if (status === "running")
    return "text-[#00f3ff] border-[#00f3ff]/40 bg-[#00f3ff]/10 animate-pulse";
  if (status === "error")
    return "text-amber-200 border-amber-300/30 bg-amber-400/10";
  return "text-white/35 border-white/10 bg-white/[0.03]";
}

function ModuleLoader({ step }: { step: ModuleStepState }) {
  const isDone = step.status === "done";
  const isActive = step.status === "running";
  const tone = statusTone(step.status);
  const ring = isDone
    ? "text-[#00ff66]"
    : isActive
      ? "text-[#00f3ff]"
      : step.status === "error"
        ? "text-amber-200"
        : "text-white/30";

  return (
    <div className="relative flex items-center justify-between w-full max-w-[560px] p-5 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_32px_rgba(0,243,255,0.08)]">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isDone
            ? "bg-[#00ff66]"
            : isActive
              ? "bg-[#00f3ff] animate-pulse"
              : "bg-white/15"
        }`}
      />
      <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0 mr-5">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          style={{
            animation: isActive ? "spin-slow 7s linear infinite" : "none",
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="62 24 18 12"
            className={ring}
            opacity="0.82"
          />
          <circle
            cx="50"
            cy="50"
            r="32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 6"
            className={ring}
            opacity="0.48"
          />
        </svg>
        <div className={`text-lg font-bold ${ring}`}>
          {isDone ? "✓" : isActive ? "◎" : step.status === "error" ? "!" : "−"}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span
            className={`text-[10px] font-bold tracking-[0.28em] uppercase ${ring}`}
          >
            {fieldLabel(step)}
          </span>
          <span
            className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border rounded-full ${tone}`}
          >
            {statusText(step.status)}
          </span>
        </div>
        <div className="text-sm font-mono tracking-wider text-white truncate w-full">
          {step.query || "Zielwert wartet"}
        </div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-white/35 mt-1">
          {fieldHint(step)}
        </div>
      </div>
    </div>
  );
}

export default function ScannerHUD({
  progress,
  query,
  queries,
  moduleSteps = [],
  activeStepLabel,
}: ScannerHUDProps) {
  const [isBooting, setIsBooting] = useState(true);
  const [mountHeavyCss, setMountHeavyCss] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [cssReady, setCssReady] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const bootStartedAt = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now()
  );
  const readyNotified = useRef(false);

  const visualProgress = clampProgress(progress);
  const bootProgress = Math.max(
    18,
    Math.min(92, visualProgress || msgIndex * 11 + 18)
  );
  const doneCount = moduleSteps.filter(
    (s) => s.status === "done" || s.status === "error"
  ).length;
  const total = moduleSteps.length || 1;
  const isComplete = visualProgress >= 100;
  const activeMessage = statusMessage(visualProgress, activeStepLabel);

  const fallbackSteps: ModuleStepState[] = [];
  if (!moduleSteps.length) {
    if (queries?.email) {
      fallbackSteps.push({
        id: "email-fallback",
        module: "holehe",
        label: "Identitätsabgleich",
        hint: "E-Mail-Signale",
        query: queries.email,
        field: "email",
        status: "pending",
        progress: 0,
        findingCount: 0,
      });
    }
    if (queries?.username) {
      fallbackSteps.push({
        id: "username-fallback",
        module: "maigret",
        label: "Profilkorrelation",
        hint: "Profilspuren",
        query: queries.username,
        field: "username",
        status: "pending",
        progress: 0,
        findingCount: 0,
      });
    }
    if (queries?.phone) {
      fallbackSteps.push({
        id: "phone-fallback",
        module: "phoneinfoga",
        label: "Telefoncheck",
        hint: "Telefon-Metadaten",
        query: queries.phone,
        field: "phone",
        status: "pending",
        progress: 0,
        findingCount: 0,
      });
    }
  }
  const visibleSteps = moduleSteps.length ? moduleSteps : fallbackSteps;

  const markAppReady = useCallback(() => {
    if (readyNotified.current) return;
    readyNotified.current = true;
    setIsAppReady(true);
  }, []);

  useEffect(() => {
    const bootTimer = setTimeout(() => setIsBooting(false), 650);
    const cssTimer = setTimeout(() => setMountHeavyCss(true), 120);
    const readyFallback = setTimeout(() => markAppReady(), 3200);

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(cssTimer);
      clearTimeout(readyFallback);
    };
  }, [markAppReady]);

  useEffect(() => {
    if (!cssReady || isAppReady) return;
    const elapsed =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
      bootStartedAt.current;
    const wait = Math.max(0, 900 - elapsed);
    const t = setTimeout(() => markAppReady(), wait);
    return () => clearTimeout(t);
  }, [cssReady, isAppReady, markAppReady]);

  const handleCssReady = useCallback(() => {
    startTransition(() => setCssReady(true));
  }, []);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % BOOT_MESSAGES.length);
    }, 900);
    return () => clearInterval(msgTimer);
  }, []);

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
        @keyframes pulse-bar {
          0%, 100% { opacity: .55; transform: translateX(-40%); }
          50% { opacity: 1; transform: translateX(130%); }
        }
        .crt-boot { animation: crtTurnOn 0.65s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      <div
        className={`relative h-full w-full overflow-hidden bg-[#020306] font-mono font-light select-none ${isBooting ? "crt-boot" : ""}`}
      >
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center bg-[#020306] transition-opacity duration-[1200ms] ease-out ${
            isAppReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative w-[390px] h-[430px] md:w-[520px] md:h-[520px] flex items-center justify-center text-[#00f3ff]">
            <svg
              className="absolute inset-0 w-full h-full opacity-90 drop-shadow-[0_0_14px_rgba(0,243,255,0.45)]"
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
                  opacity="0.35"
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
                  opacity="0.48"
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
                  opacity="0.82"
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
                  opacity="0.62"
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
            <div className="relative z-10 flex flex-col items-center text-center mt-36 w-[78%]">
              <div className="text-[11px] tracking-[0.46em] text-[#00f3ff] font-bold mb-2 animate-pulse drop-shadow-[0_0_8px_#00f3ff] uppercase">
                Analyseumgebung aktiv
              </div>
              <div className="text-[9px] font-mono tracking-widest text-white/70 uppercase min-h-[14px]">
                {BOOT_MESSAGES[msgIndex]}
              </div>
              <div className="mt-5 w-full max-w-[300px]">
                <div className="mb-2 flex items-center justify-between text-[9px] tracking-[0.28em] uppercase text-white/40">
                  <span>Initialisierung</span>
                  <span>{bootProgress}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full border border-cyan-300/25 bg-cyan-950/25 shadow-[0_0_18px_rgba(0,243,255,0.14)]">
                  <div
                    className="h-full rounded-full bg-[#00f3ff] shadow-[0_0_18px_rgba(0,243,255,0.7)] transition-all duration-500"
                    style={{ width: `${bootProgress}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                    style={{ animation: "pulse-bar 1.7s ease-in-out infinite" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.05)_0%,rgba(2,3,6,1)_80%)]" />
        {isAppReady && <ScanCodeRain />}
        {mountHeavyCss && <BgCss onReady={handleCssReady} />}

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

        <div className="absolute inset-0 z-20 flex flex-col justify-between">
          <div className="w-full px-6 md:px-12 pt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-3">
              <div>
                <div className="text-[#00f3ff]/60 text-[9px] tracking-[0.5em] uppercase mb-2">
                  SynSight // Identity Intelligence
                </div>
                <div className="text-white/90 text-xl md:text-2xl tracking-widest font-medium truncate max-w-[90vw]">
                  {query || "Multitarget-Analyse"}
                </div>
              </div>
              <div className="text-left md:text-right">
                <div
                  className={`font-light tracking-widest text-2xl md:text-3xl tabular-nums transition-colors duration-500 ${isComplete ? "text-[#00ff66]" : "text-[#00f3ff]"}`}
                >
                  {visualProgress}%
                </div>
                <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mt-1">
                  Prüfpunkte: {doneCount}/{total}
                </div>
              </div>
            </div>
            <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,243,255,0.1)]">
              <div
                className={`h-full transition-all duration-500 ease-out ${isComplete ? "bg-[#00ff66]" : "bg-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,0.8)]"}`}
                style={{ width: `${visualProgress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-[10px] tracking-[0.24em] uppercase text-white/45">
              <span className="truncate">{activeMessage}</span>
              <span
                className={isComplete ? "text-[#00ff66]" : "text-[#00f3ff]"}
              >
                {isComplete ? "Report bereit" : "Live-Korrelation"}
              </span>
            </div>
          </div>

          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 py-8">
            <div className="w-full lg:w-[35%] flex flex-col justify-center gap-6 bg-transparent p-6 border-l-2 border-[#00f3ff]/40 backdrop-blur-sm">
              <div className="text-[10px] tracking-[0.4em] uppercase text-[#00f3ff]">
                Zielanalyse aktiv
              </div>
              <div className="text-lg font-mono text-white">
                {query || "Mehrfachprüfung"}
              </div>
              <div className="text-xs font-mono text-white/50 leading-relaxed">
                SynSight korreliert öffentliche Identitäts-, Profil- und
                Kommunikationssignale sequenziell. So bleibt der kostenlose
                Schnellcheck stabil und nachvollziehbar.
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {visibleSteps.slice(0, 3).map((step) => (
                  <div
                    key={`mini-${step.id}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3"
                  >
                    <div
                      className={`mx-auto mb-2 h-2 w-2 rounded-full ${step.status === "done" ? "bg-[#00ff66]" : step.status === "running" ? "bg-[#00f3ff] animate-pulse" : "bg-white/25"}`}
                    />
                    <div className="text-[8px] uppercase tracking-[0.2em] text-white/40">
                      {fieldLabel(step)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              {visibleSteps.map((step) => (
                <ModuleLoader key={step.id} step={step} />
              ))}
            </div>
          </div>

          <div className="w-full px-6 md:px-12 pb-8">
            <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
              <div className="text-[9px] tracking-[0.3em] uppercase text-white/40 flex items-center gap-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-[#00ff66]" : "bg-[#00f3ff] opacity-60 animate-pulse"}`}
                />
                Sequenzielle Prüfung
              </div>
              <div
                className={`text-[9px] tracking-[0.32em] uppercase transition-colors duration-500 text-right ${isComplete ? "text-[#00ff66]" : "text-[#00f3ff]"}`}
              >
                {activeMessage}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
