"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ScannerHUD from "./ScannerHUD";
import type {
  ScanPhase,
  ApiResult,
  ScanData,
  ScanQueries,
  ModuleStepState,
} from "./types";

interface ScannerOverlayProps {
  phase: ScanPhase;
  progress: number;
  target: string;
  queries?: ScanQueries;
  moduleSteps?: ModuleStepState[];
  activeStepLabel?: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deduplicateFindings(findings: any[]) {
  const seen = new Set();
  return findings.filter((f) => {
    let domain = "";
    try {
      if (f.url) domain = new URL(f.url).hostname.replace("www.", "");
    } catch {
      // ignore
    }
    const key = `${f.title}-${domain}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getIntelDescription(type: string) {
  if (type === "email")
    return "Signatur validiert: Aktive Nutzung für Logins oder System-Registrierungen entdeckt.";
  if (type === "user")
    return "Cross-Referenzierung: Identität in der Datenbank des Betreibers verifiziert.";
  if (type === "phone")
    return "Netzwerk-Routing: Endgerät ist aktiv und antwortet auf HLR-Lookup.";
  return "Datenpunkt in externer Datenbank korreliert.";
}

function getThreatTheme(score: number) {
  if (score >= 70)
    return {
      color: "red",
      text: "text-red-400",
      border: "border-red-500/30",
      glow: "shadow-[0_0_40px_rgba(239,68,68,0.15)]",
      badgeBg: "bg-red-500/10",
      label: "CRITICAL EXPOSURE",
    };
  if (score >= 40)
    return {
      color: "amber",
      text: "text-amber-400",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.15)]",
      badgeBg: "bg-amber-500/10",
      label: "ELEVATED RISK",
    };
  return {
    color: "cyan",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.15)]",
    badgeBg: "bg-cyan-500/10",
    label: "MONITORED",
  };
}

function enhanceTitle(title: string, url?: string) {
  const cleanTitle = title.replace(
    /Holehe meldet Account auf/gi,
    "VERIFIZIERT:"
  );
  if (cleanTitle.toLowerCase().includes("öffentliches profil") && url) {
    try {
      const hostname = new URL(url).hostname.replace("www.", "").split(".")[0];
      return `PROFIL: ${hostname.toUpperCase()}`;
    } catch {
      // ignore
    }
  }
  return cleanTitle;
}

// Extrahieren des Providers für das Telefon-Modul
function extractProvider(text: string) {
  const match = text.match(/provider:\s*([^|]+)/i);
  return match ? match[1].trim() : "Unbekannt";
}

function SmartUrlTease({ url }: { url?: string }) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return (
      <div className="flex items-center mt-3 font-mono text-xs border border-white/10 bg-white/5 p-2 rounded-xl w-fit backdrop-blur-md">
        <span className="text-cyan-300 font-bold">{u.hostname}</span>
        <span className="text-white/20 blur-[3px] select-none pointer-events-none">
          /encrypted-path-hidden
        </span>
      </div>
    );
  } catch {
    return (
      <div className="text-white/20 blur-[4px] mt-2 text-xs select-none">
        {url}
      </div>
    );
  }
}

export default function ScannerOverlay({
  phase,
  progress,
  target,
  queries,
  moduleSteps,
  activeStepLabel,
  rawData,
  onClose,
}: ScannerOverlayProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // GARANTIERT LEER BEIM START -> ALLES ZU!
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const dossierId = useMemo(() => dossierIdFromTarget(target), [target]);
  const [dossierTime] = useState(() => new Date().toLocaleString("de-DE"));

  const score = rawData?.exposureScore || 0;
  const theme = getThreatTheme(score);

  useEffect(() => {
    if (phase === "fullscreen_result" || phase === "scanning") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      <div className="fixed inset-0 z-50 bg-transparent">
        <ScannerHUD
          progress={progress}
          query={target}
          queries={queries}
          moduleSteps={moduleSteps}
          activeStepLabel={activeStepLabel}
        />
      </div>
    );
  }

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setShowContent(false);
    setTimeout(() => onClose(), 1750);
  };

  if (phase === "fullscreen_result" || phase === "closing_crt") {
    const rawModules = rawData?.modules || [];
    const filteredModules = rawModules.filter(
      (m) =>
        !m.id.toLowerCase().includes("spiderfoot") &&
        !m.label.toLowerCase().includes("spiderfoot")
    );

    const modules = filteredModules
      .map((m) => {
        const cleanFindings = deduplicateFindings(m.findings);
        return { ...m, findings: cleanFindings, count: cleanFindings.length };
      })
      .filter((m) => m.count > 0);

    return (
      <div
        className={`fixed inset-0 z-50 font-sans text-white overflow-y-auto selection:bg-cyan-500/30 bg-[#020611]/90 backdrop-blur-3xl ${
          isClosing ? "animate-crt-off" : ""
        }`}
      >
        {/* Holografisches Grid im Hintergrund */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)]" />

        <div
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 transition-all duration-1000 ${
            showContent && !isClosing
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-12"
          }`}
        >
          {/* HIGH-END SCI-FI HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 relative z-10">
            <div>
              <div className="text-cyan-400/80 text-[10px] font-mono tracking-[0.4em] mb-3 uppercase flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.badgeBg.replace("/10", "")}`}
                />
                Target Analysis Complete
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Digital <span className="font-black">Exposure</span>
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-white/40 font-mono text-[10px] tracking-widest">
                  SUBJECT:
                </span>
                <span className="text-cyan-300 font-mono font-bold bg-cyan-950/40 px-4 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                  {target}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="text-white/40 text-[10px] font-mono tracking-widest flex items-center justify-between gap-6">
                <span>DOSSIER ID:</span>{" "}
                <span className="text-white font-bold">{dossierId}</span>
              </div>
              <div className="text-white/40 text-[10px] font-mono tracking-widest flex items-center justify-between gap-6 mt-1">
                <span>TIMESTAMP:</span> <span>{dossierTime}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LINKE SPALTE */}
            <div className="lg:col-span-4 space-y-8">
              {/* Sci-Fi Score Card */}
              <div
                className={`relative border ${theme.border} bg-white/[0.02] backdrop-blur-2xl rounded-3xl p-8 flex flex-col items-center justify-center py-12 ${theme.glow}`}
              >
                <div className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em] mb-8 z-10">
                  Exposure Score
                </div>
                <div className="relative flex items-center justify-center mb-6 z-10">
                  {/* Holographic Rings */}
                  <div
                    className={`absolute w-40 h-40 rounded-full border-[1px] border-dashed ${theme.border} animate-[spin_20s_linear_infinite] opacity-50`}
                  />
                  <div
                    className={`absolute w-32 h-32 rounded-full border-[2px] ${theme.border} border-t-transparent animate-[spin_8s_linear_infinite_reverse]`}
                  />
                  <div
                    className={`absolute w-28 h-28 rounded-full bg-gradient-to-tr from-white/[0.02] to-transparent backdrop-blur-sm`}
                  />
                  <div
                    className={`text-7xl font-black ${theme.text} drop-shadow-[0_0_20px_currentColor]`}
                  >
                    {score}
                  </div>
                </div>
                <div
                  className={`mt-4 px-6 py-2.5 border ${theme.border} ${theme.badgeBg} rounded-full flex items-center gap-3 z-10 backdrop-blur-md`}
                >
                  <div
                    className={`w-2 h-2 rounded-full animate-ping ${theme.badgeBg.replace("/10", "")}`}
                  />
                  <span
                    className={`text-[10px] font-mono tracking-widest uppercase font-bold ${theme.text}`}
                  >
                    {theme.label}
                  </span>
                </div>
              </div>

              {/* Analyst Summary Card */}
              <div className="relative border border-white/10 bg-white/[0.02] backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">
                <div className="text-white/40 text-[10px] font-mono tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full" /> Analyst
                  Summary
                </div>
                <p className="text-white/70 leading-relaxed text-sm font-light">
                  Die KI-gestützte Analyse hat signifikante digitale Spuren im
                  offenen und Deep-Web identifiziert. Die extrahierten
                  Datenpunkte weisen auf eine stark vernetzte digitale Identität
                  hin. Ein manueller Review durch den Eigentümer wird dringend
                  empfohlen.
                </p>
              </div>
            </div>

            {/* RECHTE SPALTE */}
            <div className="lg:col-span-8 space-y-6">
              {modules.map((mod) => {
                const isExpanded = expandedModules[mod.id];
                const top10Findings = mod.findings.slice(0, 10);

                const mId = mod.id.toLowerCase();
                let type = "other";
                let title = "DATA FOOTPRINT";
                if (
                  mId.includes("email") ||
                  mod.label.toLowerCase().includes("email")
                ) {
                  type = "email";
                  title = "E-MAIL IDENTITY EXPOSURE";
                }
                if (
                  mId.includes("user") ||
                  mod.label.toLowerCase().includes("maigret")
                ) {
                  type = "user";
                  title = "CROSS-PLATFORM USERNAME TRACKING";
                }
                if (
                  mId.includes("phone") ||
                  mod.label.toLowerCase().includes("telefon")
                ) {
                  type = "phone";
                  title = "TELECOMMUNICATIONS INTELLIGENCE";
                }

                return (
                  <div
                    key={mod.id}
                    className={`relative border border-white/10 bg-white/[0.02] backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-500 hover:border-cyan-500/30 group ${isExpanded ? "bg-white/[0.04]" : ""}`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                      <div className="flex-1">
                        <div className="text-white text-sm font-bold uppercase tracking-[0.1em] mb-4 flex items-center gap-3">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg.replace("/10", "")} shadow-[0_0_10px_currentColor]`}
                          />
                          {title}
                        </div>

                        <div className="text-xs text-white/50 leading-relaxed font-light pr-4">
                          {type === "email" &&
                            "Wir haben identifiziert, auf welchen Plattformen diese E-Mail als aktives Login-Konto genutzt wird. Dies ermöglicht Angreifern gezieltes Profiling."}
                          {type === "user" &&
                            "Dieser Benutzername wurde systemübergreifend entdeckt. Überschneidungen werden genutzt, um ein allumfassendes Profil Ihrer Identität zu erstellen."}
                          {type === "phone" &&
                            "Die Nummer wurde vom Netzwerk verifiziert und ist aktiv. Zusätzlich wurden Metadaten zur Provider-Struktur isoliert."}
                          {type === "other" &&
                            "Zusätzliche Datenpunkte und Metadaten, die mit dieser Ziel-Identität in Verbindung gebracht werden konnten."}
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end gap-4 mt-4 md:mt-0 w-full md:w-auto">
                        <div className="text-white/40 text-[10px] font-mono border border-white/10 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md">
                          RECORDS FOUND:{" "}
                          <span className="text-cyan-400 font-bold ml-2 text-sm">
                            {mod.count}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleModule(mod.id)}
                          className={`px-5 py-2.5 border rounded-xl font-mono text-[10px] tracking-widest uppercase transition-all duration-300 w-full md:w-auto ${
                            isExpanded
                              ? "border-cyan-900/50 text-cyan-600 bg-cyan-950/20"
                              : "border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                          }`}
                        >
                          {isExpanded ? "[-] EINKLAPPEN" : "[+] ENTSCHLÜSSELN"}
                        </button>
                      </div>
                    </div>

                    {/* ANIMIERTES AUFKLAPPEN */}
                    {isExpanded && (
                      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                        {top10Findings.map((finding, idx) => {
                          const textDesc =
                            finding.description || finding.detail || "";
                          const provider =
                            type === "phone" ? extractProvider(textDesc) : null;

                          return (
                            <div
                              key={`${mod.id}-${idx}`}
                              className="relative border border-white/5 bg-black/20 rounded-2xl p-5 transition-all duration-300 opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards] hover:border-cyan-500/20 hover:bg-white/[0.02]"
                              style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                              <div className="flex items-start gap-5">
                                <div className="text-white/10 font-black text-xl mt-1 w-8 shrink-0">
                                  {String(idx + 1).padStart(2, "0")}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white/90 font-bold text-sm uppercase tracking-wider mb-2">
                                    {enhanceTitle(finding.title, finding.url)}
                                  </div>

                                  <div className="text-white/40 text-xs font-light mb-2">
                                    Status: {getIntelDescription(type)}
                                  </div>

                                  {/* TELEFON PROVIDER BADGE */}
                                  {type === "phone" && provider && (
                                    <div className="mt-3 flex items-center gap-3">
                                      <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono">
                                        Provider Identifiziert:
                                      </span>
                                      <span className="text-cyan-300 font-bold text-xs tracking-widest bg-cyan-950/40 px-3 py-1 rounded-lg border border-cyan-500/30">
                                        {provider}
                                      </span>
                                    </div>
                                  )}

                                  <SmartUrlTease url={finding.url} />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* ENTERPRISE PAYWALL BANNER */}
                        <div
                          className="mt-6 p-8 border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-transparent rounded-2xl flex flex-col items-center text-center gap-4 animate-[fadeIn_1s_ease-out_forwards]"
                          style={{
                            animationDelay: `${top10Findings.length * 0.05 + 0.2}s`,
                          }}
                        >
                          <div className="text-cyan-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                            <span>🔒</span> SECURE DATA VAULT
                          </div>
                          <div className="text-white/50 text-xs max-w-xl leading-relaxed font-light">
                            Exakte Metadaten, direkte Links und verknüpfte
                            Sitzungsschlüssel unterliegen der
                            Geheimhaltungsstufe und sind im Gast-Modus maskiert.
                            <span className="text-white block mt-2 font-medium">
                              Registrieren Sie ein kostenfreies Konto, um den
                              Report vollständig zu entschlüsseln.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-12 pt-8 border-t border-white/5">
                <button
                  onClick={handleClose}
                  className="px-8 py-4 border border-white/10 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-[10px] font-mono uppercase tracking-[0.2em]"
                >
                  Scanner beenden
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className={`px-10 py-4 ${theme.badgeBg.replace("/10", "")} rounded-2xl text-black hover:opacity-90 transition-all ${theme.glow} text-[10px] font-mono uppercase tracking-[0.2em] font-bold`}
                >
                  Report jetzt freischalten
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes crtTurnOff {
            0% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(1); }
            55% { transform: scaleY(0.002) scaleX(1); opacity: 1; filter: brightness(2.4); }
            78% { transform: scaleY(0.002) scaleX(0.02); opacity: 1; filter: brightness(3); }
            92% { transform: scaleY(0.002) scaleX(0.002); opacity: 0.85; filter: brightness(4); }
            100% { transform: scaleY(0.002) scaleX(0.002); opacity: 0; filter: brightness(1); }
          }
          .animate-crt-off {
            animation: crtTurnOff 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
