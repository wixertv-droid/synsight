"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import InfoHeading from "@/components/ui/InfoHeading";

interface CredentialRow {
  provider: "google_custom_search" | "gemini";
  label: string;
  isActive: boolean;
  configured: boolean;
  maskedSecret: string | null;
  engineId: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

type ApiEnvelope<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export default function AdminApiCredentialsControl() {
  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [googleKey, setGoogleKey] = useState("");
  const [engineId, setEngineId] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/api-credentials");
      const body = (await response.json()) as ApiEnvelope<{
        credentials: CredentialRow[];
      }>;
      if (body.success) {
        setRows(body.data.credentials);
        const google = body.data.credentials.find(
          (row) => row.provider === "google_custom_search"
        );
        if (google?.engineId) setEngineId(google.engineId);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveGoogle(event: FormEvent) {
    event.preventDefault();
    setBusy("google_custom_search");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/api-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google_custom_search",
          secret: googleKey.trim() || undefined,
          engineId: engineId.trim(),
          isActive: true,
          label: "Google Custom Search",
        }),
      });
      const body = (await response.json()) as ApiEnvelope<{
        credential: CredentialRow;
      }>;
      if (!response.ok || !body.success) {
        setMessage(
          body.success ? "Speichern fehlgeschlagen." : body.error.message
        );
        return;
      }
      setGoogleKey("");
      setMessage(
        "Google Custom Search gespeichert. Die Google-Analyse nutzt jetzt echte Suchtreffer."
      );
      await load();
    } catch {
      setMessage("Verbindung zum Admin-API fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function saveGemini(event: FormEvent) {
    event.preventDefault();
    setBusy("gemini");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/api-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          secret: geminiKey.trim(),
          isActive: true,
          label: "Google Gemini",
        }),
      });
      const body = (await response.json()) as ApiEnvelope<{
        credential: CredentialRow;
      }>;
      if (!response.ok || !body.success) {
        setMessage(
          body.success ? "Speichern fehlgeschlagen." : body.error.message
        );
        return;
      }
      setGeminiKey("");
      setMessage(
        "Gemini API gespeichert. Die KI-Zusammenfassung nutzt nur verifizierte Treffer."
      );
      await load();
    } catch {
      setMessage("Verbindung zum Admin-API fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  const google = rows.find((row) => row.provider === "google_custom_search");
  const gemini = rows.find((row) => row.provider === "gemini");

  return (
    <section
      id="api-credentials"
      className="mt-6 hardware-panel rounded-[1.4rem] border border-white/[0.08] p-5 md:p-6"
      aria-labelledby="api-credentials-heading"
    >
      <InfoHeading
        id="api-credentials-heading"
        as="h2"
        className="text-xl font-medium text-white/80"
        label="API-Verwaltung"
        info="Hier hinterlegen Sie Google Custom Search und Gemini. Schlüssel werden AES-256-GCM verschlüsselt gespeichert. Die Google-Analyse liest zuerst diese Werte, sonst .env."
      />

      <p className="mt-3 max-w-3xl text-sm text-white/40">
        Für echte Google-Treffer brauchen Sie den{" "}
        <strong className="font-medium text-white/70">
          Custom Search API-Key
        </strong>{" "}
        und die{" "}
        <strong className="font-medium text-white/70">
          Search-Engine-ID (cx)
        </strong>{" "}
        aus dem Programmable Search Engine Snippet (
        <code className="text-cyber-cyan/70">cx=0728bba0e53574410</code>).
        Gemini ist optional für die KI-Zusammenfassung.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-white/35">APIs werden geladen…</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={saveGoogle}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/60">
                GOOGLE CUSTOM SEARCH
              </p>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[8px] ${
                  google?.configured
                    ? "border-emerald-300/30 text-emerald-100/75"
                    : "border-white/15 text-white/35"
                }`}
              >
                {google?.configured ? "KONFIGURIERT" : "LEER"}
              </span>
            </div>
            {google?.maskedSecret ? (
              <p className="mt-2 font-mono text-[10px] text-white/35">
                Key · {google.maskedSecret}
              </p>
            ) : null}
            {google?.engineId ? (
              <p className="mt-1 font-mono text-[10px] text-white/35">
                Engine (cx) · {google.engineId}
              </p>
            ) : null}

            <label className="mt-4 block">
              <span className="font-mono text-[8px] text-white/30">
                CUSTOM SEARCH API KEY
              </span>
              <input
                type="password"
                value={googleKey}
                onChange={(event) => setGoogleKey(event.target.value)}
                placeholder={
                  google?.configured ? "Neuen Key eingeben (optional)" : "AIza…"
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
              />
            </label>

            <label className="mt-3 block">
              <span className="font-mono text-[8px] text-white/30">
                SEARCH ENGINE ID (CX)
              </span>
              <input
                value={engineId}
                onChange={(event) => setEngineId(event.target.value)}
                placeholder="0728bba0e53574410"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
              />
              <span className="mt-1 block text-[11px] text-white/30">
                Aus dem CSE-Snippet:{" "}
                <code className="text-white/45">
                  cse.js?cx=0728bba0e53574410
                </code>
              </span>
            </label>

            <button
              type="submit"
              disabled={
                busy === "google_custom_search" ||
                (!googleKey.trim() && !google?.configured) ||
                !engineId.trim()
              }
              className="mt-4 rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2.5 text-sm font-medium text-cyber-cyan disabled:opacity-40"
            >
              {busy === "google_custom_search"
                ? "Speichern…"
                : "Google Search speichern"}
            </button>
          </form>

          <form
            onSubmit={saveGemini}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/60">
                GOOGLE GEMINI
              </p>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[8px] ${
                  gemini?.configured
                    ? "border-emerald-300/30 text-emerald-100/75"
                    : "border-white/15 text-white/35"
                }`}
              >
                {gemini?.configured ? "KONFIGURIERT" : "LEER"}
              </span>
            </div>
            {gemini?.maskedSecret ? (
              <p className="mt-2 font-mono text-[10px] text-white/35">
                Key · {gemini.maskedSecret}
              </p>
            ) : null}

            <label className="mt-4 block">
              <span className="font-mono text-[8px] text-white/30">
                GEMINI API KEY
              </span>
              <input
                type="password"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={
                  gemini?.configured
                    ? "Neuen Key eingeben"
                    : "AIza… (Gemini API Key)"
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
              />
            </label>

            <p className="mt-3 text-[11px] text-white/30">
              Gemini fasst nur tatsächlich gefundene Google-Treffer zusammen —
              keine erfundenen Daten.
            </p>

            <button
              type="submit"
              disabled={busy === "gemini" || geminiKey.trim().length < 8}
              className="mt-4 rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2.5 text-sm font-medium text-cyber-cyan disabled:opacity-40"
            >
              {busy === "gemini" ? "Speichern…" : "Gemini speichern"}
            </button>
          </form>
        </div>
      )}

      {message ? (
        <p className="mt-4 text-sm text-cyber-cyan/80" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
