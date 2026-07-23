"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SearchProviderPublicSettings,
  SerpApiAccountSnapshot,
} from "@/lib/services/search-provider-service";
import type { SearchProviderId } from "@/lib/search/types";

interface ProviderOption {
  id: SearchProviderId;
  label: string;
  available: boolean;
}

type TestCard =
  | {
      ok: true;
      message: string;
      detail?: string;
      latencyMs: number;
      apiVersion?: string | null;
      googleSearchOnline?: boolean;
    }
  | {
      ok: false;
      message: string;
      detail?: string;
      latencyMs: number;
    };

export default function AdminSearchProviderPanel() {
  const [settings, setSettings] = useState<SearchProviderPublicSettings | null>(
    null
  );
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState<SearchProviderId>("serpapi");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "account" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");
  const [testCard, setTestCard] = useState<TestCard | null>(null);
  const [account, setAccount] = useState<SerpApiAccountSnapshot | null>(null);

  const loadAccount = useCallback(async (force = false) => {
    const response = await fetch(
      `/api/admin/search-provider/account${force ? "?refresh=1" : ""}`
    );
    const body = await response.json().catch(() => null);
    if (response.ok && body?.success) {
      setAccount(body.data.account);
    }
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/search-provider");
    const body = await response.json();
    if (body.success) {
      setSettings(body.data.settings);
      setProviders(body.data.providers ?? []);
      setProvider(body.data.settings.provider ?? "serpapi");
    }
    await loadAccount(false);
  }, [loadAccount]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveKey() {
    if (!apiKey.trim()) {
      setMessageTone("err");
      setMessage("Bitte einen SerpAPI-Key eingeben.");
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/search-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          enabled: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setMessageTone("err");
        setMessage(body.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setSettings(body.data.settings);
      setApiKey("");
      setMessageTone("ok");
      setMessage("API-Key gespeichert (verschlüsselt).");
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    setBusy("test");
    setMessage(null);
    setTestCard(null);
    try {
      const response = await fetch("/api/admin/search-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!body.success) {
        setMessageTone("err");
        setMessage(body.error?.message ?? "Test fehlgeschlagen.");
        return;
      }
      const result = body.data.result;
      setSettings(result.settings);
      setTestCard({
        ok: result.ok,
        message: result.message,
        detail: result.detail,
        latencyMs: result.latencyMs,
        apiVersion: result.apiVersion,
        googleSearchOnline: result.googleSearchOnline,
      });
      setMessageTone(result.ok ? "ok" : "err");
      setMessage(result.message);
      if (result.ok) await loadAccount(true);
    } catch {
      setMessageTone("err");
      setMessage("Verbindungstest nicht möglich.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshAccount() {
    setBusy("account");
    try {
      await loadAccount(true);
      setMessageTone("ok");
      setMessage("SerpAPI-Konto aktualisiert (kostenloser Account-Endpoint).");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-[1.3rem] border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.05] to-transparent p-5 md:p-6">
      <div>
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          SUCHANBIETER
        </p>
        <h2 className="mt-2 text-xl font-medium text-white/90">
          Suchanbieter (Search Provider)
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">
          SynSight verwendet Suchanbieter, um öffentliche Informationen aus
          Suchmaschinen zu analysieren. Aktuell wird SerpAPI verwendet, welches
          hochwertige Google-Suchergebnisse liefert.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveKey();
          }}
        >
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/35">
              PROVIDER
            </span>
            <select
              name="search-provider"
              autoComplete="off"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as SearchProviderId)
              }
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            >
              {(providers.length
                ? providers
                : [
                    {
                      id: "serpapi" as const,
                      label: "SerpAPI (Standard)",
                      available: true,
                    },
                  ]
              ).map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.available}
                >
                  {option.label}
                  {!option.available ? " — bald" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/35">
              SERPAPI KEY
            </span>
            <input
              name="serpapi-api-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                settings?.configured
                  ? "Neuer Schlüssel (optional für Update)"
                  : "SerpAPI-Key eintragen"
              }
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>

          {settings?.configured ? (
            <p className="font-mono text-[10px] text-white/35">
              Gespeichert: {settings.maskedKey} · Status: {settings.status}
            </p>
          ) : (
            <p className="text-[11px] text-white/35">
              Noch kein Key hinterlegt. Key wird AES-256-GCM verschlüsselt
              gespeichert und nie im Klartext angezeigt.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy !== null || apiKey.trim().length < 8}
              className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-3 py-2 text-xs font-medium text-cyber-cyan disabled:opacity-40"
            >
              {busy === "save" ? "Speichern…" : "API Key speichern"}
            </button>
            <button
              type="button"
              disabled={
                busy !== null ||
                (apiKey.trim().length < 8 && !settings?.configured)
              }
              onClick={() => void testConnection()}
              className="rounded-lg border border-emerald-300/30 px-3 py-2 text-xs text-emerald-100/85 disabled:opacity-40"
            >
              {busy === "test" ? "Teste…" : "API Verbindung testen"}
            </button>
          </div>

          {message ? (
            <p
              className={`text-sm ${messageTone === "ok" ? "text-emerald-200/80" : "text-rose-200/80"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </form>

        <div className="space-y-3">
          {testCard?.ok ? (
            <article className="rounded-xl border border-emerald-300/30 bg-emerald-300/[0.06] p-4">
              <p className="font-mono text-[9px] tracking-[.14em] text-emerald-200/80">
                ✓ VERBINDUNG ERFOLGREICH
              </p>
              <dl className="mt-3 space-y-2 text-sm text-white/70">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Provider</dt>
                  <dd>SerpAPI</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Google Search</dt>
                  <dd>
                    {testCard.googleSearchOnline ? "Online" : "Unbekannt"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Antwortzeit</dt>
                  <dd>{testCard.latencyMs} ms</dd>
                </div>
                {testCard.apiVersion ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/40">API Version</dt>
                    <dd className="font-mono text-[11px]">
                      {testCard.apiVersion}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {testCard.detail ? (
                <p className="mt-3 text-[11px] text-emerald-50/60">
                  {testCard.detail}
                </p>
              ) : null}
            </article>
          ) : null}

          {testCard && !testCard.ok ? (
            <article className="rounded-xl border border-rose-300/30 bg-rose-300/[0.06] p-4">
              <p className="font-mono text-[9px] tracking-[.14em] text-rose-200/80">
                VERBINDUNG FEHLGESCHLAGEN
              </p>
              <p className="mt-2 text-sm text-white/75">{testCard.message}</p>
              {testCard.detail ? (
                <p className="mt-2 text-[11px] leading-relaxed text-rose-50/60">
                  {testCard.detail}
                </p>
              ) : null}
              <p className="mt-3 font-mono text-[10px] text-white/30">
                Antwortzeit · {testCard.latencyMs} ms
              </p>
            </article>
          ) : null}

          {settings ? (
            <article className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                LIVE METRIKEN
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] text-white/35">Heute</dt>
                  <dd className="text-white/80">{settings.dailyRequests}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">Gesamt</dt>
                  <dd className="text-white/80">{settings.totalRequests}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">Fehlerquote</dt>
                  <dd className="text-white/80">
                    {settings.errorRatePercent} %
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">Ø Antwort</dt>
                  <dd className="text-white/80">
                    {settings.averageResponseTimeMs} ms
                  </dd>
                </div>
              </dl>
            </article>
          ) : null}

          <article className="rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
                  SERPAPI KONTO · ACCOUNT API
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Kostenloser Endpoint — verbraucht keine Such-Credits. Cache
                  ca. 10 Min.
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshAccount()}
                className="rounded-lg border border-cyber-cyan/30 px-2.5 py-1.5 font-mono text-[9px] text-cyber-cyan disabled:opacity-40"
              >
                {busy === "account" ? "Lädt…" : "Aktualisieren"}
              </button>
            </div>
            {account ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] text-white/35">Plan</dt>
                  <dd className="text-white/80">{account.planName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">
                    Verbleibende Suchen
                  </dt>
                  <dd className="text-emerald-100/80">
                    {account.totalSearchesLeft.toLocaleString("de-DE")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">
                    Verbrauch diesen Monat
                  </dt>
                  <dd className="text-white/80">
                    {account.thisMonthUsage.toLocaleString("de-DE")} /{" "}
                    {account.searchesPerMonth.toLocaleString("de-DE")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-white/35">
                    Geschätzte Ausgaben
                  </dt>
                  <dd className="text-rose-100/80">
                    {account.estimatedMonthSpendUsd.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] text-white/35">Rate-Limit / h</dt>
                  <dd className="font-mono text-[11px] text-white/55">
                    {account.accountRateLimitPerHour.toLocaleString("de-DE")} ·
                    Quelle {account.source}
                    {account.stale ? " · veraltet" : ""} ·{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(account.fetchedAt))}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-white/40">
                Noch keine Kontodaten. Key speichern und „Aktualisieren“ oder
                Verbindung testen.
              </p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
