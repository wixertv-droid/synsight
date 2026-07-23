"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ApiBillingMode,
  ApiCostSettingPublic,
  ApiUsageEventPublic,
} from "@/lib/services/finance-service";

type SettingDraft = {
  label: string;
  cost: string;
  billingMode: ApiBillingMode;
  inputTokenCost: string;
  outputTokenCost: string;
  notes: string;
};

function draftFromSetting(row: ApiCostSettingPublic): SettingDraft {
  return {
    label: row.label,
    cost: String(row.costPerRequestEur),
    billingMode: row.billingMode ?? "per_request",
    inputTokenCost: String(row.costPer1mInputTokensEur ?? 0),
    outputTokenCost: String(row.costPer1mOutputTokensEur ?? 0),
    notes: row.notes ?? "",
  };
}

function parseMoney(value: string): number {
  return Number.parseFloat(value.replace(",", ".")) || 0;
}

export default function AdminFinanceApiCostsView() {
  const [settings, setSettings] = useState<ApiCostSettingPublic[]>([]);
  const [events, setEvents] = useState<ApiUsageEventPublic[]>([]);
  const [selected, setSelected] = useState<ApiUsageEventPublic | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SettingDraft>>({});
  const [newProvider, setNewProvider] = useState({
    providerCode: "",
    label: "",
    cost: "0.01",
    billingMode: "per_request" as ApiBillingMode,
    inputTokenCost: "1.38",
    outputTokenCost: "6.90",
    notes: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err">("ok");
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/finance/api-costs");
    const body = await response.json();
    if (!body.success) return;
    setSettings(body.data.settings);
    setEvents(body.data.events);
    const next: Record<string, SettingDraft> = {};
    for (const row of body.data.settings as ApiCostSettingPublic[]) {
      next[row.providerCode] = draftFromSetting(row);
    }
    setDrafts(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSetting(providerCode: string) {
    const draft = drafts[providerCode];
    if (!draft) return;
    setBusyCode(providerCode);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/api-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerCode,
          label: draft.label,
          costPerRequestEur: parseMoney(draft.cost),
          billingMode: draft.billingMode,
          costPer1mInputTokensEur: parseMoney(draft.inputTokenCost),
          costPer1mOutputTokensEur: parseMoney(draft.outputTokenCost),
          notes: draft.notes || null,
          isActive: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setTone("err");
        setMessage(body.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setTone("ok");
      setMessage(
        draft.billingMode === "per_token"
          ? "Token-Preise gespeichert."
          : "Preis pro Abfrage gespeichert."
      );
      setSettings(body.data.settings);
      const next: Record<string, SettingDraft> = {};
      for (const row of body.data.settings as ApiCostSettingPublic[]) {
        next[row.providerCode] = draftFromSetting(row);
      }
      setDrafts(next);
    } finally {
      setBusyCode(null);
    }
  }

  async function openEvent(eventId: number) {
    const response = await fetch(
      `/api/admin/finance/api-costs?eventId=${eventId}`
    );
    const body = await response.json();
    if (body.success) setSelected(body.data.event);
  }

  async function createSetting() {
    if (!newProvider.providerCode.trim() || !newProvider.label.trim()) {
      setTone("err");
      setMessage("Provider-Code und Label sind erforderlich.");
      return;
    }
    setBusyCode("__new__");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/api-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerCode: newProvider.providerCode,
          label: newProvider.label,
          costPerRequestEur: parseMoney(newProvider.cost),
          billingMode: newProvider.billingMode,
          costPer1mInputTokensEur: parseMoney(newProvider.inputTokenCost),
          costPer1mOutputTokensEur: parseMoney(newProvider.outputTokenCost),
          notes: newProvider.notes || null,
          isActive: true,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setTone("err");
        setMessage(body.error?.message ?? "Anlegen fehlgeschlagen.");
        return;
      }
      setTone("ok");
      setMessage("API-Anbieter / Preis angelegt.");
      setNewProvider({
        providerCode: "",
        label: "",
        cost: "0.01",
        billingMode: "per_request",
        inputTokenCost: "1.38",
        outputTokenCost: "6.90",
        notes: "",
      });
      setSettings(body.data.settings);
      const next: Record<string, SettingDraft> = {};
      for (const row of body.data.settings as ApiCostSettingPublic[]) {
        next[row.providerCode] = draftFromSetting(row);
      }
      setDrafts(next);
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.3rem] border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.05] to-transparent p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          API-AUSGABEN · PREISE
        </p>
        <p className="mt-2 max-w-3xl text-sm text-white/45">
          SerpAPI: Preis pro Request. Gemini (3.6 Flash Standard):{" "}
          <span className="text-white/60">
            (prompt/1M)×$1,50 + (candidates/1M)×$7,50
          </span>
          , im Dashboard als EUR (×0,92 → 1,38 / 6,90 € pro 1M). Preise hier
          anpassbar.
        </p>
        {message ? (
          <p
            className={`mt-3 text-sm ${tone === "ok" ? "text-emerald-200/80" : "text-rose-200/80"}`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 md:grid-cols-3 lg:grid-cols-6">
          <input
            value={newProvider.providerCode}
            onChange={(event) =>
              setNewProvider((current) => ({
                ...current,
                providerCode: event.target.value,
              }))
            }
            placeholder="provider_code"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          />
          <input
            value={newProvider.label}
            onChange={(event) =>
              setNewProvider((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            placeholder="Anzeigename"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          />
          <select
            value={newProvider.billingMode}
            onChange={(event) =>
              setNewProvider((current) => ({
                ...current,
                billingMode: event.target.value as ApiBillingMode,
              }))
            }
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          >
            <option value="per_request">pro Request</option>
            <option value="per_token">pro Token</option>
          </select>
          <input
            value={
              newProvider.billingMode === "per_token"
                ? newProvider.inputTokenCost
                : newProvider.cost
            }
            onChange={(event) =>
              setNewProvider((current) =>
                current.billingMode === "per_token"
                  ? { ...current, inputTokenCost: event.target.value }
                  : { ...current, cost: event.target.value }
              )
            }
            placeholder={
              newProvider.billingMode === "per_token"
                ? "EUR / 1M Input"
                : "EUR / Request"
            }
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          />
          {newProvider.billingMode === "per_token" ? (
            <input
              value={newProvider.outputTokenCost}
              onChange={(event) =>
                setNewProvider((current) => ({
                  ...current,
                  outputTokenCost: event.target.value,
                }))
              }
              placeholder="EUR / 1M Output"
              className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          ) : (
            <div />
          )}
          <button
            type="button"
            disabled={busyCode === "__new__"}
            onClick={() => void createSetting()}
            className="rounded-lg border border-cyber-cyan/30 px-3 py-2 text-sm text-cyber-cyan disabled:opacity-40"
          >
            {busyCode === "__new__" ? "Anlegen…" : "Anbieter anlegen"}
          </button>
        </div>

        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {settings.map((row) => {
            const draft = drafts[row.providerCode] ?? draftFromSetting(row);
            const isToken = draft.billingMode === "per_token";
            return (
              <li
                key={row.providerCode}
                className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
              >
                <p className="font-mono text-[9px] tracking-[.12em] text-cyber-cyan/55">
                  {row.providerCode.toUpperCase()} ·{" "}
                  {isToken ? "TOKEN" : "REQUEST"}
                </p>
                <div className="mt-3 space-y-2">
                  <input
                    value={draft.label}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.providerCode]: {
                          ...draft,
                          label: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                  />
                  <label className="block space-y-1">
                    <span className="font-mono text-[8px] text-white/35">
                      ABRECHNUNG
                    </span>
                    <select
                      value={draft.billingMode}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.providerCode]: {
                            ...draft,
                            billingMode: event.target.value as ApiBillingMode,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                    >
                      <option value="per_request">pro Request</option>
                      <option value="per_token">
                        pro Token (usageMetadata)
                      </option>
                    </select>
                  </label>
                  {isToken ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="font-mono text-[8px] text-white/35">
                          EUR / 1M INPUT-TOKENS
                        </span>
                        <input
                          value={draft.inputTokenCost}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.providerCode]: {
                                ...draft,
                                inputTokenCost: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="font-mono text-[8px] text-white/35">
                          EUR / 1M OUTPUT-TOKENS
                        </span>
                        <input
                          value={draft.outputTokenCost}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.providerCode]: {
                                ...draft,
                                outputTokenCost: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block space-y-1">
                      <span className="font-mono text-[8px] text-white/35">
                        EUR PRO REQUEST
                      </span>
                      <input
                        value={draft.cost}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.providerCode]: {
                              ...draft,
                              cost: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                      />
                    </label>
                  )}
                  <input
                    value={draft.notes}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.providerCode]: {
                          ...draft,
                          notes: event.target.value,
                        },
                      }))
                    }
                    placeholder="Notiz"
                    className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-xs text-white/70 outline-none focus:border-cyber-cyan/35"
                  />
                  <button
                    type="button"
                    disabled={busyCode === row.providerCode}
                    onClick={() => void saveSetting(row.providerCode)}
                    className="rounded-lg border border-cyber-cyan/30 px-3 py-1.5 text-xs text-cyber-cyan disabled:opacity-40"
                  >
                    {busyCode === row.providerCode
                      ? "Speichern…"
                      : "Preis speichern"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.015] p-4">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            LETZTE API-ANFRAGEN
          </p>
          <ul className="mt-3 max-h-[520px] space-y-2 overflow-auto">
            {events.length === 0 ? (
              <li className="text-sm text-white/40">
                Noch keine API-Events. Nach einer Google-Analyse erscheinen
                SerpAPI- und Gemini-Kosten hier.
              </li>
            ) : (
              events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => void openEvent(event.id)}
                    className="w-full rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 text-left transition hover:border-cyber-cyan/25"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] text-cyber-cyan/60">
                        {event.providerCode.toUpperCase()} · {event.eventType}
                      </span>
                      <span className="font-mono text-[11px] text-rose-100/75">
                        {event.totalCostEur.toFixed(4)} €
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-white/55">
                      {event.detail || event.referenceKey || "—"}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-white/30">
                      {event.requestCount} Request(s) ·{" "}
                      {new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(event.createdAt))}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <aside className="intel-cyber-hud relative overflow-hidden rounded-[1.2rem] border border-cyber-cyan/20 bg-[#050b14] p-4">
          <div className="intel-cyber-scanlines" aria-hidden="true" />
          <div className="relative z-[1]">
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
              DETAIL · API AUSGABE
            </p>
            {!selected ? (
              <p className="mt-4 text-sm text-white/40">
                Wählen Sie links eine Anfrage, um Kosten und Meta-Daten zu
                sehen.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <p>
                  <span className="text-white/35">Provider: </span>
                  {selected.providerCode}
                </p>
                <p>
                  <span className="text-white/35">Typ: </span>
                  {selected.eventType}
                </p>
                <p>
                  <span className="text-white/35">Requests: </span>
                  {selected.requestCount}
                </p>
                <p>
                  <span className="text-white/35">Stückpreis: </span>
                  {selected.unitCostEur.toFixed(6)} €
                </p>
                <p className="text-lg text-rose-100/85">
                  Gesamt: {selected.totalCostEur.toFixed(4)} €
                </p>
                <p>
                  <span className="text-white/35">Status: </span>
                  {selected.success ? "Erfolg" : "Fehler"}
                </p>
                <p>
                  <span className="text-white/35">Detail: </span>
                  {selected.detail || "—"}
                </p>
                <p className="break-all font-mono text-[10px] text-white/35">
                  Ref · {selected.referenceKey || "—"}
                </p>
                {(() => {
                  const meta =
                    selected.metaJson &&
                    typeof selected.metaJson === "object" &&
                    !Array.isArray(selected.metaJson)
                      ? (selected.metaJson as Record<string, unknown>)
                      : null;
                  const usage =
                    meta?.usageMetadata &&
                    typeof meta.usageMetadata === "object" &&
                    !Array.isArray(meta.usageMetadata)
                      ? (meta.usageMetadata as Record<string, unknown>)
                      : null;
                  const prices =
                    meta?.tokenPricesEurPer1m &&
                    typeof meta.tokenPricesEurPer1m === "object" &&
                    !Array.isArray(meta.tokenPricesEurPer1m)
                      ? (meta.tokenPricesEurPer1m as Record<string, unknown>)
                      : null;
                  if (!usage) return null;
                  return (
                    <div className="rounded-lg border border-cyber-cyan/20 bg-black/30 p-3">
                      <p className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                        USAGE METADATA · TOKENS
                      </p>
                      <ul className="mt-2 space-y-1 font-mono text-[11px] text-white/60">
                        <li>
                          promptTokenCount:{" "}
                          {Number(usage.promptTokenCount) || 0}
                        </li>
                        <li>
                          candidatesTokenCount:{" "}
                          {Number(usage.candidatesTokenCount) || 0}
                        </li>
                        <li>
                          totalTokenCount: {Number(usage.totalTokenCount) || 0}
                        </li>
                        {prices ? (
                          <li className="pt-1 text-white/40">
                            Preise €/1M · in {Number(prices.input) || 0} · out{" "}
                            {Number(prices.output) || 0}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  );
                })()}
                {(() => {
                  const meta =
                    selected.metaJson &&
                    typeof selected.metaJson === "object" &&
                    !Array.isArray(selected.metaJson)
                      ? (selected.metaJson as Record<string, unknown>)
                      : null;
                  const queries = Array.isArray(meta?.queries)
                    ? (meta.queries as Array<{
                        id?: string;
                        label?: string;
                        query?: string;
                      }>)
                    : [];
                  if (queries.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-cyber-cyan/20 bg-black/30 p-3">
                      <p className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                        SUCHANFRAGEN · {queries.length}
                      </p>
                      <ul className="mt-2 max-h-48 space-y-1.5 overflow-auto">
                        {queries.map((item, index) => (
                          <li
                            key={`${item.id ?? index}-${item.query ?? ""}`}
                            className="text-[11px] text-white/55"
                          >
                            <span className="font-mono text-cyber-cyan/50">
                              {(item.label || `Q${index + 1}`).toUpperCase()}
                            </span>
                            <span className="mt-0.5 block truncate text-white/70">
                              {item.query || "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {selected.metaJson ? (
                  <pre className="overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[10px] text-emerald-100/50">
                    {JSON.stringify(selected.metaJson, null, 2)}
                  </pre>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
