"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface LaunchScreenProps {
  onComplete: () => void;
}

const launchStages = [
  {
    threshold: 0,
    code: "AUTH",
    title: "SECURE ENVIRONMENT AUTHENTICATED",
    detail: "Encrypted launch environment established",
  },
  {
    threshold: 18,
    code: "CORE",
    title: "INITIALIZING SYNSIGHT AI CORE",
    detail: "Intelligence models and analysis systems synchronizing",
  },
  {
    threshold: 42,
    code: "GRAPH",
    title: "ESTABLISHING IDENTITY GRAPH",
    detail: "Secure signal correlation layer coming online",
  },
  {
    threshold: 66,
    code: "SHIELD",
    title: "CALIBRATING PROTECTION LAYER",
    detail: "Privacy and risk controls being verified",
  },
  {
    threshold: 88,
    code: "ONLINE",
    title: "DIGITAL IDENTITY PROTECTION SYSTEM ONLINE",
    detail: "All systems nominal — welcome to SynSight",
  },
] as const;

const securityChecks = [
  { label: "Encrypted environment", threshold: 8 },
  { label: "AI integrity layer", threshold: 28 },
  { label: "Identity graph", threshold: 52 },
  { label: "Privacy controls", threshold: 74 },
  { label: "Protection system", threshold: 94 },
];

export default function LaunchScreen({ onComplete }: LaunchScreenProps) {
  const [progress, setProgress] = useState(1);
  const [exiting, setExiting] = useState(false);

  const complete = useCallback(() => onComplete(), [onComplete]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) {
      complete();
      return;
    }

    const startedAt = performance.now();
    const duration = 4000;
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const linear = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - linear, 1.18);
      setProgress(Math.max(1, Math.min(100, eased * 100)));
      if (linear >= 1) window.clearInterval(interval);
    }, 40);

    const exitTimer = window.setTimeout(() => setExiting(true), 4650);
    const completeTimer = window.setTimeout(complete, 5350);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [complete]);

  const activeStage = useMemo(
    () =>
      [...launchStages]
        .reverse()
        .find((stage) => progress >= stage.threshold) ?? launchStages[0],
    [progress]
  );

  const activeIndex = launchStages.findIndex(
    (stage) => stage.code === activeStage.code
  );
  const online = progress >= 99.5;

  return (
    <div
      className={`launch-screen fixed inset-0 z-[100] overflow-hidden bg-[#020408] text-white transition-all duration-700 ${
        exiting ? "pointer-events-none opacity-0 scale-[1.008]" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-label={`${activeStage.title}, ${Math.round(progress)} Prozent`}
    >
      <div className="launch-ambient absolute inset-0" aria-hidden="true" />
      <div className="launch-grid absolute inset-0" aria-hidden="true" />
      <div className="launch-horizon absolute inset-x-0 top-[47%] h-px" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-between border-b border-white/[0.06] px-6 md:px-10 lg:px-14">
        <div className="flex items-center gap-4">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-cyan-100/20 bg-cyan-100/[0.025]">
            <span className="absolute inset-1.5 rounded-full border border-cyber-blue/15" />
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" fill="none" stroke="#29B6F6" strokeWidth="1" />
              <circle cx="12" cy="12" r="2.3" fill="#70E7FF" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-[.25em] text-white/90">
              SYN<span className="text-cyber-blue">SIGHT</span>
            </p>
            <p className="mt-1 font-mono text-[7px] tracking-[.2em] text-white/25">
              DIGITAL IDENTITY INTELLIGENCE
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-8 font-mono text-[8px] tracking-[.17em] text-white/25 sm:flex">
          <span>REGION / EU</span>
          <span>SESSION / ENCRYPTED</span>
          <span className="flex items-center gap-2 text-emerald-100/50">
            <i className="h-1.5 w-1.5 rounded-full bg-emerald-300/70 shadow-[0_0_8px_rgba(110,231,183,.35)]" />
            LAUNCH CONTROL
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex h-full max-w-[1500px] items-center px-6 pb-36 pt-24 md:px-10 lg:px-14">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1fr_330px]">
          <section className="max-w-4xl">
            <div className="mb-8 flex items-center gap-4 font-mono text-[9px] tracking-[.2em] text-cyber-cyan/50">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-cyber-cyan/60" />
              SECURE SYSTEM LAUNCH / SEQUENCE 01
            </div>

            <div className="relative">
              <span
                className="absolute -left-1 -top-16 select-none font-mono text-[7rem] font-light leading-none tracking-[-.08em] text-white/[0.018] sm:text-[10rem] lg:text-[13rem]"
                aria-hidden="true"
              >
                {Math.round(progress).toString().padStart(3, "0")}
              </span>
              <p className="relative font-mono text-[10px] tracking-[.18em] text-white/30">
                PHASE {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(launchStages.length).padStart(2, "0")}
              </p>
              <p
                key={activeStage.code}
                className="launch-title relative mt-4 max-w-4xl text-balance text-3xl font-medium leading-[1.08] tracking-[-.04em] text-white/95 sm:text-4xl md:text-5xl lg:text-[3.4rem]"
              >
                {activeStage.title}
              </p>
              <p
                key={activeStage.detail}
                className="launch-detail relative mt-5 max-w-xl text-sm leading-relaxed text-slate-300/45 md:text-base"
              >
                {activeStage.detail}
              </p>
            </div>

            <div className="mt-14 max-w-5xl">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[8px] tracking-[.2em] text-white/25">
                    MISSION ELAPSED / SYSTEM INITIALIZATION
                  </p>
                  <p className="mt-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/40">
                    {online ? "ALL SYSTEMS NOMINAL" : `VERIFYING ${activeStage.code}`}
                  </p>
                </div>
                <p className="font-mono text-3xl font-light tabular-nums tracking-[-.04em] text-white/90 md:text-4xl">
                  {Math.round(progress).toString().padStart(3, "0")}
                  <span className="ml-1 text-[10px] tracking-normal text-white/30">
                    %
                  </span>
                </p>
              </div>

              <div className="mission-progress relative h-[7px] bg-white/[0.065]">
                <div
                  className="mission-progress-fill absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                >
                  <span className="mission-progress-head absolute right-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-cyan-50" />
                </div>
                {launchStages.slice(1).map((stage) => (
                  <span
                    key={stage.code}
                    className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-white/10"
                    style={{ left: `${stage.threshold}%` }}
                  />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-5">
                {launchStages.map((stage, index) => {
                  const reached = progress >= stage.threshold;
                  const active = index === activeIndex;
                  return (
                    <div key={stage.code} className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 flex-none rounded-full transition-all duration-500 ${
                            reached
                              ? "bg-cyber-cyan shadow-[0_0_9px_rgba(112,231,255,.5)]"
                              : "bg-white/10"
                          }`}
                        />
                        <span
                          className={`truncate font-mono text-[7px] tracking-[.12em] transition-colors duration-500 sm:text-[8px] ${
                            active
                              ? "text-white/65"
                              : reached
                                ? "text-white/32"
                                : "text-white/12"
                          }`}
                        >
                          {stage.code}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="hidden border-l border-white/[0.07] pl-8 lg:block">
            <div className="mb-7 flex items-center justify-between">
              <p className="font-mono text-[9px] tracking-[.18em] text-white/30">
                SECURITY VERIFICATION
              </p>
              <span className="font-mono text-[8px] text-cyber-cyan/45">
                {securityChecks.filter((check) => progress >= check.threshold).length}/
                {securityChecks.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {securityChecks.map((check, index) => {
                const verified = progress >= check.threshold;
                return (
                  <div
                    key={check.label}
                    className={`flex items-center justify-between border px-3 py-3 transition-all duration-700 ${
                      verified
                        ? "border-cyan-100/[0.08] bg-cyan-100/[0.025]"
                        : "border-white/[0.035] bg-white/[0.008]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] tabular-nums text-white/15">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[11px] transition-colors duration-500 ${
                          verified ? "text-slate-200/60" : "text-white/18"
                        }`}
                      >
                        {check.label}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[7px] tracking-[.12em] ${
                        verified ? "text-cyber-cyan/55" : "text-white/12"
                      }`}
                    >
                      {verified ? "VERIFIED" : "STANDBY"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
              {[62, 88, 74, 96, 52, 81, 68, 91, 77].map((value, index) => (
                <span
                  key={index}
                  className={`h-[2px] transition-all duration-700 ${
                    progress > index * 10
                      ? "bg-cyber-cyan/45"
                      : "bg-white/[0.05]"
                  }`}
                  style={{ opacity: value / 100 }}
                />
              ))}
            </div>
          </aside>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-black/20 px-6 py-5 backdrop-blur-sm md:px-10 lg:px-14">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 font-mono text-[7px] tracking-[.16em] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>SYNSIGHT SECURITY ARCHITECTURE / BUILD 01</span>
          <span className="flex items-center gap-5">
            <i>ENCRYPTED</i>
            <i>PRIVACY BY DESIGN</i>
            <i>EU DATA PRINCIPLE</i>
          </span>
        </div>
      </footer>

      {online && (
        <div className="launch-confirmation pointer-events-none absolute inset-0 z-30 border border-cyber-cyan/15" aria-hidden="true">
          <span className="absolute left-1/2 top-1/2 h-px w-0 -translate-x-1/2 bg-cyan-50/70" />
        </div>
      )}
    </div>
  );
}
