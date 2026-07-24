"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { digitalLeakExposureModule } from "@/lib/analysis/digital-exposure/module";

type Phase = "idle" | "confirm";

export default function DigitalExposurePageClient({
  subjectName,
  apiAvailable,
}: {
  subjectName: string;
  apiAvailable: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("start") === "1";

  const [phase, setPhase] = useState<Phase>(
    autoStart && apiAvailable ? "confirm" : "idle"
  );
  const [error, setError] = useState<string | null>(
    autoStart && !apiAvailable
      ? "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
      : null
  );

  const beginFlow = () => {
    setError(null);
    if (!apiAvailable) {
      setError(
        "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
      );
      return;
    }
    setPhase("confirm");
  };

  const onCreditsConfirmed = useCallback(() => {
    router.push("/dashboard/results?tab=digital_leak_exposure&scan=1");
  }, [router]);

  useEffect(() => {
    if (autoStart && apiAvailable) setPhase("confirm");
  }, [autoStart, apiAvailable]);

  return (
    <main id="digital-exposure-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Digital Exposure"
        title="Digital Leak & Exposure Scan"
        description="Professionelle Prüfung öffentlich bekannter Datenlecks anhand hinterlegter E-Mail-Adressen und Telefonnummern."
        helpLabel="Ablauf"
        helpText="Nach der SynCredits-Bestätigung startet der Exposure-Scan. Ergebnisse erscheinen im Ergebnis Center."
      />

      {error ? (
        <p
          className="mb-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100/80"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {phase === "idle" ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            ANALYSE BEREIT
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/88">
            Digital Leak & Exposure Scan
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Überprüfung öffentlich bekannter Datenlecks, kompromittierter
            Identifikatoren und digitaler Sicherheitsrisiken
            {subjectName ? (
              <>
                {" "}
                für <span className="text-white/85">{subjectName}</span>
              </>
            ) : null}
            . Es werden nur bestätigte API-Ergebnisse angezeigt — keine
            Vermutungen, keine Passwortwerte.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                DAUER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {digitalLeakExposureModule.estimatedDurationLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                ZIEL
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                Ergebnis Center · Digital Leak & Exposure
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={beginFlow}
            className="mt-6 rounded-xl border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-5 py-3 text-sm text-cyber-cyan transition hover:bg-cyber-cyan/[0.14]"
          >
            Analyse starten
          </button>
        </section>
      ) : null}

      {phase === "confirm" && apiAvailable ? (
        <ConsumeConfirm
          analysisKey="digital_leak_exposure"
          confirmLabel="Analyse starten"
          onCompleted={() => onCreditsConfirmed()}
        />
      ) : null}
    </main>
  );
}
