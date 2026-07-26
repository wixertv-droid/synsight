"use client";

import { useEffect, useMemo, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

interface DeskCustomer {
  userId: number;
  username: string | null;
  email: string | null;
  openCount: number;
  totalCount: number;
}

interface DeskOrder {
  id: number;
  userId: number;
  sourceModule: string;
  hitPlatform: string;
  hitUrl: string | null;
  title: string;
  orderType: string;
  status: SynSightOrderStatus;
  creditsCharged?: number | null;
  submittedAt?: string | null;
  createdAt: string;
}

interface DeskDetail {
  order: DeskOrder & {
    userEmail?: string | null;
    username?: string | null;
    note?: string | null;
    staffMessage?: string | null;
    requiresVollmacht?: boolean;
    capabilityOk?: boolean | null;
    capabilityReason?: string | null;
  };
  pricing: {
    label: string;
    credits: number;
    requiresVollmacht: boolean;
  } | null;
  vollmacht: {
    status: string;
    signedFileName: string | null;
    rejectReason: string | null;
  } | null;
  summaryPoints: string[];
}

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen / Neu",
  in_bearbeitung: "In Bearbeitung",
  erledigt: "Erledigt",
  abgelehnt: "Abgelehnt",
};

const STATUS_OPTIONS = [
  "offen",
  "in_bearbeitung",
  "erledigt",
  "abgelehnt",
] as const;

export default function OrdersDeskClient() {
  const [customers, setCustomers] = useState<DeskCustomer[]>([]);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/desk");
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Kunden konnten nicht geladen werden.");
        return;
      }
      setCustomers(body.data.customers ?? []);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUserOrders(userId: number) {
    setError(null);
    setSelectedOrderId(null);
    setDetail(null);
    try {
      const response = await fetch(`/api/orders/desk?userId=${userId}`);
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(
          body.error?.message ?? "Aufträge konnten nicht geladen werden."
        );
        return;
      }
      setOrders(body.data.orders ?? []);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    }
  }

  async function openOrder(orderId: number) {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/desk?orderId=${orderId}`);
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(
          body.error?.message ?? "Auftrag konnte nicht geöffnet werden."
        );
        return;
      }
      setDetail(body.data.detail);
      setRejectReason("");
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.userId === selectedUserId) ?? null,
    [customers, selectedUserId]
  );

  async function patch(payload: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Aktion fehlgeschlagen.");
        return;
      }
      setToast(okMessage);
      if (selectedOrderId) await openOrder(selectedOrderId);
      if (selectedUserId) await loadUserOrders(selectedUserId);
      await loadCustomers();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-h-[calc(100vh-6.5rem)] max-w-6xl flex-col overflow-hidden">
      <header className="mb-6 shrink-0">
        <p className="font-mono text-[8px] tracking-[.16em] text-amber-200/50">
          OPERATIONS / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Auftragsverwaltung
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/40">
          Zuerst Kunden wählen, dann einzelnen Auftrag öffnen — mit Problem,
          Zusammenfassung, Vollmacht-Prüfung und Status.
        </p>
      </header>

      <div className="synsight-orders-scroll grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-[240px_280px_1fr]">
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <h2 className="px-1 font-mono text-[9px] tracking-[.14em] text-white/35">
            KUNDEN
          </h2>
          {loading ? (
            <p className="mt-4 px-1 text-xs text-white/35">Laden…</p>
          ) : customers.length === 0 ? (
            <p className="mt-4 px-1 text-xs text-white/35">
              Noch keine eingereichten Aufträge.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {customers.map((customer) => {
                const active = selectedUserId === customer.userId;
                return (
                  <li key={customer.userId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(customer.userId);
                        void loadUserOrders(customer.userId);
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-amber-300/40 bg-amber-300/[0.08]"
                          : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                      }`}
                    >
                      <p className="truncate text-sm text-white/85">
                        {customer.username ||
                          customer.email ||
                          `User #${customer.userId}`}
                      </p>
                      <p className="mt-1 truncate font-mono text-[9px] text-white/30">
                        {customer.totalCount} Aufträge · {customer.openCount}{" "}
                        offen
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <h2 className="px-1 font-mono text-[9px] tracking-[.14em] text-white/35">
            AUFTRÄGE
          </h2>
          {!selectedUserId ? (
            <p className="mt-4 px-1 text-xs text-white/35">
              Links einen Kunden auswählen.
            </p>
          ) : orders.length === 0 ? (
            <p className="mt-4 px-1 text-xs text-white/35">Keine Aufträge.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {orders.map((order) => {
                const active = selectedOrderId === order.id;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => void openOrder(order.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-cyber-cyan/40 bg-cyber-cyan/[0.08]"
                          : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm text-white/85">
                        #{order.id} · {order.title}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-white/30">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          {!selectedOrderId ? (
            <div className="flex h-full min-h-[240px] items-center justify-center">
              <p className="text-sm text-white/35">
                Auftrag in der Mitte öffnen, um die Maske zu sehen.
              </p>
            </div>
          ) : detailLoading || !detail ? (
            <p className="text-sm text-white/35">Auftragsmaske lädt…</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
                  AUFTRAG #{detail.order.id}
                  {selectedCustomer
                    ? ` · ${selectedCustomer.username || selectedCustomer.email}`
                    : ""}
                </p>
                <h2 className="mt-2 text-xl font-medium text-white/90">
                  {detail.order.title}
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  Problem: {detail.pricing?.label ?? detail.order.orderType} auf{" "}
                  <span className="text-white/70">
                    {detail.order.hitPlatform}
                  </span>
                  {detail.order.hitUrl ? (
                    <>
                      {" "}
                      —{" "}
                      <a
                        href={detail.order.hitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-cyan/80 underline-offset-2 hover:underline"
                      >
                        Ziel öffnen
                      </a>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-black/25 p-4">
                <h3 className="font-mono text-[9px] tracking-[.12em] text-white/35">
                  KURZE ZUSAMMENFASSUNG
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-white/65">
                  {detail.summaryPoints.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-black/25 p-4">
                <h3 className="font-mono text-[9px] tracking-[.12em] text-white/35">
                  VOLLMACHT
                </h3>
                {!detail.order.requiresVollmacht &&
                !detail.pricing?.requiresVollmacht ? (
                  <p className="mt-3 text-sm text-white/50">
                    Für diesen Auftragstyp ist keine Vollmacht nötig.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-white/70">
                      Status:{" "}
                      <span className="text-white/90">
                        {detail.vollmacht?.status?.toUpperCase() ?? "FEHLT"}
                      </span>
                      {detail.vollmacht?.signedFileName
                        ? ` · Datei: ${detail.vollmacht.signedFileName}`
                        : ""}
                    </p>
                    {detail.vollmacht?.rejectReason ? (
                      <p className="text-sm text-rose-100/75">
                        Reklamation: {detail.vollmacht.rejectReason}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {detail.vollmacht?.signedFileName ? (
                        <a
                          href={`/api/orders/desk/${detail.order.id}/vollmacht`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-cyber-cyan/30 px-3 py-1.5 font-mono text-[9px] tracking-[.12em] text-cyber-cyan/85"
                        >
                          VOLLMACHT ANSEHEN
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy || !detail.vollmacht?.signedFileName}
                        onClick={() =>
                          void patch(
                            {
                              action: "verify_vollmacht",
                              orderId: detail.order.id,
                            },
                            "Vollmacht als korrekt markiert."
                          )
                        }
                        className="rounded-lg border border-emerald-300/30 px-3 py-1.5 font-mono text-[9px] tracking-[.12em] text-emerald-100/80 disabled:opacity-40"
                      >
                        ALS KORREKT BESTÄTIGEN
                      </button>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3">
                      <label className="block text-xs text-white/45">
                        Vollmacht reklamieren (Kunde erhält eine Meldung)
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          placeholder="z. B. Unterschrift fehlt / falsche Person / unleserlich …"
                          className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy || rejectReason.trim().length < 5}
                        onClick={() =>
                          void patch(
                            {
                              action: "reject_vollmacht",
                              orderId: detail.order.id,
                              reason: rejectReason.trim(),
                            },
                            "Vollmacht reklamiert — Kunde wurde benachrichtigt."
                          )
                        }
                        className="mt-2 rounded-lg border border-rose-300/35 bg-rose-400/[0.08] px-3 py-1.5 font-mono text-[9px] tracking-[.12em] text-rose-100/85 disabled:opacity-40"
                      >
                        REKLAMIEREN & KUNDE INFORMIEREN
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-black/25 p-4">
                <h3 className="font-mono text-[9px] tracking-[.12em] text-white/35">
                  STATUS ÄNDERN
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || detail.order.status === status}
                      onClick={() =>
                        void patch(
                          {
                            action: "status",
                            orderId: detail.order.id,
                            status,
                          },
                          `Status auf „${STATUS_LABEL[status]}“ gesetzt.`
                        )
                      }
                      className={`rounded-lg border px-3 py-2 font-mono text-[9px] tracking-[.12em] transition disabled:opacity-40 ${
                        detail.order.status === status
                          ? "border-amber-300/45 bg-amber-300/[0.1] text-amber-100"
                          : "border-white/12 text-white/45 hover:text-white/75"
                      }`}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {(error || toast) && (
        <div className="mt-4 shrink-0 space-y-2">
          {error ? (
            <p className="rounded-lg border border-rose-400/25 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-100/85">
              {error}
              <button
                type="button"
                className="ml-3 text-xs underline"
                onClick={() => setError(null)}
              >
                schließen
              </button>
            </p>
          ) : null}
          {toast ? (
            <p className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100/85">
              {toast}
              <button
                type="button"
                className="ml-3 text-xs underline"
                onClick={() => setToast(null)}
              >
                schließen
              </button>
            </p>
          ) : null}
        </div>
      )}
    </main>
  );
}
