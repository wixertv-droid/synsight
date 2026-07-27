"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { reverseImageSearchModule } from "@/lib/analysis/reverse-image/module";

type Phase = "idle" | "confirm";

export default function ReverseImagePageClient({
  subjectName,
  apiAvailable,
  referenceImageCount,
}: {
  subjectName: string;
  apiAvailable: boolean;
  referenceImageCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("start") === "1";

  const [phase, setPhase] = useState<Phase>(
    autoStart && apiAvailable && referenceImageCount > 0 ? "confirm" : "idle"
  );
  const [error, setError] = useState<string | null>(() => {
    if (referenceImageCount <= 0) {
      return "Bitte laden Sie mindestens ein Referenzbild im Identitätsprofil hoch.";
    }
    if (autoStart && !apiAvailable) {
      return "Reverse Image Search ist aktuell nicht verfügbar (SerpAPI + InsightFace).";
    }
    return null;
  });

  const beginFlow = () => {
    setError(null);
    if (referenceImageCount <= 0) {
      setError(
        "Bitte laden Sie mindestens ein Referenzbild im Identitätsprofil hoch."
      );
      return;
    }
    if (!apiAvailable) {
      setError(
        "Reverse Image Search ist aktuell nicht verfügbar (SerpAPI + InsightFace)."
      );
      return;
    }
    setPhase("confirm");
  };

  const onCreditsConfirmed = useCallback(
    (payload: { requestId: string }) => {
      const params = new URLSearchParams({
        tab: "reverse_image_search",
        scan: "1",
        requestId: payload.requestId,
      });
      router.push(`/dashboard/results?${params.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    if (autoStart && apiAvailable && referenceImageCount > 0) {
      setPhase("confirm");
    }
  }, [autoStart, apiAvailable, referenceImageCount]);

  return (
    <main id="reverse-image-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Reverse Image"
        title="Reverse Image Search"
        description="Öffentliche Google-Bildindex-Suche mit InsightFace-Abgleich gegen Ihre Referenzfotos."
        helpLabel="Ablauf"
        helpText="Nach der SynCredits-Bestätigung startet die visuelle Suche. Treffer erscheinen im Ergebnis Center."
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
            Reverse Image Search
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            SynSight sucht über SerpAPI in öffentlich indexierten Google-Bildern
            nach Ihrem Namen und Ihren Benutzernamen, lädt Kandidaten temporär
            herunter und vergleicht sie per InsightFace mit Ihren Referenzfotos
            {subjectName ? (
              <>
                {" "}
                für <span className="text-white/85">{subjectName}</span>
              </>
            ) : null}
            . Es werden nur Google-Vorschauen genutzt — kein direkter Zugriff
            auf Social-Media-APIs.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                REFERENZBILDER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {referenceImageCount} hochgeladen
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                DAUER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {reverseImageSearchModule.estimatedDurationLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                SCHWELLE
              </dt>
              <dd className="mt-1 text-sm text-white/70">≥ 60 % Ähnlichkeit</dd>
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

      {phase === "confirm" && apiAvailable && referenceImageCount > 0 ? (
        <ConsumeConfirm
          analysisKey="reverse_image_search"
          confirmLabel="Analyse starten"
          onCompleted={onCreditsConfirmed}
        />
      ) : null}
    </main>
  );
}
