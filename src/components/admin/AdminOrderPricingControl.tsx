"use client";

import { useEffect, useState } from "react";
import AdminFinanceGuide from "@/components/admin/views/AdminFinanceGuide";

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

/** Friendly labels for admins who only need to set the customer price. */
const TYPE_HELP: Record<string, string> = {
  profile_delete: "Löschung eines Online-Profils (z. B. Social Media).",
  google_removal: "Entfernung eines Google-Suchtreffers.",
  forum_contact: "Kontakt / Löschbitte an ein Forum.",
  gdpr: "Formelle DSGVO-Anfrage (Auskunft, Löschung, Änderung).",
  cache_removal: "Entfernung aus Cache / Suchindex.",
  privacy_request: "Allgemeine Privacy- / Datenschutzanfrage.",
};

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

  function updateRow(orderType: string, patch: Partial<OrderPriceRow>) {
    setRows((current) =>
      current.map((item) =>
        item.orderType === orderType ? { ...item, ...patch } : item
      )
    );
  }

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
      setMessage(`Preis für „${row.label}“ gespeichert.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  return (
    <>
      <AdminFinanceGuide mode="order-pricing" />
      <section className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 md:p-6">
        <div>
          <h2 className="text-base font-medium text-white/88">
            Preise für Kundenaufträge
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
            Hier legst du nur fest,{" "}
            <strong className="font-medium text-white/70">
              wie viele SynCredits
            </strong>{" "}
            ein Kunde für diese Auftragsart zahlt — und ob eine Vollmacht nötig
            ist. Beispiel: <em>25</em> bedeutet 25 SynCredits pro Auftrag dieses
            Typs.
          </p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-white/35">Laden…</p>
        ) : (
          <div className="mt-6 space-y-3">
            {rows.map((row) => (
              <div
                key={row.orderType}
                className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/85">
                      {row.label}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {TYPE_HELP[row.orderType] ??
                        row.description ??
                        row.orderType}
                    </p>
                  </div>
                  <label className="block shrink-0">
                    <span className="block text-[11px] text-white/45">
                      Preis in SynCredits
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.credits}
                      onChange={(e) =>
                        updateRow(row.orderType, {
                          credits: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-28 rounded-lg border border-cyber-cyan/25 bg-black/40 px-3 py-2 text-lg text-white"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={row.requiresVollmacht}
                      onChange={(e) =>
                        updateRow(row.orderType, {
                          requiresVollmacht: e.target.checked,
                        })
                      }
                      className="accent-cyan-400"
                    />
                    Vollmacht vom Kunden nötig
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={row.synsightCapable}
                      onChange={(e) =>
                        updateRow(row.orderType, {
                          synsightCapable: e.target.checked,
                        })
                      }
                      className="accent-cyan-400"
                    />
                    SynSight kann diesen Auftragstyp bearbeiten
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) =>
                        updateRow(row.orderType, { isActive: e.target.checked })
                      }
                      className="accent-cyan-400"
                    />
                    Für Kunden buchbar
                  </label>
                  <button
                    type="button"
                    onClick={() => void save(row)}
                    className="ml-auto rounded-lg bg-cyber-blue/20 px-3 py-1.5 text-xs text-cyber-cyan"
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
    </>
  );
}
