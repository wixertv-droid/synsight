"use client";

import { useEffect, useMemo, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

interface OrderReviewItem {
  orderId: number;
  title: string;
  sourceModuleLabel: string;
  orderTypeLabel: string;
  credits: number;
  capable: boolean;
  capabilityReason: string;
  requiresVollmacht: boolean;
  vollmachtStatus: string;
}

interface OrderReviewResult {
  items: OrderReviewItem[];
  summary: {
    selectedCount: number;
    capableCount: number;
    vollmachtMissingCount: number;
    totalCredits: number;
    canSubmit: boolean;
    blockers: string[];
  };
}

interface OrderRow {
  id: number;
  sourceModule?: string;
  hitPlatform: string;
  hitUrl: string | null;
  title: string;
  orderType: string;
  status: SynSightOrderStatus;
  staffMessage?: string | null;
  createdAt: string;
}

const MODULE_LABEL: Record<string, string> = {
  google_search: "Google Analysis",
  username_intelligence: "Username Intelligence",
  digital_leak_exposure: "Digital Exposure",
};

const STATUS_LABEL: Record<SynSightOrderStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  erledigt: "Erledigt",
  abgelehnt: "Abgelehnt",
  vorbereitet: "Vorbereitet",
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  profile_delete: "Profil-Löschung",
  google_removal: "Google-Entfernung",
  forum_contact: "Foren-Kontakt",
  gdpr: "DSGVO",
  cache_removal: "Cache-Entfernung",
  privacy_request: "Privacy-Request",
};

export default function OrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [review, setReview] = useState<OrderReviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusyId, setUploadBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  function showToast(type: "ok" | "error", text: string) {
    setToast({ type, text });
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const response = await fetch("/api/orders");
      const body = await response.json();
      if (body.success) setOrders(body.data.orders ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const draftOrders = useMemo(
    () => orders.filter((order) => order.status === "vorbereitet"),
    [orders]
  );
  const submittedOrders = useMemo(
    () => orders.filter((order) => order.status !== "vorbereitet"),
    [orders]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const order of draftOrders) {
      const key = order.sourceModule ?? "other";
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [draftOrders]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteOrder(orderId: number) {
    try {
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        showToast(
          "error",
          body.error?.message ?? "Auftrag konnte nicht gelöscht werden."
        );
        return;
      }
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      showToast("ok", "Auftrag entfernt.");
    } catch {
      showToast("error", "Verbindung fehlgeschlagen.");
    }
  }

  async function runReview() {
    if (selected.size === 0) {
      showToast("error", "Bitte mindestens einen Auftrag auswählen.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selected] }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        showToast("error", body.error?.message ?? "Prüfung fehlgeschlagen.");
        return;
      }
      setReview(body.data as OrderReviewResult);
      showToast("ok", "Prüfung abgeschlossen — siehe Zusammenfassung.");
    } catch {
      showToast("error", "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function generateVollmacht(orderId: number) {
    setBusy(true);
    try {
      const response = await fetch("/api/orders/vollmacht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        showToast(
          "error",
          body.error?.message ?? "Vollmacht konnte nicht erzeugt werden."
        );
        return;
      }
      window.open(`/api/orders/vollmacht?orderId=${orderId}`, "_blank");
      showToast(
        "ok",
        "Vollmacht-Vorlage erstellt. Bitte unterschreiben und hochladen."
      );
      if (review) await runReview();
    } catch {
      showToast("error", "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadVollmacht(orderId: number, file: File) {
    setUploadBusyId(orderId);
    try {
      const form = new FormData();
      form.set("orderId", String(orderId));
      form.set("file", file);
      const response = await fetch("/api/orders/vollmacht", {
        method: "POST",
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        showToast(
          "error",
          body.error?.message ??
            "Falsches Format. Erlaubt: PDF, JPG, PNG oder WEBP (max. 12 MB)."
        );
        return;
      }
      showToast("ok", "Unterschriebene Vollmacht hochgeladen.");
      if (review) await runReview();
      await loadOrders();
    } catch {
      showToast("error", "Upload fehlgeschlagen.");
    } finally {
      setUploadBusyId(null);
    }
  }

  async function submitSelected() {
    if (!review?.summary.canSubmit) {
      showToast(
        "error",
        review?.summary.blockers[0] ??
          "Aufträge können noch nicht abgeschickt werden."
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: review.items.map((item) => item.orderId),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        showToast("error", body.error?.message ?? "Absenden fehlgeschlagen.");
        return;
      }
      showToast(
        "ok",
        `Auftrag erfolgreich übermittelt (−${body.data.totalCredits} SynCredits).`
      );
      setSelected(new Set());
      setReview(null);
      await loadOrders();
    } catch {
      showToast("error", "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const vollmachtItems =
    review?.items.filter((item) => item.requiresVollmacht) ?? [];

  return (
    <main className="mx-auto flex max-h-[calc(100vh-6.5rem)] max-w-4xl flex-col overflow-hidden">
      <header className="mb-6 shrink-0">
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          DASHBOARD / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Meine Aufträge
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
          Übersicht der Aufträge an SynSight für Löschung oder Datenänderung.
          Auswählen → prüfen lassen → ggf. Vollmacht hochladen → abschicken.
        </p>
      </header>

      <div className="synsight-orders-scroll min-h-0 flex-1 space-y-8 overflow-y-auto pr-2 pb-4">
        {loading ? (
          <p className="text-sm text-white/35">Aufträge werden geladen…</p>
        ) : (
          <>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium text-white/88">
                    1. Vorbereitete Aufträge
                  </h2>
                  <p className="mt-1 text-xs text-white/38">
                    Nach Analyseart sortiert. Häkchen setzen und prüfen.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || selected.size === 0}
                  onClick={() => void runReview()}
                  className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.1] px-4 py-2 text-xs font-medium tracking-wide text-cyber-cyan disabled:opacity-40"
                >
                  {busy ? "Prüfe …" : `Ausgewählte prüfen (${selected.size})`}
                </button>
              </div>

              {draftOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-sm text-white/40">
                  Noch nichts vorbereitet. In einer Analyse „SynSight soll das
                  übernehmen“ wählen.
                </div>
              ) : (
                <div className="space-y-5">
                  {grouped.map(([module, moduleOrders]) => (
                    <div key={module}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-[.08em] text-white/35">
                        {MODULE_LABEL[module] ?? module}
                      </p>
                      <ul className="space-y-2">
                        {moduleOrders.map((order) => (
                          <li
                            key={order.id}
                            className={`rounded-xl border px-4 py-3 ${
                              selected.has(order.id)
                                ? "border-cyber-cyan/35 bg-cyber-cyan/[0.05]"
                                : "border-white/[0.08] bg-black/20"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected.has(order.id)}
                                onChange={() => toggle(order.id)}
                                className="mt-1 h-4 w-4 accent-cyan-400"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-white/35">
                                  {ORDER_TYPE_LABEL[order.orderType] ??
                                    order.orderType}
                                </p>
                                <p className="mt-0.5 text-sm text-white/85">
                                  {order.title}
                                </p>
                                <p className="mt-1 text-xs text-white/40">
                                  {order.hitPlatform}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void deleteOrder(order.id)}
                                className="text-white/35 hover:text-rose-200"
                                aria-label="Entfernen"
                              >
                                ×
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {review ? (
              <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h2 className="text-base font-medium text-white/88">
                  2. Prüfung & Kosten
                </h2>
                <p className="mt-1 text-xs text-white/38">
                  Machbarkeit, Vollmacht und Preis in SynCredits.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat
                    label="Ausgewählt"
                    value={review.summary.selectedCount}
                  />
                  <MiniStat
                    label="Machbar"
                    value={review.summary.capableCount}
                  />
                  <MiniStat
                    label="Vollmacht fehlt"
                    value={review.summary.vollmachtMissingCount}
                  />
                  <MiniStat
                    label="Kosten (SynCredits)"
                    value={review.summary.totalCredits}
                  />
                </div>

                <ul className="mt-4 space-y-2">
                  {review.items.map((item) => (
                    <li
                      key={item.orderId}
                      className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-white/80">{item.title}</span>
                        <span
                          className={
                            item.capable
                              ? "text-emerald-200/80"
                              : "text-rose-200/80"
                          }
                        >
                          {item.capable ? "Machbar" : "Nicht möglich"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        {item.orderTypeLabel} · {item.credits} SynCredits ·{" "}
                        {item.capabilityReason}
                      </p>
                    </li>
                  ))}
                </ul>

                {vollmachtItems.length > 0 ? (
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <h3 className="text-sm font-medium text-white/80">
                      3. Vollmacht
                    </h3>
                    <p className="mt-1 text-xs text-white/38">
                      Vorlage erzeugen → unterschreiben → als PDF/Bild
                      hochladen.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {vollmachtItems.map((item) => (
                        <li
                          key={item.orderId}
                          className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-3"
                        >
                          <p className="text-sm text-white/80">
                            #{item.orderId} · {item.title}
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            Status: {item.vollmachtStatus}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void generateVollmacht(item.orderId)
                              }
                              className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs text-amber-100/85"
                            >
                              Vorlage erzeugen
                            </button>
                            <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60">
                              {uploadBusyId === item.orderId
                                ? "Lade hoch …"
                                : "Unterschrieben hochladen"}
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file)
                                    void uploadVollmacht(item.orderId, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReview(null)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled={busy || !review.summary.canSubmit}
                    onClick={() => void submitSelected()}
                    className="rounded-lg border border-emerald-300/35 bg-emerald-300/[0.1] px-4 py-2 text-xs text-emerald-100 disabled:opacity-40"
                  >
                    {busy ? "Sende …" : "Auftrag abschicken"}
                  </button>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-base font-medium text-white/88">
                Eingereichte Aufträge
              </h2>
              <p className="mt-1 text-xs text-white/38">
                Status und Hinweise von SynSight (z. B. Vollmacht-Reklamation).
              </p>
              {submittedOrders.length === 0 ? (
                <p className="mt-4 text-sm text-white/30">
                  Noch keine eingereicht.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {submittedOrders.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white/85">{order.title}</p>
                          <p className="mt-1 text-xs text-white/40">
                            {ORDER_TYPE_LABEL[order.orderType] ??
                              order.orderType}{" "}
                            · {order.hitPlatform}
                          </p>
                        </div>
                        <span className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/60">
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                      {order.staffMessage ? (
                        <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-50/85">
                          <p>{order.staffMessage}</p>
                          <label className="mt-2 inline-flex cursor-pointer rounded border border-amber-200/30 px-2.5 py-1 text-xs text-amber-100/90">
                            {uploadBusyId === order.id
                              ? "Lade hoch …"
                              : "Korrigierte Vollmacht hochladen"}
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadVollmacht(order.id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {toast ? (
        <div
          className={`mt-3 shrink-0 rounded-lg border px-3 py-2.5 text-sm ${
            toast.type === "ok"
              ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100/90"
              : "border-rose-400/30 bg-rose-400/[0.08] text-rose-100/90"
          }`}
        >
          {toast.text}
          <button
            type="button"
            className="ml-3 text-xs underline opacity-80"
            onClick={() => setToast(null)}
          >
            schließen
          </button>
        </div>
      ) : null}
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2.5">
      <p className="text-[10px] text-white/35">{label}</p>
      <p className="mt-0.5 text-lg text-white/85">{value}</p>
    </div>
  );
}
