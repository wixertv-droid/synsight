"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleIntelligenceReport from "@/components/analysis/google/GoogleIntelligenceReport";
import IntelligenceScanSequence from "@/components/analysis/intelligence/IntelligenceScanSequence";
import DashboardPageRail from "@/components/dashboard/DashboardPageRail";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  DEFAULT_REPORT_RETENTION_DAYS,
  parseRetentionDays,
  REPORT_RETENTION_PRESETS,
  REPORT_RETENTION_STORAGE_KEY,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { RESULTS_CENTER_RAIL } from "@/lib/dashboard/page-rails";

export interface ResultsTabModule {
  id: string;
  title: string;
  help: string;
  tagline: string;
  available: boolean;
}

const FALLBACK_TABS: ResultsTabModule[] = [
  {
    id: "google_search",
    title: "Google Analyse",
    help: "Öffentliche Google-Suchtreffer",
    tagline: "OSINT Google Report",
    available: true,
  },
  {
    id: "phone_analysis",
    title: "Telefon Analyse",
    help: "Telefonnummer-Sichtbarkeit",
    tagline: "Folgt",
    available: false,
  },
  {
    id: "email_analysis",
    title: "E-Mail Analyse",
    help: "E-Mail-Sichtbarkeit",
    tagline: "Folgt",
    available: false,
  },
  {
    id: "social_media",
    title: "Social Analyse",
    help: "Social-Media-Profile",
    tagline: "Folgt",
    available: false,
  },
  {
    id: "darknet",
    title: "Darknet Analyse",
    help: "Darknet-Hinweise",
    tagline: "Folgt",
    available: false,
  },
  {
    id: "reverse_image_search",
    title: "Bildanalyse",
    help: "Bild-Rückwärtssuche",
    tagline: "Folgt",
    available: false,
  },
];

function readStoredRetention(): ReportRetentionDays {
  if (typeof window === "undefined") return DEFAULT_REPORT_RETENTION_DAYS;
  try {
    return parseRetentionDays(
      window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
    );
  } catch {
    return DEFAULT_REPORT_RETENTION_DAYS;
  }
}

async function loadLatestReport(): Promise<IntelligenceReport | null> {
  const response = await fetch("/api/analysis/google/latest", {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) return null;
  return normalizeIntelligenceReport(body.data?.report);
}

export default function ResultsCenterClient({
  modules,
  initialGoogleReport,
  subjectName,
}: {
  modules: ResultsTabModule[];
  initialGoogleReport: IntelligenceReport | null;
  subjectName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = modules.length > 0 ? modules : FALLBACK_TABS;

  const requestedTab = searchParams.get("tab") ?? "google_search";
  const shouldScan = searchParams.get("scan") === "1";
  const retentionFromUrl = parseRetentionDays(
    searchParams.get("retention"),
    DEFAULT_REPORT_RETENTION_DAYS
  );

  const [activeTab, setActiveTab] = useState(() =>
    tabs.some((tab) => tab.id === requestedTab) ? requestedTab : tabs[0].id
  );
  const [report, setReport] = useState<IntelligenceReport | null>(() =>
    normalizeIntelligenceReport(initialGoogleReport)
  );
  const [scanning, setScanning] = useState(false);
  const [scanApiReady, setScanApiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const [retentionDays, setRetentionDays] = useState<ReportRetentionDays>(
    () => {
      // Prefer URL (from Analyse-Start) so Scan denselben Wert speichert
      if (typeof window !== "undefined") {
        const fromUrl = new URLSearchParams(window.location.search).get(
          "retention"
        );
        if (fromUrl != null) return parseRetentionDays(fromUrl);
        return readStoredRetention();
      }
      return retentionFromUrl;
    }
  );
  const scanStartedRef = useRef(false);

  useEffect(() => {
    const fromUrl = searchParams.get("retention");
    if (fromUrl != null) {
      setRetentionDays(retentionFromUrl);
      try {
        window.localStorage.setItem(
          REPORT_RETENTION_STORAGE_KEY,
          String(retentionFromUrl)
        );
      } catch {
        /* ignore */
      }
      return;
    }
    setRetentionDays(readStoredRetention());
  }, [retentionFromUrl, searchParams]);

  const activeModule = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [activeTab, tabs]
  );

  const finishScanAttempt = useCallback(
    (options?: { clearScanParam?: boolean }) => {
      setScanning(false);
      setScanApiReady(false);
      setScanDone(true);
      if (options?.clearScanParam !== false) {
        router.replace("/dashboard/results?tab=google_search", {
          scroll: false,
        });
      }
    },
    [router]
  );

  const runGoogleScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setScanApiReady(false);
    const scanStart = Date.now();
    const minScanMs = Math.max(
      googleIntelligenceModule.minScanMs,
      googleIntelligenceModule.scanSteps.at(-1)?.atMs ??
        googleIntelligenceModule.minScanMs
    );

    try {
      // Retention zur Laufzeit nochmals auflösen (URL/Storage), falls State noch Default war
      const effectiveRetention = parseRetentionDays(
        searchParams.get("retention") ??
          (typeof window !== "undefined"
            ? window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
            : null),
        retentionDays
      );
      if (effectiveRetention !== retentionDays) {
        setRetentionDays(effectiveRetention);
      }

      const response = await fetch("/api/analysis/google/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: effectiveRetention }),
      });
      // API fertig → Balken darf auf 100 % (nach Mindestanimation)
      setScanApiReady(true);
      let body: {
        success?: boolean;
        data?: { report?: unknown };
        error?: { message?: string };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, minScanMs - elapsed);
      // Kurze Pause bei 100 %, damit der Mission-Balken sichtbar abschließt
      await new Promise((resolve) =>
        window.setTimeout(resolve, waitMs > 0 ? waitMs : 500)
      );

      if (!response.ok || !body.success) {
        // Gateway timeout: analysis may still finish server-side and save the report
        if (response.status === 502 || response.status === 504) {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 1500 + attempt * 1000)
            );
            const recovered = await loadLatestReport();
            if (recovered) {
              setReport(recovered);
              setError(null);
              finishScanAttempt();
              return;
            }
          }
          setError(
            "Die Analyse dauerte zu lange (Gateway-Timeout). Bitte Seite aktualisieren — der Report wird oft trotzdem gespeichert."
          );
          finishScanAttempt();
          return;
        }

        setError(
          body?.error?.message ??
            (response.status === 500
              ? "Serverfehler bei der Google-Analyse. Bitte SerpAPI unter Website → APIs & Integrationen prüfen."
              : "Analyse konnte nicht abgeschlossen werden.")
        );
        finishScanAttempt();
        return;
      }

      const nextReport = normalizeIntelligenceReport(body.data?.report);
      if (!nextReport) {
        const recovered = await loadLatestReport();
        if (recovered) {
          setReport(recovered);
          finishScanAttempt();
          return;
        }
        setError(
          "Analyse abgeschlossen, aber der Report war unvollständig. Bitte erneut versuchen."
        );
        finishScanAttempt();
        return;
      }

      setReport(nextReport);
      finishScanAttempt();
    } catch {
      const recovered = await loadLatestReport().catch(() => null);
      if (recovered) {
        setReport(recovered);
        finishScanAttempt();
        return;
      }
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt();
    }
  }, [finishScanAttempt, retentionDays, searchParams]);

  useEffect(() => {
    if (
      shouldScan &&
      activeTab === "google_search" &&
      !scanning &&
      !scanDone &&
      !scanStartedRef.current
    ) {
      scanStartedRef.current = true;
      void runGoogleScan();
    }
  }, [shouldScan, activeTab, scanning, scanDone, runGoogleScan]);

  function selectTab(id: string) {
    setActiveTab(id);
    router.replace(`/dashboard/results?tab=${id}`, { scroll: false });
  }

  function updateRetention(days: ReportRetentionDays) {
    setRetentionDays(days);
    try {
      window.localStorage.setItem(REPORT_RETENTION_STORAGE_KEY, String(days));
    } catch {
      /* ignore */
    }
  }

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Jede Analyse besitzt einen eigenen Reiter. Nach dem Start erscheint zuerst die SOC-Scan-Sequenz, anschließend der Enterprise OSINT Report mit Live-Treffern."
        helpLabel="Ergebnis Center"
        helpText="SynCredits werden im Analyse Center vor dem Start abgebucht. Der Bericht wird gespeichert — die Speicherdauer können Sie unten wählen."
      />

      {!scanning && report && activeModule.id === "google_search" ? (
        <>
          <nav
            id="results-tabs"
            aria-label="Analyse-Reiter"
            className="mt-6 flex gap-1 overflow-x-auto rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-1.5"
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-[12px] transition ${
                    active
                      ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
                      : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
                  }`}
                >
                  {tab.title}
                </button>
              );
            })}
          </nav>

          <section
            id="results-retention"
            className="mt-4 scroll-mt-24 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                  REPORT SPEICHERN
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Wie lange soll das Suchergebnis gespeichert bleiben?
                </p>
              </div>
              <label className="block min-w-[200px]">
                <span className="sr-only">Speicherdauer</span>
                <select
                  value={retentionDays}
                  disabled={scanning}
                  onChange={(event) =>
                    updateRetention(
                      parseRetentionDays(Number(event.target.value))
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                >
                  {REPORT_RETENTION_PRESETS.map((preset) => (
                    <option key={preset.days} value={preset.days}>
                      {preset.label} — {preset.description}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div id="results-body" className="mt-6 scroll-mt-24">
            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                {error}
              </p>
            ) : null}
            <GoogleIntelligenceReport report={report} revealSections />
          </div>
        </>
      ) : (
        <DashboardPageRail sections={RESULTS_CENTER_RAIL}>
          <nav
            id="results-tabs"
            aria-label="Analyse-Reiter"
            className="mt-6 flex gap-1 overflow-x-auto rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-1.5"
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-[12px] transition ${
                    active
                      ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
                      : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
                  }`}
                >
                  {tab.title}
                </button>
              );
            })}
          </nav>

          {activeModule.id === "google_search" && !scanning ? (
            <section
              id="results-retention"
              className="mt-4 scroll-mt-24 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                    REPORT SPEICHERN
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Wie lange soll das Suchergebnis gespeichert bleiben?
                  </p>
                </div>
                <label className="block min-w-[200px]">
                  <span className="sr-only">Speicherdauer</span>
                  <select
                    value={retentionDays}
                    disabled={scanning}
                    onChange={(event) =>
                      updateRetention(
                        parseRetentionDays(Number(event.target.value))
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                  >
                    {REPORT_RETENTION_PRESETS.map((preset) => (
                      <option key={preset.days} value={preset.days}>
                        {preset.label} — {preset.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ) : (
            <div id="results-retention" className="sr-only" />
          )}

          <div id="results-body" className="mt-6 scroll-mt-24">
            {activeModule.id === "google_search" ? (
              <>
                {scanning ? (
                  <IntelligenceScanSequence
                    steps={googleIntelligenceModule.scanSteps}
                    minDurationMs={googleIntelligenceModule.minScanMs}
                    running={scanning}
                    subjectName={subjectName}
                    apiReady={scanApiReady}
                    onComplete={() => undefined}
                  />
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                    {error}
                  </p>
                ) : null}

                {!scanning && !report && !error ? (
                  <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                    <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      GOOGLE ANALYSE
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      Noch kein Report vorhanden. Starten Sie die Analyse im
                      Analyse Center.
                    </p>
                    <a
                      href="/dashboard/analysis/google?start=1"
                      className="mt-5 inline-flex rounded-lg border border-cyber-cyan/50 bg-cyber-cyan/[0.1] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
                    >
                      Google Analyse starten
                    </a>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                  {activeModule.title.toUpperCase()}
                </p>
                <p className="mt-3 text-sm text-white/50">
                  {activeModule.available
                    ? activeModule.tagline
                    : "Dieses Modul wird in einem späteren Sprint freigeschaltet. Die Google Analyse ist bereits verfügbar."}
                </p>
              </section>
            )}
          </div>
        </DashboardPageRail>
      )}
    </main>
  );
}
