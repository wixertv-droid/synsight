"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import type { IntelligenceReport } from "@/lib/analysis/types";

type Phase = "idle" | "confirm";

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

  const [phase, setPhase] = useState<Phase>(autoStart ? "confirm" : "idle");
  const [error, setError] = useState<string | null>(null);

  const beginFlow = () => {
    setError(null);
    setPhase("confirm");
  };

  const onCreditsConfirmed = useCallback(() => {
    router.push("/dashboard/results?tab=google_search&scan=1");
  }, [router]);

  useEffect(() => {
    if (autoStart) setPhase("confirm");
  }, [autoStart]);

  return (
    <main id="google-intelligence-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Google Intelligence"
        title="Google Analyse"
        description="Professionelle OSINT-Auswertung Ihrer Google-Präsenz. Öffentlich indexierte Treffer werden live ausgewertet und als Enterprise-Report im Ergebnis Center dargestellt."
        helpLabel="Ablauf"
        helpText="Nach der SynCredits-Bestätigung startet der SOC-Scan. Anschließend erscheint der vollständige Google Intelligence Report."
      />

      {phase === "idle" ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            ANALYSE BEREIT
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/88">
            Google Analyse
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Diese Analyse durchsucht öffentlich verfügbare Google-Suchergebnisse
            nach den von Ihnen angegebenen Identitätsdaten
            {subjectName ? (
              <>
                {" "}
                für <span className="text-white/85">{subjectName}</span>
              </>
            ) : null}
            . Es werden ausschließlich öffentlich zugängliche Informationen
            ausgewertet.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                DAUER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {googleIntelligenceModule.estimatedDurationLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                ZIEL
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                Ergebnis Center · Google Reiter
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={beginFlow}
            className="mt-6 inline-flex rounded-lg border border-cyber-cyan/50 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-5 py-3 text-sm font-semibold text-[#021019] shadow-[0_12px_30px_rgba(41,182,246,.2)] transition hover:brightness-110"
          >
            Analyse starten
          </button>
          {initialReport ? (
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/results?tab=google_search")
              }
              className="ml-3 mt-6 inline-flex rounded-lg border border-white/10 px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white/85"
            >
              Letzten Report im Ergebnis Center öffnen
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === "confirm" ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            GOOGLE ANALYSE · BESTÄTIGUNG
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/88">
            Google Analyse
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
            Diese Analyse durchsucht öffentlich verfügbare Google-Suchergebnisse
            nach den von Ihnen angegebenen Identitätsdaten. Es werden
            ausschließlich öffentlich zugängliche Informationen ausgewertet.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] tracking-[.1em] text-white/40">
            <span>
              DAUER ·{" "}
              <span className="text-white/70">
                {googleIntelligenceModule.estimatedDurationLabel}
              </span>
            </span>
            <span>
              NACH START ·{" "}
              <span className="text-white/70">
                SynCredits · Auftrag · Ergebnis Center
              </span>
            </span>
          </div>
          <div className="mt-6">
            <ConsumeConfirm
              analysisKey="google_search"
              confirmLabel="Analyse starten"
              onCompleted={() => onCreditsConfirmed()}
            />
          </div>
          {error ? (
            <p className="mt-4 text-sm text-rose-300/80">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="mt-4 text-xs text-white/35 underline-offset-2 hover:text-white/55 hover:underline"
          >
            Abbrechen
          </button>
        </section>
      ) : null}
    </main>
  );
}
