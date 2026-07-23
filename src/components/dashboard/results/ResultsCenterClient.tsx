"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleIntelligenceReport from "@/components/analysis/google/GoogleIntelligenceReport";
import IntelligenceScanSequence from "@/components/analysis/intelligence/IntelligenceScanSequence";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import type { IntelligenceReport } from "@/lib/analysis/types";

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

  const [activeTab, setActiveTab] = useState(() =>
    tabs.some((tab) => tab.id === requestedTab) ? requestedTab : tabs[0].id
  );
  const [report, setReport] = useState<IntelligenceReport | null>(() =>
    normalizeIntelligenceReport(initialGoogleReport)
  );
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const scanStartedRef = useRef(false);

  const activeModule = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [activeTab, tabs]
  );

  const finishScanAttempt = useCallback(
    (options?: { clearScanParam?: boolean }) => {
      setScanning(false);
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
    const scanStart = Date.now();
    const minScanMs = Math.max(
      googleIntelligenceModule.minScanMs,
      googleIntelligenceModule.scanSteps.at(-1)?.atMs ??
        googleIntelligenceModule.minScanMs
    );

    try {
      const response = await fetch("/api/analysis/google/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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
      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }

      if (!response.ok || !body.success) {
        setError(
          body?.error?.message ??
            (response.status === 500
              ? "Serverfehler bei der Google-Analyse. Bitte API-Keys unter Website → API prüfen und erneut versuchen."
              : "Analyse konnte nicht abgeschlossen werden.")
        );
        finishScanAttempt();
        return;
      }

      const nextReport = normalizeIntelligenceReport(body.data?.report);
      if (!nextReport) {
        setError(
          "Analyse abgeschlossen, aber der Report war unvollständig. Bitte erneut versuchen."
        );
        finishScanAttempt();
        return;
      }

      setReport(nextReport);
      finishScanAttempt();
    } catch {
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt();
    }
  }, [finishScanAttempt]);

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

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Jede Analyse besitzt einen eigenen Reiter. Nach dem Start erscheint zuerst die SOC-Scan-Sequenz, anschließend der Enterprise OSINT Report mit Live-Treffern."
        helpLabel="Ergebnis Center"
        helpText="SynCredits werden im Analyse Center vor dem Start abgebucht. Der Bericht wird gespeichert und kann später erneut geöffnet werden."
      />

      <nav
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

      <div className="mt-6">
        {activeModule.id === "google_search" ? (
          <>
            {scanning ? (
              <IntelligenceScanSequence
                steps={googleIntelligenceModule.scanSteps}
                minDurationMs={googleIntelligenceModule.minScanMs}
                running={scanning}
                subjectName={subjectName}
                onComplete={() => undefined}
              />
            ) : null}

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                {error}
              </p>
            ) : null}

            {!scanning && report ? (
              <GoogleIntelligenceReport report={report} revealSections />
            ) : null}

            {!scanning && !report && !error ? (
              <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                  GOOGLE ANALYSE
                </p>
                <p className="mt-3 text-sm text-white/50">
                  Noch kein Report vorhanden. Starten Sie die Analyse im Analyse
                  Center.
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
    </main>
  );
}
