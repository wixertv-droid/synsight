"use client";

import { FormEvent, useState } from "react";

interface SupportTicketFormProps {
  initialName?: string;
  initialEmail?: string;
  source?: "public" | "dashboard";
  submitLabel?: string;
  onSuccess?: (ticketNumber: string) => void;
}

export default function SupportTicketForm({
  initialName = "",
  initialEmail = "",
  source = "public",
  submitLabel = "Support-Ticket senden",
  onSuccess,
}: SupportTicketFormProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          honeypot,
          source,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Ticket konnte nicht erstellt werden.");
        return;
      }
      const ticketNumber = body.data.ticket.ticketNumber as string;
      setSuccess(`Ticket ${ticketNumber} wurde erstellt.`);
      setSubject("");
      setMessage("");
      onSuccess?.(ticketNumber);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block font-mono text-[9px] tracking-[.14em] text-white/35">
            NAME
          </span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/85 outline-none focus:border-cyber-cyan/35"
          />
        </label>
        <label className="block">
          <span className="mb-2 block font-mono text-[9px] tracking-[.14em] text-white/35">
            E-MAIL
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/85 outline-none focus:border-cyber-cyan/35"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block font-mono text-[9px] tracking-[.14em] text-white/35">
          BETREFF
        </span>
        <input
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/85 outline-none focus:border-cyber-cyan/35"
        />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-[9px] tracking-[.14em] text-white/35">
          NACHRICHT
        </span>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/85 outline-none focus:border-cyber-cyan/35"
        />
      </label>
      {error ? <p className="text-sm text-rose-300/80">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-300/80">{success}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl border border-cyber-cyan/35 bg-cyber-cyan/[0.1] px-5 py-3 font-mono text-[10px] tracking-[.14em] text-cyber-cyan disabled:opacity-50"
      >
        {loading ? "WIRD GESENDET…" : submitLabel.toUpperCase()}
      </button>
    </form>
  );
}
