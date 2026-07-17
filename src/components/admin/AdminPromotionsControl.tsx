"use client";

import { FormEvent, useEffect, useState } from "react";

interface PromotionRow {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  timezone: string;
  bonusCredits: number;
  promoCodeRequired: boolean;
  promoCode: string | null;
  newUsersOnly: boolean;
  existingUsersOnly: boolean;
  singleUsePerUser: boolean;
  maxParticipants: number | null;
  minBalance: number | null;
  budgetCredits: number | null;
  lifecycle: "active" | "planned" | "expired" | "inactive";
  participants: number;
  creditsGranted: number;
  remainingBudget: number | null;
}

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

const lifecycleLabel: Record<PromotionRow["lifecycle"], string> = {
  active: "Aktiv",
  planned: "Geplant",
  expired: "Abgelaufen",
  inactive: "Inaktiv",
};

const lifecycleClass: Record<PromotionRow["lifecycle"], string> = {
  active: "text-emerald-200/70 border-emerald-300/15 bg-emerald-300/[0.04]",
  planned: "text-cyan-100/70 border-cyber-cyan/15 bg-cyber-cyan/[0.04]",
  expired: "text-white/35 border-white/10 bg-white/[0.02]",
  inactive: "text-amber-100/60 border-amber-300/15 bg-amber-300/[0.04]",
};

const emptyForm = {
  name: "",
  description: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  timeFrom: "",
  timeTo: "",
  timezone: "Europe/Berlin",
  bonusCredits: "250",
  promoCodeRequired: false,
  promoCode: "",
  newUsersOnly: true,
  existingUsersOnly: false,
  singleUsePerUser: true,
  maxParticipants: "",
  minBalance: "",
  budgetCredits: "",
};

export default function AdminPromotionsControl() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadPromotions() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/promotions");
      const result = (await response.json()) as ApiResult<PromotionRow[]>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Promotionen konnten nicht geladen werden."
            : result.error.message
        );
        return;
      }
      setPromotions(result.data);
    } catch {
      setMessage("Verbindung zur Promotion-Verwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromotions();
  }, []);

  async function put(payload: Record<string, unknown>) {
    setMessage(null);
    const response = await fetch("/api/admin/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as ApiResult<unknown>;
    if (!response.ok || !result.success) {
      throw new Error(
        result.success ? "Aktion fehlgeschlagen." : result.error.message
      );
    }
  }

  function optionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildPayload() {
    return {
      name: form.name,
      description: form.description || null,
      isActive: form.isActive,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      timeFrom: form.timeFrom || null,
      timeTo: form.timeTo || null,
      timezone: form.timezone,
      bonusCredits: Number(form.bonusCredits),
      promoCodeRequired: form.promoCodeRequired,
      promoCode: form.promoCode || null,
      newUsersOnly: form.newUsersOnly,
      existingUsersOnly: form.existingUsersOnly,
      singleUsePerUser: form.singleUsePerUser,
      maxParticipants: optionalNumber(form.maxParticipants),
      minBalance: optionalNumber(form.minBalance),
      budgetCredits: optionalNumber(form.budgetCredits),
    };
  }

  async function createPromotion(event: FormEvent) {
    event.preventDefault();
    try {
      await put({ action: "create", ...buildPayload() });
      setForm(emptyForm);
      setMessage("Promotion erstellt.");
      await loadPromotions();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erstellen fehlgeschlagen."
      );
    }
  }

  async function toggleActive(row: PromotionRow) {
    try {
      await put({
        action: "set_active",
        id: row.id,
        isActive: !row.isActive,
      });
      setMessage(
        row.isActive ? "Promotion deaktiviert." : "Promotion aktiviert."
      );
      await loadPromotions();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Statusänderung fehlgeschlagen."
      );
    }
  }

  async function deletePromotion(row: PromotionRow) {
    if (!window.confirm(`Promotion „${row.name}“ wirklich löschen?`)) return;
    try {
      await put({ action: "delete", id: row.id, confirm: true });
      setMessage("Promotion gelöscht.");
      await loadPromotions();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
    }
  }

  async function savePromotion(row: PromotionRow) {
    try {
      await put({
        action: "update",
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.isActive,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        timeFrom: row.timeFrom,
        timeTo: row.timeTo,
        timezone: row.timezone,
        bonusCredits: row.bonusCredits,
        promoCodeRequired: row.promoCodeRequired,
        promoCode: row.promoCode,
        newUsersOnly: row.newUsersOnly,
        existingUsersOnly: row.existingUsersOnly,
        singleUsePerUser: row.singleUsePerUser,
        maxParticipants: row.maxParticipants,
        minBalance: row.minBalance,
        budgetCredits: row.budgetCredits,
      });
      setMessage(`Promotion „${row.name}“ gespeichert.`);
      await loadPromotions();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  function updateRow(index: number, patch: Partial<PromotionRow>) {
    setPromotions((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  const grouped = {
    active: promotions.filter((row) => row.lifecycle === "active"),
    planned: promotions.filter((row) => row.lifecycle === "planned"),
    expired: promotions.filter((row) => row.lifecycle === "expired"),
    inactive: promotions.filter((row) => row.lifecycle === "inactive"),
  };

  return (
    <section
      id="promotions-management"
      className="mt-6 scroll-mt-24"
      aria-labelledby="promotions-heading"
    >
      <div className="mb-4">
        <p className="font-mono text-[8px] tracking-[.16em] text-white/25">
          ADMIN / PROMOTIONEN
        </p>
        <h2
          id="promotions-heading"
          className="mt-2 text-xl font-medium text-white/75"
        >
          Promotionen
        </h2>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/55">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={createPromotion}
        className="hardware-panel mb-6 rounded-[1.2rem] border border-white/[0.07] p-5"
      >
        <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
          NEUE PROMOTION
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Name"
            required
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            value={form.bonusCredits}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bonusCredits: event.target.value,
              }))
            }
            placeholder="Bonus-SynCredits"
            required
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Beschreibung"
            className="md:col-span-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            type="date"
            value={form.startsAt}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startsAt: event.target.value,
              }))
            }
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            type="date"
            value={form.endsAt}
            onChange={(event) =>
              setForm((current) => ({ ...current, endsAt: event.target.value }))
            }
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            type="time"
            value={form.timeFrom}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                timeFrom: event.target.value,
              }))
            }
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            type="time"
            value={form.timeTo}
            onChange={(event) =>
              setForm((current) => ({ ...current, timeTo: event.target.value }))
            }
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            value={form.timezone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                timezone: event.target.value,
              }))
            }
            placeholder="Zeitzone"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
          <input
            value={form.promoCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                promoCode: event.target.value.toUpperCase(),
              }))
            }
            placeholder="Promotion-Code (optional)"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/45">
          {[
            ["isActive", "Aktiv"],
            ["promoCodeRequired", "Code erforderlich"],
            ["newUsersOnly", "Nur neue Benutzer"],
            ["existingUsersOnly", "Nur bestehende Benutzer"],
            ["singleUsePerUser", "Einmal pro Benutzer"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="mt-5 rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.08] px-4 py-2 text-xs text-cyan-100/85"
        >
          Promotion erstellen
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-white/35">Promotionen werden geladen …</p>
      ) : (
        Object.entries(grouped).map(([group, rows]) =>
          rows.length > 0 ? (
            <div key={group} className="mb-6">
              <p className="mb-3 font-mono text-[8px] tracking-[.14em] text-white/25">
                {group.toUpperCase()}
              </p>
              <div className="space-y-4">
                {rows.map((row) => {
                  const index = promotions.findIndex(
                    (entry) => entry.id === row.id
                  );
                  return (
                    <article
                      key={row.id}
                      className="hardware-panel rounded-[1.2rem] border border-white/[0.07] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg text-white/80">
                              {row.name}
                            </h3>
                            <span
                              className={`rounded border px-2 py-1 font-mono text-[7px] tracking-[.12em] ${lifecycleClass[row.lifecycle]}`}
                            >
                              {lifecycleLabel[row.lifecycle]}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-white/35">
                            {row.description}
                          </p>
                        </div>
                        <div className="text-right font-mono text-[8px] tracking-[.12em] text-white/30">
                          <p>
                            TEILNEHMER{" "}
                            {row.participants.toLocaleString("de-DE")}
                          </p>
                          <p className="mt-1">
                            VERGEBEN{" "}
                            {row.creditsGranted.toLocaleString("de-DE")} CR
                          </p>
                          {row.remainingBudget !== null ? (
                            <p className="mt-1">
                              RESTBUDGET{" "}
                              {row.remainingBudget.toLocaleString("de-DE")} CR
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <input
                          value={row.bonusCredits}
                          onChange={(event) =>
                            updateRow(index, {
                              bonusCredits: Number(event.target.value),
                            })
                          }
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                        />
                        <input
                          value={row.promoCode ?? ""}
                          onChange={(event) =>
                            updateRow(index, {
                              promoCode:
                                event.target.value.toUpperCase() || null,
                            })
                          }
                          placeholder="Promotion-Code"
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                        />
                        <input
                          value={row.maxParticipants ?? ""}
                          onChange={(event) =>
                            updateRow(index, {
                              maxParticipants: optionalNumber(
                                event.target.value
                              ),
                            })
                          }
                          placeholder="Max. Teilnehmer"
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void savePromotion(row)}
                          className="rounded-lg border border-cyber-blue/20 px-3 py-2 text-xs text-cyan-100/75"
                        >
                          Speichern
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(row)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55"
                        >
                          {row.isActive ? "Deaktivieren" : "Aktivieren"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePromotion(row)}
                          className="rounded-lg border border-rose-300/15 px-3 py-2 text-xs text-rose-100/60"
                        >
                          Löschen
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null
        )
      )}
    </section>
  );
}
