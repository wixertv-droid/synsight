"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminFinanceGuide from "@/components/admin/views/AdminFinanceGuide";
import type {
  AdvertisingCampaignPublic,
  AdvertisingOverview,
} from "@/lib/services/advertising-service";

const PLATFORMS = [
  ["google_ads", "Google Ads"],
  ["youtube", "YouTube Ads"],
  ["facebook", "Facebook Ads"],
  ["instagram", "Instagram Ads"],
  ["tiktok", "TikTok Ads"],
  ["linkedin", "LinkedIn Ads"],
  ["x", "X / Twitter Ads"],
  ["other", "Sonstige"],
] as const;

function money(value: number) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function platformLabel(value: string) {
  return PLATFORMS.find(([code]) => code === value)?.[1] ?? value;
}

const emptyCampaign = {
  name: "",
  platform: "google_ads",
  status: "draft",
  objective: "",
  landingUrl: "",
  startsAt: "",
  endsAt: "",
  dailyBudgetEur: "0",
  totalBudgetEur: "0",
  targetCountry: "DE",
  targetRegion: "",
  targetAudience: "",
  utmSource: "",
  utmMedium: "paid",
  utmCampaign: "",
  utmContent: "",
  externalCampaignId: "",
  externalAccountId: "",
  notes: "",
};

export default function AdminAdvertisingView() {
  const [campaigns, setCampaigns] = useState<AdvertisingCampaignPublic[]>([]);
  const [overview, setOverview] = useState<AdvertisingOverview | null>(null);
  const [form, setForm] = useState(emptyCampaign);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [metric, setMetric] = useState({
    metricDate: new Date().toISOString().slice(0, 10),
    spendEur: "0",
    impressions: "0",
    reach: "0",
    clicks: "0",
    conversions: "0",
    conversionValueEur: "0",
  });

  const selected = useMemo(
    () => campaigns.find((row) => row.id === selectedId) ?? null,
    [campaigns, selectedId]
  );

  const load = useCallback(async () => {
    setError(null);

    const response = await fetch("/api/admin/finance/advertising");
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.success) {
      setError(
        body?.error?.message ?? "Werbedaten konnten nicht geladen werden."
      );
      return;
    }

    setCampaigns(body.data.campaigns ?? []);
    setOverview(body.data.overview ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(payload: unknown) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/finance/advertising", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(body?.error?.message ?? "Speichern fehlgeschlagen.");
        return false;
      }

      setCampaigns(body.data.campaigns ?? []);
      setOverview(body.data.overview ?? null);

      return true;
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign() {
    if (!form.name.trim()) {
      setError("Bitte einen Kampagnennamen eingeben.");
      return;
    }

    const ok = await send({
      action: "campaign",
      name: form.name,
      platform: form.platform,
      status: form.status,
      objective: form.objective || null,
      landingUrl: form.landingUrl || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      dailyBudgetEur: Number(form.dailyBudgetEur) || 0,
      totalBudgetEur: Number(form.totalBudgetEur) || 0,
      targetCountry: form.targetCountry || null,
      targetRegion: form.targetRegion || null,
      targetAudience: form.targetAudience || null,
      utmSource: form.utmSource || null,
      utmMedium: form.utmMedium || null,
      utmCampaign: form.utmCampaign || null,
      utmContent: form.utmContent || null,
      externalCampaignId: form.externalCampaignId || null,
      externalAccountId: form.externalAccountId || null,
      notes: form.notes || null,
    });

    if (ok) {
      setForm(emptyCampaign);
      setMessage("Kampagne angelegt.");
    }
  }

  async function setStatus(
    campaign: AdvertisingCampaignPublic,
    status: AdvertisingCampaignPublic["status"]
  ) {
    const ok = await send({
      action: "campaign",
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status,
      objective: campaign.objective,
      landingUrl: campaign.landingUrl,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      dailyBudgetEur: campaign.dailyBudgetEur,
      totalBudgetEur: campaign.totalBudgetEur,
      targetCountry: campaign.targetCountry,
      targetRegion: campaign.targetRegion,
      targetAudience: campaign.targetAudience,
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: campaign.utmCampaign,
      utmContent: campaign.utmContent,
      externalCampaignId: campaign.externalCampaignId,
      externalAccountId: campaign.externalAccountId,
      notes: campaign.notes,
    });

    if (ok) setMessage("Kampagnenstatus aktualisiert.");
  }

  async function saveMetric() {
    if (!selected) return;

    const ok = await send({
      action: "metric",
      campaignId: selected.id,
      metricDate: metric.metricDate,
      spendEur: Number(metric.spendEur) || 0,
      impressions: Number(metric.impressions) || 0,
      reach: Number(metric.reach) || 0,
      clicks: Number(metric.clicks) || 0,
      conversions: Number(metric.conversions) || 0,
      conversionValueEur: Number(metric.conversionValueEur) || 0,
      source: "manual",
    });

    if (ok) setMessage("Tageswerte gespeichert.");
  }

  if (!overview) {
    return <p className="text-sm text-white/40">Werbe-Center wird geladen…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminFinanceGuide mode="advertising" />
      <section className="intel-cyber-hud relative overflow-hidden rounded-[1.3rem] border border-cyber-cyan/20 bg-[#050b14]/95 p-5">
        <div className="intel-cyber-scanlines" aria-hidden="true" />

        <div className="relative z-[1]">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
            ADS COMMAND CENTER
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white/90">
            Werbung & Kampagnen
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/45">
            Kampagnen, Budgets, Ausgaben und Werbeerfolg zentral verwalten.
            Werbekosten fließen automatisch in die SynSight-Finanzübersicht ein.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Budget", money(overview.totalBudgetEur)],
              ["Ausgegeben", money(overview.spendEur)],
              ["Restbudget", money(overview.remainingBudgetEur)],
              ["Conversions", String(overview.conversions)],
              ["ROAS", `${overview.roas.toFixed(2)}×`],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border border-white/[0.08] bg-black/30 p-4"
              >
                <p className="font-mono text-[8px] text-white/30">
                  {label.toUpperCase()}
                </p>
                <p className="mt-2 text-lg text-white/85">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Impressionen", overview.impressions.toLocaleString("de-DE")],
              ["Klicks", overview.clicks.toLocaleString("de-DE")],
              ["CTR", `${overview.ctr.toFixed(2)} %`],
              ["CPC", money(overview.cpc)],
              ["CPA", money(overview.cpa)],
              ["Conv. Rate", `${overview.conversionRate.toFixed(2)} %`],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
              >
                <p className="font-mono text-[8px] text-white/30">
                  {label.toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-white/75">{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] px-4 py-3 text-sm text-emerald-100/75">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-100/75">
          {error}
        </p>
      ) : null}

      <section className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.015] p-5">
        <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
          NEUE KAMPAGNE
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Kampagnenname"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          >
            {PLATFORMS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            placeholder="Ziel · z. B. Registrierungen"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            value={form.landingUrl}
            onChange={(e) => setForm({ ...form, landingUrl: e.target.value })}
            placeholder="Landingpage"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <label className="space-y-1">
            <span className="font-mono text-[8px] text-white/30">START</span>
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
            />
          </label>

          <label className="space-y-1">
            <span className="font-mono text-[8px] text-white/30">ENDE</span>
            <input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
            />
          </label>

          <input
            type="number"
            step="0.01"
            value={form.dailyBudgetEur}
            onChange={(e) =>
              setForm({ ...form, dailyBudgetEur: e.target.value })
            }
            placeholder="Tagesbudget €"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            type="number"
            step="0.01"
            value={form.totalBudgetEur}
            onChange={(e) =>
              setForm({ ...form, totalBudgetEur: e.target.value })
            }
            placeholder="Gesamtbudget €"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            value={form.targetCountry}
            onChange={(e) =>
              setForm({ ...form, targetCountry: e.target.value })
            }
            placeholder="Land · DE"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            value={form.targetRegion}
            onChange={(e) => setForm({ ...form, targetRegion: e.target.value })}
            placeholder="Region"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            value={form.utmSource}
            onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
            placeholder="UTM Source"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />

          <input
            value={form.utmCampaign}
            onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}
            placeholder="UTM Campaign"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />
        </div>

        <textarea
          value={form.targetAudience}
          onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
          placeholder="Zielgruppe / Targeting"
          className="mt-3 min-h-20 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => void createCampaign()}
          className="mt-4 rounded-lg border border-cyber-cyan/30 px-4 py-2 text-sm text-cyber-cyan disabled:opacity-40"
        >
          {busy ? "Speichern…" : "Kampagne anlegen"}
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 space-y-3">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            KAMPAGNEN · {campaigns.length}
          </p>

          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => setSelectedId(campaign.id)}
              className={`w-full rounded-xl border p-4 text-left ${
                selectedId === campaign.id
                  ? "border-cyber-cyan/35 bg-cyber-cyan/[0.04]"
                  : "border-white/[0.07] bg-black/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] text-cyber-cyan/60">
                    {platformLabel(campaign.platform).toUpperCase()}
                  </p>
                  <h3 className="mt-1 text-sm font-medium text-white/85">
                    {campaign.name}
                  </h3>
                  <p className="mt-1 text-xs text-white/35">
                    {campaign.objective || "Kein Ziel hinterlegt"}
                  </p>
                </div>

                <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] text-white/50">
                  {campaign.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <span className="text-xs text-white/45">
                  Spend
                  <br />
                  <strong className="text-white/75">
                    {money(campaign.spendEur)}
                  </strong>
                </span>

                <span className="text-xs text-white/45">
                  Budget
                  <br />
                  <strong className="text-white/75">
                    {money(campaign.totalBudgetEur)}
                  </strong>
                </span>

                <span className="text-xs text-white/45">
                  Klicks
                  <br />
                  <strong className="text-white/75">{campaign.clicks}</strong>
                </span>

                <span className="text-xs text-white/45">
                  Conversions
                  <br />
                  <strong className="text-white/75">
                    {campaign.conversions}
                  </strong>
                </span>

                <span className="text-xs text-white/45">
                  CPA
                  <br />
                  <strong className="text-white/75">
                    {money(campaign.cpa)}
                  </strong>
                </span>

                <span className="text-xs text-white/45">
                  ROAS
                  <br />
                  <strong className="text-white/75">
                    {campaign.roas.toFixed(2)}×
                  </strong>
                </span>
              </div>
            </button>
          ))}

          {campaigns.length === 0 ? (
            <p className="rounded-xl border border-white/[0.07] bg-black/20 p-5 text-sm text-white/40">
              Noch keine Werbekampagnen vorhanden.
            </p>
          ) : null}
        </div>

        <aside className="min-w-0 rounded-[1.2rem] border border-cyber-cyan/20 bg-[#050b14] p-5">
          {!selected ? (
            <p className="text-sm text-white/40">
              Kampagne auswählen, um Status und Tageswerte zu bearbeiten.
            </p>
          ) : (
            <>
              <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
                KAMPAGNENSTEUERUNG
              </p>

              <h3 className="mt-2 text-lg text-white/85">{selected.name}</h3>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["active", "paused", "completed", "archived"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(selected, status)}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60"
                    >
                      {status === "active"
                        ? "Aktivieren"
                        : status === "paused"
                          ? "Pausieren"
                          : status === "completed"
                            ? "Beenden"
                            : "Archivieren"}
                    </button>
                  )
                )}
              </div>

              <div className="mt-6 border-t border-white/[0.07] pt-5">
                <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                  TAGESWERTE
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["spendEur", "Ausgaben €"],
                    ["impressions", "Impressionen"],
                    ["reach", "Reichweite"],
                    ["clicks", "Klicks"],
                    ["conversions", "Conversions"],
                    ["conversionValueEur", "Conversion-Wert €"],
                  ].map(([key, label]) => (
                    <label key={key} className="space-y-1">
                      <span className="font-mono text-[8px] text-white/30">
                        {label.toUpperCase()}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step={
                          key.includes("Eur") || key === "conversions"
                            ? "0.01"
                            : "1"
                        }
                        value={metric[key as keyof typeof metric]}
                        onChange={(e) =>
                          setMetric({
                            ...metric,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
                      />
                    </label>
                  ))}
                </div>

                <input
                  type="date"
                  value={metric.metricDate}
                  onChange={(e) =>
                    setMetric({
                      ...metric,
                      metricDate: e.target.value,
                    })
                  }
                  className="mt-3 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
                />

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveMetric()}
                  className="mt-3 rounded-lg border border-cyber-cyan/30 px-4 py-2 text-sm text-cyber-cyan disabled:opacity-40"
                >
                  Tageswerte speichern
                </button>
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
