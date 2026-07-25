"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";

/**
 * Existing-customer promo code redemption (M-04).
 */
export default function PromoRedeemForm() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/promotions/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode: code }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ?? "Promotioncode konnte nicht eingelöst werden."
        );
        setSubmitting(false);
        return;
      }
      setMessage(
        `${body.data.credits.toLocaleString("de-DE")} SynCredits gutgeschrieben (${body.data.promotionName}).`
      );
      setCode("");
    } catch {
      setError("Verbindung zum Server nicht möglich.");
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 space-y-2 border-t border-white/[0.06] pt-4"
    >
      <p className="font-mono text-[8px] tracking-[.12em] text-white/28">
        PROMOTIONCODE
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Code eingeben"
          maxLength={64}
          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          aria-label="Promotioncode"
        />
        <Button type="submit" disabled={submitting || code.trim().length < 3}>
          {submitting ? "…" : "Einlösen"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-300/80" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-cyber-cyan/80" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
