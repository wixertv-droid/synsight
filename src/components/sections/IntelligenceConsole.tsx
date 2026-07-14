"use client";

import { useEffect, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const activity = [
  { time: "00:01", text: "Öffentliche Profile korreliert", status: "ERKANNT" },
  { time: "00:03", text: "Bekannte Leak-Quellen abgeglichen", status: "GEPRÜFT" },
  { time: "00:05", text: "Reputationssignale klassifiziert", status: "ANALYSIERT" },
  { time: "00:07", text: "Schutzmaßnahmen priorisiert", status: "BEREIT" },
];

const sources = [
  { label: "Öffentliche Profile", value: 82 },
  { label: "Leak-Register", value: 64 },
  { label: "Web-Erwähnungen", value: 48 },
  { label: "Bildsignale", value: 35 },
];

export default function IntelligenceConsole() {
  const { ref, isVisible } = useScrollAnimation();
  const [activeLog, setActiveLog] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setActiveLog(activity.length - 1);
      return;
    }
    const interval = window.setInterval(
      () => setActiveLog((current) => (current + 1) % activity.length),
      2400
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      id="platform"
      className="section-shell content-section relative overflow-hidden px-6 py-24 md:px-12 lg:px-20 lg:py-36"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(41,182,246,.07),transparent_50rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <div
          ref={ref}
          className={`mx-auto mb-14 max-w-3xl text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="hud-label">02 / SynSight Plattform</span>
          <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-[-.045em] md:text-6xl">
            Aus digitalen Spuren wird
            <span className="cyber-gradient block">ein klarer Schutzplan.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-300/60">
            SynSight verbindet verstreute Signale zu einem verständlichen
            Gesamtbild. Sie sehen nicht nur, was gefunden wurde, sondern auch,
            was jetzt wirklich wichtig ist.
          </p>
        </div>

        <div className="glass-strong hardware-panel relative overflow-hidden rounded-[1.4rem] border border-white/[0.09] shadow-[0_50px_120px_rgba(0,0,0,.42)]">
          <div className="flex min-h-14 items-center justify-between border-b border-white/[0.07] px-5 md:px-7">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5" aria-hidden="true">
                <i className="h-1.5 w-1.5 rounded-full bg-white/15" />
                <i className="h-1.5 w-1.5 rounded-full bg-white/15" />
                <i className="h-1.5 w-1.5 rounded-full bg-cyber-cyan/60" />
              </div>
              <span className="font-mono text-[9px] tracking-[.18em] text-white/35">
                SYNSIGHT / IDENTITÄTSÜBERSICHT
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] tracking-[.15em] text-emerald-200/55">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
              ANALYSE BEREIT
            </div>
          </div>

          <div className="grid lg:grid-cols-[.85fr_1.35fr_.8fr]">
            <div className="border-b border-white/[0.07] p-6 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[9px] tracking-[.18em] text-white/30">
                EXPOSITIONSWERT
              </p>
              <div className="relative mx-auto mt-7 flex h-44 w-44 items-center justify-center">
                <svg viewBox="0 0 180 180" className="absolute inset-0 -rotate-90">
                  <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="7" />
                  <circle
                    cx="90"
                    cy="90"
                    r="72"
                    fill="none"
                    stroke="url(#riskScore)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="452"
                    strokeDashoffset="154"
                  />
                  <defs>
                    <linearGradient id="riskScore">
                      <stop stopColor="#29B6F6" />
                      <stop offset="1" stopColor="#70E7FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center">
                  <span className="font-mono text-4xl font-light tabular-nums text-white">
                    66
                  </span>
                  <span className="block text-[10px] uppercase tracking-[.18em] text-white/30">
                    Beispielwert
                  </span>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.025] p-3 text-xs leading-relaxed text-slate-300/55">
                Drei Signale sollten priorisiert geprüft werden. SynSight
                erklärt jedes Risiko in verständlicher Sprache.
              </div>
            </div>

            <div className="border-b border-white/[0.07] p-6 lg:border-b-0 lg:border-r md:p-7">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] tracking-[.18em] text-white/30">
                  ANALYSEAKTIVITÄT
                </p>
                <span className="text-[10px] text-white/25">Beispielanalyse</span>
              </div>
              <div className="mt-6 space-y-1">
                {activity.map((item, index) => {
                  const active = index === activeLog;
                  const complete = index <= activeLog;
                  return (
                    <div
                      key={item.text}
                      className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-lg border px-3 py-3 transition-all duration-700 ${
                        active
                          ? "border-cyber-blue/20 bg-cyber-blue/[0.055]"
                          : "border-transparent bg-white/[0.012]"
                      }`}
                    >
                      <span className="font-mono text-[9px] tabular-nums text-white/20">
                        {item.time}
                      </span>
                      <span className={`text-xs ${complete ? "text-slate-200/75" : "text-white/25"}`}>
                        {item.text}
                      </span>
                      <span className={`font-mono text-[8px] tracking-widest ${complete ? "text-cyber-cyan/60" : "text-white/15"}`}>
                        {complete ? item.status : "WARTET"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {sources.map((source) => (
                  <div key={source.label} className="min-w-0">
                    <div className="flex h-12 items-end rounded-sm bg-white/[0.018] p-1">
                      <span
                        className="block w-full rounded-[2px] bg-gradient-to-t from-cyber-blue/15 to-cyber-cyan/60 transition-all duration-1000"
                        style={{ height: `${source.value}%` }}
                      />
                    </div>
                    <p className="mt-2 truncate text-[8px] text-white/25">
                      {source.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-7">
              <p className="font-mono text-[9px] tracking-[.18em] text-white/30">
                NÄCHSTE SCHRITTE
              </p>
              <div className="mt-6 space-y-3">
                {[
                  ["01", "Kritisches Leak prüfen", "Priorität hoch"],
                  ["02", "Altes Profil schließen", "Priorität mittel"],
                  ["03", "Monitoring aktivieren", "Empfohlen"],
                ].map(([number, label, meta], index) => (
                  <div
                    key={number}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-cyber-cyan/55">
                        {number}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          index === 0 ? "bg-amber-300/70" : "bg-cyber-cyan/50"
                        }`}
                      />
                    </div>
                    <p className="mt-3 text-xs text-white/75">{label}</p>
                    <p className="mt-1 text-[9px] text-white/25">{meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/[0.07] px-5 py-3 font-mono text-[8px] tracking-[.14em] text-white/20 sm:flex-row sm:items-center sm:justify-between md:px-7">
            <span>DEMONSTRATION / KEINE ECHTDATEN</span>
            <span>VERSCHLÜSSELTE VERARBEITUNG · TRANSPARENTE ERGEBNISSE</span>
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-3">
          {[
            ["01", "Entdecken", "Alle relevanten Spuren an einem Ort."],
            ["02", "Verstehen", "Risiken klar erklärt und priorisiert."],
            ["03", "Schützen", "Konkrete Maßnahmen mit Fortschritt."],
          ].map(([number, title, text]) => (
            <div key={number} className="bg-[#050912] p-5">
              <span className="font-mono text-[9px] text-cyber-cyan/45">{number}</span>
              <p className="mt-3 font-medium text-white/85">{title}</p>
              <p className="mt-1 text-sm text-white/35">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
