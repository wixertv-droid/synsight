"use client";

import { useEffect, useState } from "react";
import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";

const STORAGE_KEY = "synsight.securityPanel.collapsed";

export default function SecurityPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore private-mode / blocked storage
    }
    setReady(true);
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <section className="glass-strong hardware-panel relative z-0 mb-6 overflow-hidden rounded-[1.4rem] border border-cyber-blue/15 shadow-[0_35px_100px_rgba(0,0,0,.3)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot pulse={!collapsed} />
          <span className="truncate font-mono text-[9px] tracking-[.18em] text-emerald-100/50">
            SYNSIGHT AI SECURITY STATUS
          </span>
          <InfoTooltip label="Sicherheitsstatus">
            {guidance.dashboard.securityStatus}
          </InfoTooltip>
          {ready && collapsed ? (
            <span className="hidden font-mono text-[8px] tracking-[.12em] text-white/25 sm:inline">
              AUSGEBLENDET
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="security-status-body"
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-[8px] tracking-[.12em] text-white/45 transition hover:border-cyber-cyan/30 hover:text-cyber-cyan/80"
        >
          {collapsed ? "EINBLENDEN" : "AUSBLENDEN"}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div
        id="security-status-body"
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-24 -top-24 h-72 w-72 overflow-hidden rounded-full bg-cyber-blue/[0.07] blur-[80px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
                  System online.
                  <span className="block text-slate-300/45">
                    Ihre digitale Identität wird überwacht.
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/35">
                  Die letzte Analyse wurde erfolgreich synchronisiert. Drei
                  priorisierte Maßnahmen können Ihren Schutzstatus weiter
                  verbessern.
                </p>
                <div className="mt-6 flex flex-wrap gap-5 font-mono text-[8px] tracking-[.13em] text-white/24">
                  <span>MONITORING / AKTIV</span>
                  <span>LETZTE ANALYSE / HEUTE</span>
                  <span>REGION / EU</span>
                </div>
              </div>

              <div className="relative flex h-44 w-44 items-center justify-center justify-self-center lg:h-48 lg:w-48">
                <svg
                  viewBox="0 0 200 200"
                  className="absolute inset-0 -rotate-90"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="78"
                    fill="none"
                    stroke="rgba(255,255,255,.055)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="78"
                    fill="none"
                    stroke="url(#securityScore)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="490"
                    strokeDashoffset="108"
                  />
                  <defs>
                    <linearGradient id="securityScore">
                      <stop stopColor="#29B6F6" />
                      <stop offset="1" stopColor="#70E7FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center">
                  <span className="font-mono text-4xl font-light tabular-nums text-white">
                    78
                  </span>
                  <span className="text-sm text-white/25"> / 100</span>
                  <p className="mt-2 text-[9px] uppercase tracking-[.16em] text-cyber-cyan/50">
                    Sicherheitsbewertung
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
