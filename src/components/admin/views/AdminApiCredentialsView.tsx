"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSearchProviderPanel from "@/components/admin/views/AdminSearchProviderPanel";
import type { ApiCredentialSummary } from "@/lib/services/admin-platform-service";

export default function AdminApiCredentialsView() {
  const [rows, setRows] = useState<ApiCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");
  const [drafts, setDrafts] = useState<
    Record<string, { label: string; secret: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/api-credentials");
      const body = await response.json();
      if (body.success) {
        setRows(body.data.credentials);
        const next: Record<string, { label: string; secret: string }> = {};
        for (const row of body.data.credentials as ApiCredentialSummary[]) {
          next[row.provider] = {
            label: row.label,
            secret: "",
          };
        }
        setDrafts(next);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(provider: string) {
    const draft = drafts[provider];
    if (!draft) return;
    if (
      !draft.secret.trim() &&
      !rows.find((r) => r.provider === provider)?.configured
    ) {
      return;
    }
    setBusyProvider(provider);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/api-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          provider,
          label: draft.label.trim() || provider,
          secret: draft.secret.trim() || undefined,
          isActive: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setMessageTone("err");
        setMessage(body.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setMessageTone("ok");
      setMessage("API-Schlüssel gespeichert.");
      await load();
    } finally {
      setBusyProvider(null);
    }
  }

  async function toggle(row: ApiCredentialSummary) {
    if (!row.configured) return;
    setBusyProvider(row.provider);
    try {
      const response = await fetch("/api/admin/api-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          provider: row.provider,
          isActive: !row.isActive,
        }),
      });
      const body = await response.json();
      if (body.success) await load();
    } finally {
      setBusyProvider(null);
    }
  }

  async function testGemini(provider: string) {
    const draft = drafts[provider];
    const row = rows.find((item) => item.provider === provider);
    if (!draft?.secret.trim() && !row?.configured) {
      setMessageTone("err");
      setMessage("Bitte zuerst einen API-Schlüssel speichern.");
      return;
    }
    setBusyProvider(provider);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/api-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider,
          secret: draft?.secret.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!body.success) {
        setMessageTone("err");
        setMessage(body.error?.message ?? "Test fehlgeschlagen.");
        return;
      }
      const result = body.data.result;
      setMessageTone(result.ok ? "ok" : "err");
      setMessage(
        result.detail ? `${result.message} — ${result.detail}` : result.message
      );
      if (Array.isArray(body.data.credentials)) {
        setRows(body.data.credentials);
      }
    } catch {
      setMessageTone("err");
      setMessage("Verbindungstest nicht möglich.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="space-y-8">
      <AdminSearchProviderPanel />

      <section className="space-y-4">
        <div>
          <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
            WEITERE INTEGRATIONEN
          </p>
          <h2 className="mt-2 text-lg font-medium text-white/85">
            KI & OSINT-Dienste
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Optionale API-Schlüssel für Zusammenfassungen und spätere Module.
            Suchanfragen laufen über den Suchanbieter oben (SerpAPI).
          </p>
        </div>

        {message ? (
          <p
            className={`text-sm ${messageTone === "ok" ? "text-emerald-200/80" : "text-rose-200/80"}`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-white/40">
            API-Konfiguration wird geladen…
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => {
              const draft = drafts[row.provider] ?? {
                label: row.label,
                secret: "",
              };
              const busy = busyProvider === row.provider;
              return (
                <li
                  key={row.provider}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-[9px] tracking-[.12em] text-cyber-cyan/55">
                      {row.provider === "haveibeenpwned"
                        ? "HAVE I BEEN PWNED (HIBP)"
                        : row.provider.toUpperCase()}
                    </p>
                    {row.configured ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggle(row)}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          row.isActive
                            ? "border-emerald-300/30 text-emerald-100/75"
                            : "border-white/15 text-white/40"
                        }`}
                      >
                        {row.isActive ? "Aktiv" : "Inaktiv"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-white/55">
                    {row.configured
                      ? "Konfiguriert"
                      : "Noch nicht konfiguriert"}
                  </p>
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void save(row.provider);
                    }}
                  >
                    <input
                      name={`label-${row.provider}`}
                      autoComplete="off"
                      value={draft.label}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.provider]: {
                            ...draft,
                            label: event.target.value,
                          },
                        }))
                      }
                      placeholder="Bezeichnung"
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyber-cyan/35"
                    />
                    <input
                      name={`secret-${row.provider}`}
                      type="password"
                      autoComplete="new-password"
                      value={draft.secret}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.provider]: {
                            ...draft,
                            secret: event.target.value,
                          },
                        }))
                      }
                      placeholder={
                        row.configured
                          ? "Neuer Schlüssel (optional)"
                          : "API-Schlüssel"
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyber-cyan/35"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={
                          busy || (!draft.secret.trim() && !row.configured)
                        }
                        className="rounded-lg border border-cyber-cyan/30 px-3 py-1.5 text-xs text-cyber-cyan disabled:opacity-40"
                      >
                        {busy ? "Bitte warten…" : "Schlüssel speichern"}
                      </button>
                      {row.provider === "gemini" ||
                      row.provider === "haveibeenpwned" ? (
                        <button
                          type="button"
                          disabled={
                            busy || (!row.configured && !draft.secret.trim())
                          }
                          onClick={() => void testGemini(row.provider)}
                          className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs text-emerald-100/80 disabled:opacity-40"
                        >
                          {busy ? "Teste…" : "API TESTEN"}
                        </button>
                      ) : null}
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
