"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { usernameIntelligenceModule } from "@/lib/analysis/username/module";
import {
  DEFAULT_REPORT_RETENTION_DAYS,
  parseRetentionDays,
  REPORT_RETENTION_PRESETS,
  REPORT_RETENTION_STORAGE_KEY,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";

type Phase = "idle" | "confirm";

export default function UsernamePageClient({
  subjectName,
  apiAvailable,
  hasUsername,
}: {
  subjectName: string;
  apiAvailable: boolean;
  hasUsername: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("start") === "1";
  const canStart = apiAvailable && hasUsername;

  const [phase, setPhase] = useState<Phase>(
    autoStart && canStart ? "confirm" : "idle"
  );
  const [retentionDays, setRetentionDays] = useState<ReportRetentionDays>(
    DEFAULT_REPORT_RETENTION_DAYS
  );
  const [error, setError] = useState<string | null>(() => {
    if (autoStart && !apiAvailable) {
      return "Username Intelligence Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator.";
    }
    if (autoStart && !hasUsername) {
      return "Bitte hinterlegen Sie zuerst einen Benutzernamen oder Alias im Identitätsprofil.";
    }
    return null;
  });

  useEffect(() => {
    try {
      setRetentionDays(
        parseRetentionDays(
          window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
        )
      );
    } catch {
      setRetentionDays(DEFAULT_REPORT_RETENTION_DAYS);
    }
  }, []);

  const beginFlow = () => {
    setError(null);
    if (!apiAvailable) {
      setError(
        "Username Intelligence Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
      );
      return;
    }
    if (!hasUsername) {
      setError(
        "Bitte hinterlegen Sie zuerst einen Benutzernamen oder Alias im Identitätsprofil."
      );
      return;
    }
    setPhase("confirm");
  };

  const onCreditsConfirmed = useCallback(() => {
    try {
      window.localStorage.setItem(
        REPORT_RETENTION_STORAGE_KEY,
        String(retentionDays)
      );
    } catch {
      /* ignore */
    }
    router.push(
      `/dashboard/results?tab=username_intelligence&scan=1&retention=${retentionDays}`
    );
  }, [retentionDays, router]);

  useEffect(() => {
    if (autoStart && canStart) setPhase("confirm");
  }, [autoStart, canStart]);

  return (
    <main id="username-intelligence-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Username Intelligence"
        title="Username Intelligence Scan"
        description="Öffentliche Profile, Foren und Communities zu Ihren Benutzernamen — mit Identity Confidence."
        helpLabel="Ablauf"
        helpText="Nach der SynCredits-Bestätigung startet der Username-Scan. Ergebnisse erscheinen im Ergebnis Center."
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
            Username Intelligence Scan
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Hochwertige SerpAPI-Suche nach öffentlichen Profilen und Communities
            {subjectName ? (
              <>
                {" "}
                für <span className="text-white/85">{subjectName}</span>
              </>
            ) : null}
            . Maximal 5–8 Suchanfragen, Identity Confidence ab 60 %, keine
            Vermutungen.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                DAUER
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                {usernameIntelligenceModule.estimatedDurationLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <dt className="font-mono text-[8px] tracking-[.12em] text-white/30">
                ZIEL
              </dt>
              <dd className="mt-1 text-sm text-white/70">
                Ergebnis Center · Username Intelligence
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

      {phase === "confirm" && canStart ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            USERNAME INTELLIGENCE · BESTÄTIGUNG
          </p>
          <h2 className="mt-3 text-xl font-medium text-white/88">
            Username Intelligence Scan
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
            Diese Analyse sucht öffentliche Profile, Foren und Communities zu
            Ihren Benutzernamen. Es werden ausschließlich öffentlich indexierte
            Treffer ausgewertet.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] tracking-[.1em] text-white/40">
            <span>
              DAUER ·{" "}
              <span className="text-white/70">
                {usernameIntelligenceModule.estimatedDurationLabel}
              </span>
            </span>
            <span>
              NACH START ·{" "}
              <span className="text-white/70">
                SynCredits · Auftrag · Ergebnis Center
              </span>
            </span>
          </div>

          <label className="mt-5 block max-w-md space-y-1.5">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              SPEICHERDAUER DES ERGEBNISSES
            </span>
            <select
              value={retentionDays}
              onChange={(event) =>
                setRetentionDays(parseRetentionDays(Number(event.target.value)))
              }
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            >
              {REPORT_RETENTION_PRESETS.map((preset) => (
                <option key={preset.days} value={preset.days}>
                  {preset.label} — {preset.description}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-white/35">
              Der Report wird gespeichert und nach Ablauf nicht mehr angezeigt.
            </span>
          </label>

          <div className="mt-6">
            <ConsumeConfirm
              analysisKey="username_intelligence"
              confirmLabel="Analyse starten"
              onCompleted={() => onCreditsConfirmed()}
            />
          </div>
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
