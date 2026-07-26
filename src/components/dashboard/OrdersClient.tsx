"use client";

import { useEffect, useMemo, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

interface OrderReviewItem {
  orderId: number;
  title: string;
  sourceModule: string;
  sourceModuleLabel: string;
  hitPlatform: string;
  hitUrl: string | null;
  orderType: string;
  orderTypeLabel: string;
  credits: number;
  capable: boolean;
  capabilityReason: string;
  requiresVollmacht: boolean;
  vollmachtStatus:
    "not_required" | "missing" | "generated" | "uploaded" | "verified";
  vollmachtId: number | null;
  pricingActive: boolean;
}

interface OrderReviewResult {
  items: OrderReviewItem[];
  summary: {
    selectedCount: number;
    capableCount: number;
    incapableCount: number;
    vollmachtRequiredCount: number;
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

type Step = "select" | "review" | "vollmacht" | "submit";

export default function OrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<Step>("select");
  const [review, setReview] = useState<OrderReviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusyId, setUploadBusyId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  function toggleGroup(ids: number[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function deleteOrder(orderId: number) {
    setDeletingId(orderId);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        setError(
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
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setDeletingId(null);
    }
  }

  async function runReview() {
    if (selected.size === 0) {
      setError("Bitte mindestens einen Auftrag auswählen.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selected] }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Prüfung fehlgeschlagen.");
        return;
      }
      setReview(body.data as OrderReviewResult);
      const needsVollmacht = (body.data as OrderReviewResult).items.some(
        (item) =>
          item.requiresVollmacht &&
          (item.vollmachtStatus === "missing" ||
            item.vollmachtStatus === "generated")
      );
      setStep(needsVollmacht ? "vollmacht" : "review");
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function generateVollmacht(orderId: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/vollmacht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        setError(
          body.error?.message ?? "Vollmacht konnte nicht erzeugt werden."
        );
        return;
      }
      window.open(`/api/orders/vollmacht?orderId=${orderId}`, "_blank");
      await runReview();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadVollmacht(orderId: number, file: File) {
    setUploadBusyId(orderId);
    setError(null);
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
        setError(body.error?.message ?? "Upload fehlgeschlagen.");
        return;
      }
      await runReview();
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setUploadBusyId(null);
    }
  }

  async function submitSelected() {
    if (!review?.summary.canSubmit) {
      setError(
        review?.summary.blockers[0] ??
          "Aufträge können noch nicht abgeschickt werden."
      );
      return;
    }
    setBusy(true);
    setError(null);
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
        setError(body.error?.message ?? "Absenden fehlgeschlagen.");
        return;
      }
      setSuccessMessage(
        `${body.data.submitted.length} Auftrag/Aufträge abgeschickt (−${body.data.totalCredits} SynCredits).`
      );
      setSelected(new Set());
      setReview(null);
      setStep("select");
      await loadOrders();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const vollmachtItems =
    review?.items.filter((item) => item.requiresVollmacht) ?? [];

  return (
    <main className="mx-auto flex max-h-[calc(100vh-6.5rem)] max-w-5xl flex-col overflow-hidden">
      <header className="mb-6 shrink-0">
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          DASHBOARD / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Meine Aufträge
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">
          Hier siehst du die Übersicht aller Aufträge, die an SynSight zur
          Löschung oder Datenänderung übergeben werden sollen. Wähle die
          gewünschten Positionen aus — SynSight prüft anschließend, ob die
          Maßnahme möglich ist, ob eine Vollmacht nötig ist, und zeigt dir eine
          Zusammenfassung inkl. SynCredits-Preis, bevor du den Auftrag
          abschickst.
        </p>
      </header>

      <div className="synsight-orders-scroll min-h-0 flex-1 space-y-8 overflow-y-auto pr-2">
        {error ? (
          <p className="rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-100/80">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.06] px-3 py-2 text-sm text-emerald-100/85">
            {successMessage}
          </p>
        ) : null}

        <ol className="flex flex-wrap gap-2 font-mono text-[9px] tracking-[.12em] text-white/35">
          {(
            [
              ["select", "1 · Auswählen"],
              ["review", "2 · Prüfung"],
              ["vollmacht", "3 · Vollmacht"],
              ["submit", "4 · Abschicken"],
            ] as const
          ).map(([key, label]) => (
            <li
              key={key}
              className={`rounded border px-2.5 py-1 ${
                step === key
                  ? "border-cyber-cyan/40 bg-cyber-cyan/[0.08] text-cyber-cyan"
                  : "border-white/10"
              }`}
            >
              {label}
            </li>
          ))}
        </ol>

        {loading ? (
          <p className="text-sm text-white/35">Aufträge werden geladen…</p>
        ) : (
          <>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-white/85">
                    Vorbereitete Aufträge
                  </h2>
                  <p className="mt-1 text-xs text-white/35">
                    Nach Analyseart gruppiert — mit Kästchen auswählen.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || selected.size === 0}
                  onClick={() => void runReview()}
                  className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.1] px-4 py-2 font-mono text-[10px] tracking-[.14em] text-cyber-cyan transition hover:border-cyber-cyan/55 disabled:opacity-40"
                >
                  {busy ? "PRÜFE …" : "AUSGEWÄHLTE PRÜFEN"}
                </button>
              </div>

              {draftOrders.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-8 text-sm text-white/40">
                  Noch keine vorbereiteten Aufträge. In einer Analyse auf einer
                  Trefferkarte „SynSight soll das übernehmen“ wählen.
                </div>
              ) : (
                <div className="space-y-6">
                  {grouped.map(([module, moduleOrders]) => {
                    const ids = moduleOrders.map((o) => o.id);
                    const allSelected = ids.every((id) => selected.has(id));
                    return (
                      <div key={module}>
                        <div className="mb-3 flex items-center gap-3">
                          <label className="flex items-center gap-2 font-mono text-[9px] tracking-[.14em] text-white/40">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) =>
                                toggleGroup(ids, e.target.checked)
                              }
                              className="h-3.5 w-3.5 accent-cyan-400"
                            />
                            {(MODULE_LABEL[module] ?? module).toUpperCase()}
                            <span className="text-white/25">
                              ({moduleOrders.length})
                            </span>
                          </label>
                        </div>
                        <ul className="space-y-2">
                          {moduleOrders.map((order) => (
                            <li
                              key={order.id}
                              className={`rounded-xl border px-4 py-3 transition ${
                                selected.has(order.id)
                                  ? "border-cyber-cyan/35 bg-cyber-cyan/[0.05]"
                                  : "border-white/[0.08] bg-black/25"
                              }`}
                            >
                              <div className="flex flex-wrap items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selected.has(order.id)}
                                  onChange={() => toggle(order.id)}
                                  className="mt-1 h-4 w-4 accent-cyan-400"
                                  aria-label={`Auftrag ${order.id} auswählen`}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                                    {(
                                      ORDER_TYPE_LABEL[order.orderType] ??
                                      order.orderType
                                    ).toUpperCase()}
                                  </p>
                                  <h3 className="mt-1 text-sm font-medium text-white/85">
                                    {order.title}
                                  </h3>
                                  <p className="mt-1 text-xs text-white/40">
                                    {order.hitPlatform}
                                  </p>
                                  {order.hitUrl ? (
                                    <a
                                      href={order.hitUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex font-mono text-[11px] text-cyber-cyan/70 underline-offset-2 hover:underline"
                                    >
                                      Ziel-URL öffnen
                                    </a>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  aria-label="Auftrag entfernen"
                                  disabled={deletingId === order.id}
                                  onClick={() => void deleteOrder(order.id)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-white/45 transition hover:border-rose-300/40 hover:text-rose-100 disabled:opacity-40"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {review ? (
              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h2 className="text-sm font-medium text-white/85">
                  Prüfung & Zusammenfassung
                </h2>
                <p className="mt-1 text-xs text-white/35">
                  SynSight-Machbarkeit, Vollmacht und SynCredits-Kosten.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryStat
                    label="Ausgewählt"
                    value={String(review.summary.selectedCount)}
                  />
                  <SummaryStat
                    label="Machbar"
                    value={String(review.summary.capableCount)}
                  />
                  <SummaryStat
                    label="Vollmacht fehlt"
                    value={String(review.summary.vollmachtMissingCount)}
                  />
                  <SummaryStat
                    label="SynCredits"
                    value={String(review.summary.totalCredits)}
                  />
                </div>

                {review.summary.blockers.length > 0 ? (
                  <ul className="mt-4 space-y-1 text-xs text-amber-100/70">
                    {review.summary.blockers.map((blocker) => (
                      <li key={blocker}>• {blocker}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-emerald-100/70">
                    Alle Prüfungen bestanden — Auftrag kann abgeschickt werden.
                  </p>
                )}

                <ul className="mt-5 space-y-2">
                  {review.items.map((item) => (
                    <ReviewItemRow key={item.orderId} item={item} />
                  ))}
                </ul>

                {vollmachtItems.length > 0 ? (
                  <div className="mt-6 border-t border-white/[0.06] pt-5">
                    <h3 className="text-sm font-medium text-white/80">
                      Vollmachten
                    </h3>
                    <p className="mt-1 text-xs text-white/35">
                      Vorlage erzeugen, ausdrucken/unterschreiben und
                      unterschrieben hochladen (PDF oder Bild).
                    </p>
                    <ul className="mt-4 space-y-3">
                      {vollmachtItems.map((item) => (
                        <li
                          key={`vm-${item.orderId}`}
                          className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3"
                        >
                          <p className="text-sm text-white/80">
                            #{item.orderId} · {item.title}
                          </p>
                          <p className="mt-1 font-mono text-[9px] text-white/35">
                            Status: {item.vollmachtStatus.toUpperCase()}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void generateVollmacht(item.orderId)
                              }
                              className="rounded-lg border border-amber-300/30 bg-amber-300/[0.08] px-3 py-1.5 font-mono text-[9px] tracking-[.12em] text-amber-100/85"
                            >
                              VORLAGE ERZEUGEN
                            </button>
                            <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 font-mono text-[9px] tracking-[.12em] text-white/55 hover:text-white/80">
                              {uploadBusyId === item.orderId
                                ? "LADE HOCH …"
                                : "UNTERSCHRIEBEN HOCHLADEN"}
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={uploadBusyId === item.orderId}
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

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("select");
                      setReview(null);
                    }}
                    className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[.12em] text-white/50"
                  >
                    ZURÜCK
                  </button>
                  <button
                    type="button"
                    disabled={busy || !review.summary.canSubmit}
                    onClick={() => {
                      setStep("submit");
                      void submitSelected();
                    }}
                    className="rounded-lg border border-emerald-300/35 bg-emerald-300/[0.1] px-4 py-2 font-mono text-[10px] tracking-[.14em] text-emerald-100 disabled:opacity-40"
                  >
                    {busy ? "SENDE …" : "AUFTRAG ABSCHICKEN"}
                  </button>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-sm font-medium text-white/85">
                Eingereichte / laufende Aufträge
              </h2>
              <p className="mt-1 text-xs text-white/35">
                Nach dem Absenden erscheinen Aufträge im Operations-Dashboard.
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[8px] text-white/30">
                            {(
                              MODULE_LABEL[order.sourceModule ?? ""] ??
                              "Analyse"
                            ).toUpperCase()}
                          </p>
                          <p className="mt-1 text-sm text-white/80">
                            {order.title}
                          </p>
                        </div>
                        <span className="rounded-md border border-emerald-300/25 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] text-emerald-100/80">
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-3">
      <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-lg text-white/85">{value}</p>
    </div>
  );
}

function ReviewItemRow({ item }: { item: OrderReviewItem }) {
  return (
    <li className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-white/80">{item.title}</p>
          <p className="mt-1 font-mono text-[9px] text-white/35">
            {item.sourceModuleLabel} · {item.orderTypeLabel} · {item.credits} SC
          </p>
          <p className="mt-1 text-xs text-white/40">{item.capabilityReason}</p>
        </div>
        <span
          className={`rounded border px-2 py-1 font-mono text-[9px] ${
            item.capable
              ? "border-emerald-300/30 text-emerald-100/80"
              : "border-rose-300/30 text-rose-100/80"
          }`}
        >
          {item.capable ? "MACHBAR" : "NICHT MÖGLICH"}
        </span>
      </div>
    </li>
  );
}
