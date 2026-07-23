"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaymentProviderPublic } from "@/lib/services/finance-service";

const EMPTY_FORM = {
  code: "",
  name: "",
  environment: "test" as "test" | "live",
  apiKey: "",
  webhookSecret: "",
  notes: "",
  isActive: false,
  supportsCheckout: true,
};

export default function AdminFinanceProvidersView() {
  const [providers, setProviders] = useState<PaymentProviderPublic[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err">("ok");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/finance/payment-providers");
    const body = await response.json();
    if (body.success) setProviders(body.data.providers);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(provider: PaymentProviderPublic) {
    setForm({
      code: provider.code,
      name: provider.name,
      environment: provider.environment === "live" ? "live" : "test",
      apiKey: "",
      webhookSecret: "",
      notes: provider.notes ?? "",
      isActive: provider.isActive,
      supportsCheckout: provider.supportsCheckout,
    });
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      setTone("err");
      setMessage("Code und Name sind erforderlich.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/payment-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          environment: form.environment,
          notes: form.notes || null,
          isActive: form.isActive,
          supportsCheckout: form.supportsCheckout,
          apiKey: form.apiKey.trim() || undefined,
          webhookSecret: form.webhookSecret.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setTone("err");
        setMessage(body.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setTone("ok");
      setMessage("Zahlungsanbieter gespeichert.");
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.3rem] border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/[0.05] to-transparent p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          ZAHLUNGSANBIETER
        </p>
        <h2 className="mt-2 text-xl text-white/90">Provider anlegen & Keys</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/45">
          Stripe, PayPal und weitere Anbieter. API-Keys werden AES-256-GCM
          verschlüsselt gespeichert und nie im Klartext angezeigt.
        </p>

        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">CODE</span>
            <input
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
              placeholder="stripe"
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">NAME</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Stripe"
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">UMGEBUNG</span>
            <select
              value={form.environment}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  environment: event.target.value as "test" | "live",
                }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">NOTIZ</span>
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">API KEY</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.apiKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[8px] text-white/35">
              WEBHOOK SECRET
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.webhookSecret}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  webhookSecret: event.target.value,
                }))
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white/55">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Aktiv
          </label>
          <label className="flex items-center gap-2 text-sm text-white/55">
            <input
              type="checkbox"
              checked={form.supportsCheckout}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  supportsCheckout: event.target.checked,
                }))
              }
            />
            Checkout unterstützt
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2 text-sm text-cyber-cyan disabled:opacity-40"
            >
              {busy ? "Speichern…" : "Anbieter speichern"}
            </button>
            {message ? (
              <p
                className={`mt-2 text-sm ${tone === "ok" ? "text-emerald-200/80" : "text-rose-200/80"}`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] tracking-[.12em] text-cyber-cyan/55">
                  {provider.code.toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-white/80">{provider.name}</p>
              </div>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[9px] ${
                  provider.isActive
                    ? "border-emerald-300/30 text-emerald-100/75"
                    : "border-white/15 text-white/35"
                }`}
              >
                {provider.isActive ? "AKTIV" : "INAKTIV"}
              </span>
            </div>
            <p className="mt-3 font-mono text-[10px] text-white/35">
              Env · {provider.environment} · Key ·{" "}
              {provider.configured ? provider.maskedApiKey : "nicht gesetzt"}
            </p>
            <button
              type="button"
              onClick={() => edit(provider)}
              className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
            >
              Bearbeiten
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
