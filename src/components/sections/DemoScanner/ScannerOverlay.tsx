"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ScannerHUD from "./ScannerHUD";
import type { ScanPhase, ApiResult, ScanData, ScanQueries } from "./types";

interface ScannerOverlayProps {
  phase: ScanPhase;
  progress: number;
  target: string;
  queries?: ScanQueries;
  apiResult: ApiResult | null;
  rawData: ScanData | null;
  onClose: () => void;
}

function dossierIdFromTarget(target: string): string {
  const seed = target.trim().toLowerCase() || "unknown";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
}

function riskColorsFor(riskRaw?: string) {
  const risk = riskRaw?.toLowerCase() || "low";
  if (risk.includes("high") || risk.includes("hoch")) {
    return "text-red-400 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
  }
  if (risk.includes("medium") || risk.includes("mittel")) {
    return "text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
  }
  return "text-cyan-400 border-cyan-500/50 bg-cyan-500/10";
}

export default function ScannerOverlay({
  phase,
  progress,
  target,
  queries,
  apiResult,
  rawData,
  onClose,
}: ScannerOverlayProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dossierId = useMemo(() => dossierIdFromTarget(target), [target]);
  const [dossierTime] = useState(() => new Date().toLocaleString("de-DE"));

  useEffect(() => {
    if (phase === "fullscreen_result") {
      setIsClosing(false);
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    }

    if (phase === "closing_crt") {
      setIsClosing(true);
      setShowContent(false);
      return;
    }

    setShowContent(false);
    setIsClosing(false);
  }, [phase]);

  if (phase === "idle" || phase === "complete") return null;

  if (phase === "scanning") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <ScannerHUD progress={progress} query={target} queries={queries} />
      </div>
    );
  }

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setShowContent(false);
    setTimeout(() => {
      onClose();
    }, 1750);
  };

  if (phase === "fullscreen_result" || phase === "closing_crt") {
    const modules = rawData?.modules?.length
      ? rawData.modules
      : [
          {
            id: "flat",
            label: "Ergebnisse",
            status: "ok" as const,
            findings: rawData?.findings || [],
            count: rawData?.findings?.length || 0,
            summary: "Zusammengefasste Treffer",
          },
        ];
    const riskLevel = apiResult?.riskLevel || "Unbekannt";
    const score = rawData?.exposureScore || 0;
    const elevated =
      /erhöht|kritisch|hoch|high|critical/i.test(riskLevel) || score >= 60;
    const queryEntries = Object.entries(
      rawData?.queries || queries || {}
    ).filter(([, v]) => Boolean(v));

    return (
      <div
        className={`fixed inset-0 z-50 bg-[#02070d] font-mono text-white overflow-y-auto selection:bg-cyan-500/30 origin-center ${
          isClosing ? "animate-crt-off" : ""
        }`}
      >
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05)_0%,rgba(2,7,13,1)_80%)] pointer-events-none" />
        <div
          className="fixed inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
          style={{
            perspective: "800px",
            transform: "rotateX(20deg) scale(1.2) translateY(-10%)",
          }}
        />
        <div className="fixed inset-0 pointer-events-none z-50">
          <div
            className="w-full h-[2px] bg-cyan-400/20 blur-[1px] shadow-[0_0_20px_#22d3ee]"
            style={{ animation: "scanline 4s linear infinite" }}
          />
        </div>

        <div
          className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 transition-all duration-1000 ${
            showContent && !isClosing
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="border-b border-cyan-500/30 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="text-cyan-500 text-[10px] tracking-[0.4em] mb-2 uppercase animate-pulse font-bold">
                SynSight Intelligence Network
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] uppercase">
                Digital Exposure Dossier
              </h1>
            </div>
            <div className="text-left md:text-right">
              <div className="text-cyan-700 text-[10px] tracking-widest font-bold">
                DOSSIER ID: {dossierId}
              </div>
              <div className="text-cyan-400 text-xs mt-1 tracking-widest">
                {dossierTime}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8">
              <div className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                <TechCorners />
                <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] mb-4 font-bold">
                  Ziel-Objekte
                </div>
                {queryEntries.length > 0 ? (
                  <div className="space-y-2">
                    {queryEntries.map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <div className="text-[9px] tracking-[0.2em] text-cyan-700 uppercase">
                          {key}
                        </div>
                        <div className="text-sm md:text-base text-white font-sans truncate">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xl md:text-2xl text-white font-sans font-medium truncate">
                    {target || "Unbekannt"}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full animate-ping shadow-[0_0_10px_currentColor] ${
                      elevated
                        ? "bg-red-500 text-red-500"
                        : "bg-amber-400 text-amber-400"
                    }`}
                  />
                  <div className="text-xs uppercase tracking-widest text-gray-300">
                    Status: {riskLevel}
                  </div>
                </div>
              </div>

              <div className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 flex flex-col items-center justify-center py-12 shadow-[0_0_30px_rgba(34,211,238,0.05)] overflow-hidden">
                <TechCorners />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)]" />
                <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] mb-8 font-bold">
                  Exposure Score
                </div>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-36 h-36 rounded-full border-[3px] border-dashed border-cyan-500/40 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute w-28 h-28 rounded-full border-[2px] border-cyan-400/60 animate-[spin_6s_linear_infinite_reverse]" />
                  <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_#22d3ee] z-10">
                    {score}
                  </div>
                </div>
                <div className="mt-8 text-cyan-600 text-[9px] tracking-[0.2em] text-center max-w-[200px] font-bold">
                  MODULE: {modules.length} · TREFFER:{" "}
                  {rawData?.findings?.length || 0}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="relative border-l-2 border-l-cyber-cyan/60 border-y border-r border-white/[0.08] bg-[linear-gradient(145deg,rgba(41,182,246,0.1),rgba(7,11,19,0.45))] p-6 backdrop-blur-md">
                <div className="text-cyber-cyan/70 text-[10px] font-medium tracking-[0.28em] uppercase mb-4">
                  KI-Analyse Zusammenfassung
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-base md:text-lg">
                  {apiResult?.summary ||
                    apiResult?.message ||
                    "Keine Zusammenfassung verfügbar."}
                </p>
              </div>

              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className="relative border border-cyan-500/30 bg-[#041224]/80 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]"
                >
                  <TechCorners />
                  <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4 gap-3">
                    <div>
                      <div className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] font-bold">
                        Modul · {mod.label}
                      </div>
                      <div className="text-[11px] text-cyan-800 mt-1 tracking-wide">
                        {mod.summary}
                      </div>
                    </div>
                    <div className="text-cyan-400 text-xs font-bold bg-cyan-950 px-3 py-1 border border-cyan-500/30 shrink-0">
                      {mod.status === "started"
                        ? "STARTED"
                        : mod.status === "error"
                          ? "ERROR"
                          : `TOTAL: ${mod.count}`}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mod.findings.length === 0 ? (
                      <div className="text-sm text-gray-500 font-sans">
                        Keine Treffer in diesem Modul.
                      </div>
                    ) : (
                      mod.findings.map((finding, idx) => (
                        <div
                          key={`${mod.id}-${finding.title}-${idx}`}
                          className="group relative border border-cyan-900/50 bg-[#02070d]/60 p-4 hover:bg-cyan-900/30 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                          <div className="flex items-start gap-4 w-full min-w-0">
                            <div className="text-cyan-800 font-black text-lg mt-0.5 border-r border-cyan-900 pr-3 shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-cyan-300 font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_5px_#22d3ee]">
                                {finding.title}
                              </div>
                              {finding.platform ? (
                                <div className="text-cyan-700 text-[10px] mt-1 uppercase tracking-widest">
                                  {finding.platform}
                                </div>
                              ) : null}
                              <div className="text-gray-400 text-xs mt-1.5 font-sans leading-relaxed break-words">
                                {finding.description || finding.detail}
                              </div>
                              {finding.url ? (
                                <div className="text-cyan-600/80 text-[10px] mt-1 truncate">
                                  {finding.url}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border shrink-0 ${riskColorsFor(finding.risk)}`}
                          >
                            {finding.risk || "Info"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-4 pt-4 pb-8">
                <button
                  onClick={handleClose}
                  className="px-6 py-4 border border-cyan-900 text-cyan-700 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-xs uppercase tracking-[0.2em] font-bold"
                >
                  System verlassen
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-4 bg-[#041224] border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-[#02070d] transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] text-xs uppercase tracking-[0.2em] font-bold"
                >
                  Vollständigen Deep-Scan anfordern
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          @keyframes crtTurnOff {
            0% {
              transform: scaleY(1) scaleX(1);
              filter: brightness(1);
              opacity: 1;
            }
            55% {
              transform: scaleY(0.002) scaleX(1);
              filter: brightness(2.4);
              opacity: 1;
            }
            78% {
              transform: scaleY(0.002) scaleX(0.02);
              filter: brightness(3);
              opacity: 1;
            }
            92% {
              transform: scaleY(0.002) scaleX(0.002);
              filter: brightness(4);
              opacity: 0.85;
            }
            100% {
              transform: scaleY(0.002) scaleX(0.002);
              filter: brightness(1);
              opacity: 0;
            }
          }
          .animate-crt-off {
            animation: crtTurnOff 1.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>
      </div>
    );
  }

  return null;
}

function TechCorners() {
  return (
    <>
      <div className="absolute top-0 left-0 w-4 h-4 border-t-[2px] border-l-[2px] border-cyan-500/70" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-[2px] border-r-[2px] border-cyan-500/70" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[2px] border-l-[2px] border-cyan-500/70" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[2px] border-r-[2px] border-cyan-500/70" />
    </>
  );
}
