"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiCredentialSummary } from "@/lib/services/admin-platform-service";

type TestResult = {
  ok: boolean;
  message: string;
  detail?: string;
  latencyMs: number;
  hitCount?: number;
};

export default function AdminApiCredentialsView() {
  const [rows, setRows] = useState<ApiCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");
  const [testByProvider, setTestByProvider] = useState<
    Record<string, TestResult | undefined>
  >({});
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
              ? draft.engineId.trim() ||
                rows.find((item) => item.provider === provider)?.engineId ||
                undefined
              : undefined,
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

  async function testConnection(provider: string) {
    const draft = drafts[provider];
    const row = rows.find((item) => item.provider === provider);
    const canTest =
      Boolean(draft?.secret.trim()) ||
      Boolean(row?.configured) ||
      (provider === "google_custom_search" &&
        Boolean(draft?.engineId.trim() && draft?.secret.trim()));

    if (!canTest && provider !== "google_custom_search" && !row?.configured) {
      setMessageTone("err");
      setMessage("Bitte zuerst einen API-Schlüssel eintragen oder speichern.");
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
          engineId:
            provider === "google_custom_search"
              ? draft?.engineId.trim() || undefined
              : undefined,
        }),
      });
      const body = await response.json();
      if (!body.success) {
        setMessageTone("err");
        setMessage(body.error?.message ?? "Test fehlgeschlagen.");
        return;
      }

      const result = body.data.result as TestResult;
      setTestByProvider((current) => ({ ...current, [provider]: result }));
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

  if (loading) {
    return (
      <p className="text-sm text-white/40">API-Konfiguration wird geladen…</p>
    );
  }

  const prioritized = [...rows].sort((a, b) => {
    const order = ["google_custom_search", "gemini"];
    return order.indexOf(a.provider) - order.indexOf(b.provider);
  });

  const testable = new Set(["google_custom_search", "gemini"]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">
        API-Schlüssel werden AES-256-GCM verschlüsselt in{" "}
        <code className="text-cyber-cyan/70">api_credentials</code> gespeichert.
        Für Google brauchen Sie Key + Engine-ID (cx) und in der Google Cloud
        Console muss die{" "}
        <strong className="font-medium text-white/70">
          Custom Search JSON API
        </strong>{" "}
        für dasselbe Projekt aktiviert sein. Mit{" "}
        <strong className="font-medium text-white/70">Verbindung testen</strong>{" "}
        prüfen Sie den Live-Datenaustausch.
      </p>

      {message ? (
        <p
          className={`text-sm ${messageTone === "ok" ? "text-emerald-200/80" : "text-rose-200/80"}`}
          role="status"
        >
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
          const testResult = testByProvider[row.provider];
          const busy = busyProvider === row.provider;
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
                {row.configured ? "Konfiguriert" : "Noch nicht konfiguriert"}
              </p>
              {isGoogle && row.engineId ? (
                <p className="mt-1 font-mono text-[10px] text-white/35">
                  cx · {row.engineId}
                </p>
              ) : null}
              {isGoogle && row.configured && !row.engineId ? (
                <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.05] px-2 py-1.5 text-[11px] text-amber-50/75">
                  Engine-ID (cx) fehlt in der DB — bitte cx eintragen und
                  speichern, sonst schlägt der Test fehl.
                </p>
              ) : null}
              {row.configured && row.decryptOk === false ? (
                <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-300/[0.05] px-2 py-1.5 text-[11px] text-rose-100/75">
                  Schlüssel nicht entschlüsselbar. IMAGE_ENCRYPTION_KEY /
                  SESSION_SECRET prüfen und Key neu speichern.
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[8px] text-white/25">
                Status:{" "}
                {row.configured ? (row.isActive ? "Aktiv" : "Inaktiv") : "Leer"}
                {row.lastSuccessAt
                  ? ` · Letzter Erfolg: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.lastSuccessAt))}`
                  : ""}
                {row.lastErrorAt
                  ? ` · Letzter Fehler: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.lastErrorAt))}`
                  : ""}
              </p>
              {row.lastErrorMessage ? (
                <p className="mt-1 text-[10px] text-rose-100/55">
                  DB-Hinweis: {row.lastErrorMessage}
                </p>
              ) : null}
              {testResult ? (
                <p
                  className={`mt-2 rounded-lg border px-2 py-1.5 text-[11px] ${
                    testResult.ok
                      ? "border-emerald-300/25 bg-emerald-300/[0.05] text-emerald-100/75"
                      : "border-rose-300/25 bg-rose-300/[0.05] text-rose-100/75"
                  }`}
                >
                  {testResult.ok ? "TEST OK" : "TEST FEHLER"} ·{" "}
                  {testResult.message}
                  {testResult.detail ? ` — ${testResult.detail}` : ""}
                  {typeof testResult.hitCount === "number"
                    ? ` · ${testResult.hitCount} Treffer`
                    : ""}
                  {testResult.latencyMs ? ` · ${testResult.latencyMs} ms` : ""}
                </p>
              ) : null}
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
                {isGoogle ? (
                  <input
                    name={`engine-${row.provider}`}
                    autoComplete="off"
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={
                      busy ||
                      (!draft.secret.trim() && !row.configured) ||
                      (isGoogle &&
                        draft.engineId.trim().length < 6 &&
                        !(row.engineId && row.engineId.length >= 6))
                    }
                    className="rounded-lg border border-cyber-cyan/30 px-3 py-1.5 text-xs text-cyber-cyan disabled:opacity-40"
                  >
                    {busy ? "Bitte warten…" : "Schlüssel speichern"}
                  </button>
                  {testable.has(row.provider) ? (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        (!row.configured &&
                          !(
                            draft.secret.trim() &&
                            (!isGoogle || draft.engineId.trim().length >= 6)
                          ))
                      }
                      onClick={() => void testConnection(row.provider)}
                      className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs text-emerald-100/80 disabled:opacity-40"
                    >
                      {busy ? "Teste…" : "Verbindung testen"}
                    </button>
                  ) : null}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
