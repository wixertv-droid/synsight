"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleIntelligenceReport from "@/components/analysis/google/GoogleIntelligenceReport";
import IntelligenceScanSequence from "@/components/analysis/intelligence/IntelligenceScanSequence";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import type { IntelligenceReport } from "@/lib/analysis/types";

type Phase = "idle" | "confirm" | "scanning" | "report";

export default function GoogleAnalysisPageClient({
  subjectName,
  initialReport,
}: {
  subjectName: string;
  initialReport: IntelligenceReport | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("start") === "1";

  const [phase, setPhase] = useState<Phase>(
    initialReport ? "report" : autoStart ? "confirm" : "idle"
  );
  const [report, setReport] = useState<IntelligenceReport | null>(
    initialReport
  );
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [creditsConfirmed, setCreditsConfirmed] = useState(false);

  const runAnalysis = useCallback(async () => {
    setError(null);
    setScanning(true);
    setPhase("scanning");

    const scanStart = Date.now();
    const minScanMs = googleIntelligenceModule.minScanMs;

    try {
      const response = await fetch("/api/analysis/google/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json();

      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, minScanMs - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }

      if (!response.ok || !body.success) {
        setError(
          body?.error?.message ?? "Analyse konnte nicht abgeschlossen werden."
        );
        setScanning(false);
        setPhase("idle");
        return;
      }

      setReport(body.data.report);
      setScanning(false);
      setPhase("report");
      router.replace("/dashboard/analysis/google", { scroll: false });
    } catch {
      setError("Verbindung zum Server nicht möglich.");
      setScanning(false);
      setPhase("idle");
    }
  }, [router]);

  useEffect(() => {
    if (creditsConfirmed && phase === "confirm") {
      void runAnalysis();
    }
  }, [creditsConfirmed, phase, runAnalysis]);

  const beginFlow = () => {
    setPhase("confirm");
  };

  return (
    <main id="google-intelligence-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Google Intelligence"
        title="Google Intelligence Report"
        description="Professionelle OSINT-Auswertung Ihrer Google-Präsenz — Scan, Risiko und Handlungsempfehlungen im SOC-Stil. Es werden ausschließlich API-verifizierte und profilbasierte Daten angezeigt."
        helpLabel="Datenquellen"
        helpText="Suchanfragen stammen aus Ihrem Identitätsprofil. Treffer kommen von der Google Custom Search JSON API (wenn konfiguriert) oder aus explizit hinterlegten Profil-Verknüpfungen — keine erfundenen Snippets."
      />

      {phase === "idle" ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            ANALYSE BEREIT
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Zielprofil: <span className="text-white/85">{subjectName}</span>.
            Nach dem Start läuft zuerst die Scan-Sequenz (ca. 6–10 Sekunden).
            Anschließend werden die Ergebnisabschnitte nacheinander
            eingeblendet.
          </p>
          <button
            type="button"
            onClick={beginFlow}
            className="mt-6 inline-flex rounded-lg border border-cyber-cyan/50 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_12px_30px_rgba(41,182,246,.2)] transition hover:brightness-110"
          >
            Google Analyse starten
          </button>
          {report ? (
            <button
              type="button"
              onClick={() => setPhase("report")}
              className="ml-3 mt-6 inline-flex rounded-lg border border-white/10 px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white/85"
            >
              Letzten Report anzeigen
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === "confirm" && !creditsConfirmed ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            SYNCREDITS BESTÄTIGUNG
          </p>
          <p className="mt-3 mb-5 max-w-2xl text-sm text-white/50">
            Bestätigen Sie den Preis für die Google-Analyse. Danach startet
            automatisch die Scan-Sequenz.
          </p>
          <ConsumeConfirm
            analysisKey="google_search"
            onCompleted={() => setCreditsConfirmed(true)}
          />
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="mt-4 text-xs text-white/35 underline-offset-2 hover:text-white/55 hover:underline"
          >
            Abbrechen
          </button>
        </section>
      ) : null}

      {phase === "scanning" ? (
        <IntelligenceScanSequence
          steps={googleIntelligenceModule.scanSteps}
          minDurationMs={googleIntelligenceModule.minScanMs}
          running={scanning}
          subjectName={subjectName}
          onComplete={() => {
            /* report transition handled in runAnalysis */
          }}
        />
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </p>
      ) : null}

      {phase === "report" && report ? (
        <div className="mt-6">
          <GoogleIntelligenceReport report={report} revealSections />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setCreditsConfirmed(false);
                setPhase("confirm");
              }}
              className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2 text-xs font-medium text-cyber-cyan transition hover:border-cyber-cyan/55"
            >
              Analyse erneut starten
            </button>
            <a
              href="/dashboard/results#google_search"
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition hover:border-white/20 hover:text-white/75"
            >
              Im Ergebnis Center anzeigen
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
