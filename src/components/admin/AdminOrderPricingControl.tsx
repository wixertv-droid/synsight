"use client";

import { useEffect, useState } from "react";
import InfoHeading from "@/components/ui/InfoHeading";

interface OrderPriceRow {
  id: number;
  orderType: string;
  label: string;
  description: string | null;
  credits: number;
  requiresVollmacht: boolean;
  synsightCapable: boolean;
  capabilityHint: string | null;
  sortOrder: number;
  isActive: boolean;
}

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export default function AdminOrderPricingControl() {
  const [rows, setRows] = useState<OrderPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/order-pricing");
      const result = (await response.json()) as ApiResult<{
        pricing: OrderPriceRow[];
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Auftragspreise konnten nicht geladen werden."
            : result.error.message
        );
        return;
      }
      setRows(result.data.pricing);
    } catch {
      setMessage("Verbindung zur Auftragspreis-Verwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(row: OrderPriceRow) {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/order-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          orderType: row.orderType,
          label: row.label,
          description: row.description,
          credits: Number(row.credits),
          requiresVollmacht: row.requiresVollmacht,
          synsightCapable: row.synsightCapable,
          capabilityHint: row.capabilityHint,
          sortOrder: Number(row.sortOrder),
          isActive: row.isActive,
        }),
      });
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "Speichern fehlgeschlagen." : result.error.message
        );
      }
      setMessage(`Auftragspreis „${row.label}“ gespeichert.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  async function resetDefaults() {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/order-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "Reset fehlgeschlagen." : result.error.message
        );
      }
      setMessage("Auftragspreise auf Standard zurückgesetzt.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Reset fehlgeschlagen."
      );
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <InfoHeading
          label="Auftragspreise (Löschung / Änderung)"
          info="SynCredits und Vollmacht-Pflicht je Auftragstyp — steuert Prüfung und Abbuchung unter Meine Aufträge."
          as="h2"
          className="text-sm font-medium text-white/85"
        />
        <button
          type="button"
          onClick={() => void resetDefaults()}
          className="rounded-lg border border-white/15 px-3 py-2 font-mono text-[9px] tracking-[.12em] text-white/45"
        >
          STANDARD LADEN
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-white/35">Laden…</p>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div
              key={row.orderType}
              className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
            >
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="block text-[11px] text-white/40">
                  Typ
                  <input
                    value={row.orderType}
                    disabled
                    className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 font-mono text-xs text-white/50"
                  />
                </label>
                <label className="block text-[11px] text-white/40">
                  Bezeichnung
                  <input
                    value={row.label}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, label: e.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] text-white/40">
                  SynCredits
                  <input
                    type="number"
                    min={0}
                    value={row.credits}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, credits: Number(e.target.value) }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] text-white/40">
                  Sortierung
                  <input
                    type="number"
                    min={0}
                    value={row.sortOrder}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, sortOrder: Number(e.target.value) }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                  />
                </label>
              </div>
              <label className="mt-3 block text-[11px] text-white/40">
                Beschreibung
                <textarea
                  value={row.description ?? ""}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.orderType === row.orderType
                          ? { ...item, description: e.target.value }
                          : item
                      )
                    )
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                />
              </label>
              <label className="mt-3 block text-[11px] text-white/40">
                Hinweis Machbarkeit
                <textarea
                  value={row.capabilityHint ?? ""}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.orderType === row.orderType
                          ? { ...item, capabilityHint: e.target.value }
                          : item
                      )
                    )
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={row.synsightCapable}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, synsightCapable: e.target.checked }
                            : item
                        )
                      )
                    }
                    className="accent-cyan-400"
                  />
                  SynSight kann das
                </label>
                <label className="flex items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={row.requiresVollmacht}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, requiresVollmacht: e.target.checked }
                            : item
                        )
                      )
                    }
                    className="accent-cyan-400"
                  />
                  Vollmacht nötig
                </label>
                <label className="flex items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.orderType === row.orderType
                            ? { ...item, isActive: e.target.checked }
                            : item
                        )
                      )
                    }
                    className="accent-cyan-400"
                  />
                  Aktiv
                </label>
                <button
                  type="button"
                  onClick={() => void save(row)}
                  className="ml-auto rounded bg-cyber-blue/15 px-3 py-1.5 text-xs text-cyber-cyan"
                >
                  Speichern
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded-lg border border-white/[0.07] px-4 py-3 text-xs text-white/60">
          {message}
        </p>
      ) : null}
    </section>
  );
}
