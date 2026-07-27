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
    autoStart && apiAvailable ? "confirm" : "idle"
  );
  const [error, setError] = useState<string | null>(() => {
    if (autoStart && !apiAvailable) {
      return "Reverse Image Bildsuche ist aktuell nicht verfügbar (SerpAPI erforderlich).";
    }
    return null;
  });

  const beginFlow = () => {
    setError(null);
    if (!apiAvailable) {
      setError(
        "Reverse Image Bildsuche ist aktuell nicht verfügbar (SerpAPI erforderlich)."
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
    if (autoStart && apiAvailable) {
      setPhase("confirm");
    }
  }, [autoStart, apiAvailable]);

  return (
    <main id="reverse-image-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Reverse Image"
        title="Reverse Image Search"
        description="Zwei Phasen: Bildlinks finden (SerpAPI), dann optional Gesichtsvergleich (InsightFace)."
        helpLabel="Ablauf"
        helpText="Phase 1 durchsucht Name, Alias und Benutzernamen. Danach wählen Sie Bilder aus — der Vergleich wird separat berechnet."
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
            PHASE 1 · BILDSUCHE
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/88">
            Reverse Image · Bildsuche
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            SynSight sucht über SerpAPI in öffentlich indexierten Google-Bildern
            nach Ihrem Namen, Alias und allen Benutzernamen
            {subjectName ? (
              <>
                {" "}
                für <span className="text-white/85">{subjectName}</span>
              </>
            ) : null}
            . Die gefundenen Bildlinks werden gespeichert — der
            InsightFace-Gesichtsvergleich starten Sie danach im Ergebnis Center
            und wird separat berechnet.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                REFERENZBILDER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {referenceImageCount > 0
                  ? `${referenceImageCount} für Phase 2`
                  : "Optional — für Gesichtsvergleich"}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                DAUER PHASE 1
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {reverseImageSearchModule.estimatedDurationLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                PHASE 2
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                Auswahl + InsightFace ≥ 60 %
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={beginFlow}
            className="mt-6 rounded-xl border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-5 py-3 text-sm text-cyber-cyan transition hover:bg-cyber-cyan/[0.14]"
          >
            Bildsuche starten
          </button>
        </section>
      ) : null}

      {phase === "confirm" && apiAvailable ? (
        <ConsumeConfirm
          analysisKey="reverse_image_discovery"
          confirmLabel="Bildsuche starten"
          onCompleted={onCreditsConfirmed}
        />
      ) : null}
    </main>
  );
}
