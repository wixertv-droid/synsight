"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { AnalysisKey } from "@/lib/credits/pricing";

interface ConsumeConfirmProps {
  analysisKey: AnalysisKey;
  label: string;
  credits: number;
  onCompleted?: (balance: number) => void;
}

/**
 * Reusable confirmation UI for analysis spend.
 * Business rules stay in /api/credits/consume.
 */
export default function ConsumeConfirm({
  analysisKey,
  label,
  credits,
  onCompleted,
}: ConsumeConfirmProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

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
      <p className="text-sm text-white/70">
        Diese Analyse kostet{" "}
        <span className="font-semibold text-cyber-cyan">
          {credits} SynCredits
        </span>
        .
      </p>
      <p className="mt-1 text-xs text-white/35">{label}</p>
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
          <Button type="button" onClick={confirm} disabled={submitting}>
            {submitting ? "Wird abgebucht…" : "Analyse bestätigen"}
          </Button>
        </div>
      )}
    </div>
  );
}
