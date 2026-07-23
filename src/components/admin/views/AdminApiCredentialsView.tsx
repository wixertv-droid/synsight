"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiCredentialSummary } from "@/lib/services/admin-platform-service";

export default function AdminApiCredentialsView() {
  const [rows, setRows] = useState<ApiCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { label: string; secret: string; engineId: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/api-credentials");
      const body = await response.json();
      if (body.success) {
        setRows(body.data.credentials);
        const next: Record<
          string,
          { label: string; secret: string; engineId: string }
        > = {};
        for (const row of body.data.credentials as ApiCredentialSummary[]) {
          next[row.provider] = {
            label: row.label,
            secret: "",
            engineId: row.engineId ?? "",
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
          engineId:
            provider === "google_custom_search"
              ? draft.engineId.trim()
              : undefined,
          isActive: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setMessage(body.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setMessage(
        provider === "google_custom_search"
          ? "Google Custom Search gespeichert — die Analyse nutzt echte Treffer."
          : "API-Schlüssel gespeichert."
      );
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

  if (loading) {
    return (
      <p className="text-sm text-white/40">API-Konfiguration wird geladen…</p>
    );
  }

  const prioritized = [...rows].sort((a, b) => {
    const order = ["google_custom_search", "gemini"];
    return order.indexOf(a.provider) - order.indexOf(b.provider);
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">
        API-Schlüssel werden AES-256-GCM verschlüsselt in{" "}
        <code className="text-cyber-cyan/70">api_credentials</code> gespeichert.
        Für die Google-Analyse brauchen Sie den{" "}
        <strong className="font-medium text-white/70">Custom Search Key</strong>{" "}
        und die{" "}
        <strong className="font-medium text-white/70">Engine-ID (cx)</strong> —
        z. B. <code className="text-cyber-cyan/70">0728bba0e53574410</code> aus
        dem CSE-Snippet.
      </p>

      {message ? (
        <p className="text-sm text-cyber-cyan/80" role="status">
          {message}
        </p>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {prioritized.map((row) => {
          const draft = drafts[row.provider] ?? {
            label: row.label,
            secret: "",
            engineId: row.engineId ?? "",
          };
          const isGoogle = row.provider === "google_custom_search";
          return (
            <li
              key={row.provider}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[9px] tracking-[.12em] text-cyber-cyan/55">
                  {row.provider.toUpperCase()}
                </p>
                {row.configured ? (
                  <button
                    type="button"
                    disabled={busyProvider === row.provider}
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
                {row.configured ? "Konfiguriert" : "Noch nicht konfiguriert"}
              </p>
              {isGoogle && row.engineId ? (
                <p className="mt-1 font-mono text-[10px] text-white/35">
                  cx · {row.engineId}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[8px] text-white/25">
                Status:{" "}
                {row.configured ? (row.isActive ? "Aktiv" : "Inaktiv") : "Leer"}
                {row.lastSuccessAt
                  ? ` · Letzter Erfolg: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.lastSuccessAt))}`
                  : ""}
              </p>
              <div className="mt-3 space-y-2">
                <input
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
                  type="password"
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
                {isGoogle ? (
                  <input
                    value={draft.engineId}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.provider]: {
                          ...draft,
                          engineId: event.target.value,
                        },
                      }))
                    }
                    placeholder="Search Engine ID (cx) — z. B. 0728bba0e53574410"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyber-cyan/35"
                  />
                ) : null}
                <button
                  type="button"
                  disabled={
                    busyProvider === row.provider ||
                    (!draft.secret.trim() && !row.configured) ||
                    (isGoogle && draft.engineId.trim().length < 6)
                  }
                  onClick={() => void save(row.provider)}
                  className="rounded-lg border border-cyber-cyan/30 px-3 py-1.5 text-xs text-cyber-cyan disabled:opacity-40"
                >
                  {busyProvider === row.provider
                    ? "Speichern…"
                    : "Schlüssel speichern"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
