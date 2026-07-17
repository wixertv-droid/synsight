"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { getAnalysisGuidance, guidance } from "@/lib/content/guidance";

interface ConsumeConfirmProps {
  analysisKey: string;
  onCompleted?: (balance: number) => void;
}

/**
 * Reusable confirmation UI for analysis spend.
 * Business rules stay in /api/credits/consume.
 */
export default function ConsumeConfirm({
  analysisKey,
  onCompleted,
}: ConsumeConfirmProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [quote, setQuote] = useState<{
    label: string;
    credits: number;
    currentBalance: number;
    remainingBalance: number;
    sufficient: boolean;
  } | null>(null);

  const analysisHelp = getAnalysisGuidance(analysisKey);

  useEffect(() => {
    let active = true;
    fetch(`/api/credits/quote?analysisKey=${encodeURIComponent(analysisKey)}`)
      .then((response) => response.json())
      .then((body) => {
        if (active && body.success) setQuote(body.data);
        if (active && !body.success) setError(body.error.message);
      })
      .catch(() => {
        if (active) setError("Analysepreis konnte nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, [analysisKey]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/credits/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisKey,
          confirm: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(
          !result.success ? result.error.message : "Abbuchung fehlgeschlagen."
        );
        setSubmitting(false);
        return;
      }
      setBalance(result.data.balance);
      onCompleted?.(result.data.balance);
    } catch {
      setError("Verbindung zum Server nicht möglich.");
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 space-y-2 text-xs leading-relaxed text-white/40">
        <p className="flex items-start gap-2">
          <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/45">
            WAS
          </span>
          {analysisHelp.what}
        </p>
        <p className="flex items-start gap-2">
          <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/45">
            WARUM
          </span>
          {analysisHelp.why}
        </p>
        <p className="flex items-start gap-2">
          <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/45">
            ERGEBNIS
          </span>
          {analysisHelp.result}
        </p>
      </div>
      {quote ? (
        <>
          <p className="flex items-center gap-2 text-sm text-white/70">
            Diese Analyse kostet{" "}
            <span className="font-semibold text-cyber-cyan">
              {quote.credits} SynCredits
            </span>
            .
            <InfoTooltip label="SynCredits">
              {guidance.landing.syncredits}
            </InfoTooltip>
          </p>
          <p className="mt-1 text-xs text-white/35">{quote.label}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-white/25">Aktuelles Guthaben</dt>
              <dd className="mt-1 text-white/65">
                {quote.currentBalance.toLocaleString("de-DE")}
              </dd>
            </div>
            <div>
              <dt className="text-white/25">Restguthaben danach</dt>
              <dd className="mt-1 text-cyber-cyan/75">
                {quote.remainingBalance.toLocaleString("de-DE")}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-sm text-white/35">Analysepreis wird geladen…</p>
      )}
      {error ? (
        <p className="mt-3 text-xs text-red-300/80" role="alert">
          {error}
        </p>
      ) : null}
      {balance !== null ? (
        <p className="mt-3 text-xs text-cyber-cyan/80">
          Neues Guthaben: {balance.toLocaleString("de-DE")} SynCredits
        </p>
      ) : (
        <div className="mt-4">
          <Button
            type="button"
            onClick={confirm}
            disabled={submitting || !quote?.sufficient}
          >
            {submitting ? "Wird abgebucht…" : "Analyse bestätigen"}
          </Button>
          {quote && !quote.sufficient ? (
            <p className="mt-2 text-xs text-amber-200/65">
              Nicht genügend SynCredits. Laden Sie Ihr Guthaben auf, um die
              Analyse zu starten.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
