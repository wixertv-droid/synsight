"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ScannerHUD from "./ScannerHUD";
import type {
  ScanPhase,
  ApiResult,
  ScanData,
  ScanQueries,
  ScanFinding,
  ScanModule,
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

function scrub(value: string) {
  return value
    .replace(/\bTrue\b/g, "Ja")
    .replace(/\bFalse\b/g, "Nein")
    .replace(/Holehe|Maigret|PhoneInfoga/gi, "SynSight")
    .trim();
}

function getThreatTheme(score: number) {
  if (score >= 70) {
    return {
      text: "text-red-400",
      border: "border-red-500/30",
      glow: "shadow-[0_0_40px_rgba(239,68,68,0.15)]",
      badgeBg: "bg-red-500/10",
      dot: "bg-red-400",
      label: "CRITICAL EXPOSURE",
    };
  }
  if (score >= 40) {
    return {
      text: "text-amber-400",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.15)]",
      badgeBg: "bg-amber-500/10",
      dot: "bg-amber-400",
      label: "ELEVATED RISK",
    };
  }
  return {
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.15)]",
    badgeBg: "bg-cyan-500/10",
    dot: "bg-cyan-400",
    label: "MONITORED",
  };
}

function moduleType(mod: ScanModule): "email" | "user" | "phone" | "other" {
  const text = `${mod.id} ${mod.label}`.toLowerCase();
  if (/email|identit|e-mail/.test(text) || text.includes("holehe")) return "email";
  if (/profil|username|alias|user/.test(text) || text.includes("maigret")) return "user";
  if (/phone|telefon|kommunikation|netz/.test(text) || text.includes("phoneinfoga")) return "phone";
  return "other";
}

function moduleTitle(type: ReturnType<typeof moduleType>) {
  if (type === "email") return "E-MAIL IDENTITY EXPOSURE";
  if (type === "user") return "PUBLIC PROFILE CORRELATION";
  if (type === "phone") return "TELECOMMUNICATIONS INTELLIGENCE";
  return "PUBLIC SIGNAL INTELLIGENCE";
}

function moduleDescription(type: ReturnType<typeof moduleType>) {
  if (type === "email") {
    return "SynSight prüft, ob die E-Mail-Adresse in öffentlichen Konto- und Identitätssignalen wiedererkennbar ist.";
  }
  if (type === "user") {
    return "Öffentliche Profilspuren werden verdichtet, um wiederverwendete Namen, Alias-Strukturen und sichtbare Plattformbezüge aufzudecken.";
  }
  if (type === "phone") {
    return "Die Telefonnummer wird auf strukturelle Plausibilität, Anbieterbezug und verwertbare Kommunikations-Metadaten geprüft.";
  }
  return "Zusätzliche öffentliche Signale werden ausgewertet und für den kostenlosen Schnellcheck verdichtet.";
}

function getIntelDescription(type: ReturnType<typeof moduleType>, hasFinding = true) {
  if (!hasFinding) {
    if (type === "email") return "Prüfung abgeschlossen: Keine kritischen Konto-Signale in der Gastvorschau.";
    if (type === "user") return "Prüfung abgeschlossen: Keine starken öffentlichen Profilspuren in der Gastvorschau.";
    if (type === "phone") return "Prüfung abgeschlossen: Keine zusätzlichen kritischen Telefon-Signale in der Gastvorschau.";
    return "Prüfung abgeschlossen: Keine anzeigbaren Gast-Treffer.";
  }
  if (type === "email") return "Öffentliche Konto- und Identitätssignale wurden korreliert.";
  if (type === "user") return "Öffentliche Profil- und Aliasbezüge wurden korreliert.";
  if (type === "phone") return "Telefon- und Anbieter-Metadaten wurden ausgewertet.";
  return "Öffentliches Signal wurde korreliert.";
}

function linesFromFinding(finding: ScanFinding): string[] {
  const value = scrub(finding.detail || finding.description || "");
  return value
    .split(/\n|\s\|\s/g)
    .map((line) => scrub(line))
    .filter(Boolean)
    .slice(0, 8);
}

function valueFromLines(lines: string[], label: string) {
  const line = lines.find((entry) => entry.toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return "Nicht eindeutig";
  return line.split(":").slice(1).join(":").trim() || "Nicht eindeutig";
}

function neutralTitle(finding: ScanFinding, type: ReturnType<typeof moduleType>) {
  if (type === "email") return scrub(finding.title || "Konto-Signal").replace(/Account\s*·\s*/i, "Konto-Signal · ");
  if (type === "user") return finding.url ? "Öffentliche Profilspur" : scrub(finding.title || "Profilkorrelation");
  if (type === "phone") return "Telekommunikations-Intelligenz";
  return scrub(finding.title || "Öffentliches Signal");
}

function SmartUrlTease({ url }: { url?: string }) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return (
      <div className="mt-3 flex w-fit items-center rounded-xl border border-white/10 bg-white/5 p-2 font-mono text-xs backdrop-blur-md">
        <span className="font-bold text-cyan-300">{parsed.hostname}</span>
        <span className="select-none text-white/20 blur-[3px]">/encrypted-path-hidden</span>
      </div>
    );
  } catch {
    return null;
  }
}

function PhoneFindingCard({ finding }: { finding: ScanFinding }) {
  const lines = linesFromFinding(finding);
  const valid = valueFromLines(lines, "Rufnummer validiert");
  const provider = valueFromLines(lines, "Netzbetreiber");
  const region = valueFromLines(lines, "Regionale Zuordnung");
  const rating =
    lines.find((line) => line.toLowerCase().startsWith("bewertung:")) ||
    "Bewertung: Die Nummer ist strukturell prüfbar und einem Anbieter-Kontext zuzuordnen.";

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-black/25 p-5 transition-all hover:border-cyan-400/30">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-white/90">
            Telekommunikations-Intelligenz
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-white/50">
            Für den angegebenen Telefonwert konnten verwertbare Anbieter- und Strukturhinweise ausgewertet werden.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200">
          Telefonwert geprüft
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-1 text-[9px] uppercase tracking-[0.24em] text-white/35">Validiert</div>
          <div className="font-bold text-cyan-200">{valid}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-1 text-[9px] uppercase tracking-[0.24em] text-white/35">Anbieter</div>
          <div className="font-bold text-cyan-200">{provider}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-1 text-[9px] uppercase tracking-[0.24em] text-white/35">Region</div>
          <div className="font-bold text-cyan-200">{region}</div>
        </div>
      </div>
      <div className="mt-4 border-t border-white/5 pt-4 text-xs leading-relaxed text-white/45">
        {scrub(rating.replace(/^Bewertung:\s*/i, ""))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  index,
  type,
}: {
  finding: ScanFinding;
  index: number;
  type: ReturnType<typeof moduleType>;
}) {
  if (type === "phone") return <PhoneFindingCard finding={finding} />;
  return (
    <div
      className="relative rounded-2xl border border-white/5 bg-black/20 p-5 opacity-0 transition-all duration-300 animate-[fadeInUp_0.4s_ease-out_forwards] hover:border-cyan-500/20 hover:bg-white/[0.02]"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-5">
        <div className="mt-1 w-8 shrink-0 text-xl font-black text-white/10">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-sm font-bold uppercase tracking-wider text-white/90">
            {neutralTitle(finding, type)}
          </div>
          <div className="mb-2 text-xs font-light leading-relaxed text-white/45">
            {scrub(finding.description || finding.detail || "Öffentliches Signal wurde im Schnellcheck korreliert.")}
          </div>
          <SmartUrlTease url={finding.url} />
        </div>
      </div>
    </div>
  );
}

function cleanModules(rawData: ScanData | null): ScanModule[] {
  return (rawData?.modules || [])
    .filter((module) => !/spiderfoot/i.test(`${module.id} ${module.label}`))
    .map((module) => {
      const findings = (module.findings || []).filter(
        (finding) =>
          (finding.category || "").toUpperCase() !== "ERROR" &&
          !/gestartet|started/i.test(finding.title || "")
      );
      return { ...module, findings, count: findings.length };
    });
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
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const dossierId = useMemo(() => dossierIdFromTarget(target), [target]);
  const [dossierTime] = useState(() => new Date().toLocaleString("de-DE"));
  const score = rawData?.exposureScore || 0;
  const theme = getThreatTheme(score);
  const modules = useMemo(() => cleanModules(rawData), [rawData]);
  const totalFindings = modules.reduce((sum, module) => sum + module.count, 0);

  useEffect(() => {
    if (phase === "fullscreen_result" || phase === "scanning") document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "fullscreen_result") {
      setIsClosing(false);
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
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
    setTimeout(() => onClose(), 1250);
  };

  if (phase === "fullscreen_result" || phase === "closing_crt") {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto bg-[#020611]/90 font-sans text-white backdrop-blur-3xl selection:bg-cyan-500/30 ${isClosing ? "animate-crt-off" : ""}`}>
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)]" />
        <div className={`relative z-10 mx-auto max-w-7xl px-4 py-8 transition-all duration-1000 sm:px-6 sm:py-12 ${showContent && !isClosing ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}>
          <div className="relative z-10 mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-400/80">
                <div className={`h-1.5 w-1.5 rounded-full ${theme.dot} animate-pulse`} />
                Target Analysis Complete
              </div>
              <h1 className="text-4xl font-light tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] md:text-5xl">
                Digital <span className="font-black">Exposure</span>
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] tracking-widest text-white/40">SUBJECT:</span>
                <span className="rounded-full border border-cyan-500/20 bg-cyan-950/40 px-4 py-1.5 font-mono font-bold text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-md">
                  {target}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-6 font-mono text-[10px] tracking-widest text-white/40">
                <span>DOSSIER ID:</span><span className="font-bold text-white">{dossierId}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-6 font-mono text-[10px] tracking-widest text-white/40">
                <span>TIMESTAMP:</span><span>{dossierTime}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-4">
              <div className={`relative flex flex-col items-center justify-center rounded-3xl border ${theme.border} bg-white/[0.02] p-8 py-12 shadow-2xl backdrop-blur-2xl ${theme.glow}`}>
                <div className="z-10 mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Exposure Score</div>
                <div className="relative z-10 mb-6 flex items-center justify-center">
                  <div className={`absolute h-40 w-40 rounded-full border-[1px] border-dashed ${theme.border} opacity-50 animate-[spin_20s_linear_infinite]`} />
                  <div className={`absolute h-32 w-32 rounded-full border-[2px] ${theme.border} border-t-transparent animate-[spin_8s_linear_infinite_reverse]`} />
                  <div className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-white/[0.02] to-transparent backdrop-blur-sm" />
                  <div className={`text-7xl font-black ${theme.text} drop-shadow-[0_0_20px_currentColor]`}>{score}</div>
                </div>
                <div className={`z-10 mt-4 flex items-center gap-3 rounded-full border ${theme.border} ${theme.badgeBg} px-6 py-2.5 backdrop-blur-md`}>
                  <div className={`h-2 w-2 rounded-full ${theme.dot} animate-ping`} />
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${theme.text}`}>{theme.label}</span>
                </div>
              </div>
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <div className="h-1 w-1 rounded-full bg-cyan-500" /> Analyst Summary
                </div>
                <p className="text-sm font-light leading-relaxed text-white/70">
                  {totalFindings > 0
                    ? "Die kostenlose Kurzprüfung hat öffentliche Signale gefunden. Der Gastbericht zeigt eine reduzierte Vorschau; Details und Handlungsempfehlungen werden nach Registrierung freigeschaltet."
                    : "Die kostenlosen Schnellprüfungen wurden ausgeführt. In der Gastvorschau wurden keine kritischen öffentlichen Treffer bestätigt."}
                </p>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-8">
              {modules.length === 0 && (
                <div className="relative rounded-3xl border border-cyan-500/20 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl">
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-white">Keine Prüfschritt-Antworten empfangen</div>
                  <p className="text-sm leading-relaxed text-white/50">Der Schnellcheck wurde beendet, aber es wurden keine verwertbaren Antworten geliefert. Bitte API-URL, Key und Scanner-Prozess prüfen.</p>
                </div>
              )}

              {modules.map((mod) => {
                const isExpanded = expandedModules[mod.id];
                const type = moduleType(mod);
                const findings = mod.findings.slice(0, 10);
                return (
                  <div key={mod.id} className={`group relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-cyan-500/30 md:p-8 ${isExpanded ? "bg-white/[0.04]" : ""}`}>
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
                      <div className="flex-1">
                        <div className="mb-4 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.1em] text-white">
                          <div className={`h-1.5 w-1.5 rounded-full ${theme.dot} shadow-[0_0_10px_currentColor]`} />
                          {moduleTitle(type)}
                        </div>
                        <div className="pr-4 text-xs font-light leading-relaxed text-white/50">{moduleDescription(type)}</div>
                      </div>
                      <div className="mt-4 flex w-full flex-row items-center gap-4 md:mt-0 md:w-auto md:flex-col md:items-end">
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 font-mono text-[10px] text-white/40 backdrop-blur-md">
                          SIGNALS FOUND:<span className="ml-2 text-sm font-bold text-cyan-400">{mod.count}</span>
                        </div>
                        <button onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))} className={`w-full rounded-xl border px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-300 md:w-auto ${isExpanded ? "border-cyan-900/50 bg-cyan-950/20 text-cyan-600" : "border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:border-cyan-500 hover:bg-cyan-500 hover:text-black"}`}>
                          {isExpanded ? "[-] EINKLAPPEN" : mod.count > 0 ? "[+] ENTSCHLÜSSELN" : "[+] PRÜFBERICHT"}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-8 space-y-4 border-t border-white/5 pt-8">
                        {findings.length === 0 && (
                          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                            <div className="mb-2 text-sm font-bold uppercase tracking-wider text-white/90">Keine kritischen Gast-Treffer</div>
                            <div className="text-xs font-light leading-relaxed text-white/45">{getIntelDescription(type, false)} Der Prüfschritt wurde trotzdem vollständig in die Auswertung aufgenommen.</div>
                          </div>
                        )}
                        {findings.map((finding, index) => (
                          <FindingCard key={`${mod.id}-${index}`} finding={finding} index={index} type={type} />
                        ))}
                        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-transparent p-8 text-center animate-[fadeIn_1s_ease-out_forwards]">
                          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"><span>🔒</span> SECURE DATA VAULT</div>
                          <div className="max-w-xl text-xs font-light leading-relaxed text-white/50">Exakte Metadaten, direkte Links und verknüpfte Signale sind im Gast-Modus maskiert.<span className="mt-2 block font-medium text-white">Registrieren Sie ein kostenfreies Konto, um den Report vollständig zu entschlüsseln.</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-12 flex flex-col justify-end gap-4 border-t border-white/5 pt-8 sm:flex-row">
                <button onClick={handleClose} className="rounded-2xl border border-white/10 px-8 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 transition-all hover:bg-white/5 hover:text-white">Scanner beenden</button>
                <button onClick={() => router.push("/register")} className={`rounded-2xl px-10 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:opacity-90 ${theme.dot} ${theme.glow}`}>Report jetzt freischalten</button>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes crtTurnOff { 0% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(1); } 70% { transform: scaleY(0.002) scaleX(1); opacity: 1; filter: brightness(2.4); } 100% { transform: scaleY(0.002) scaleX(0.002); opacity: 0; filter: brightness(1); } }
          .animate-crt-off { animation: crtTurnOff 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        `}</style>
      </div>
    );
  }
  return null;
}
