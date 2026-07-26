"use client";

import { useEffect, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

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

export default function OrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setOrders(body.data.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

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
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          DASHBOARD / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Meine Aufträge
        </h1>
        <p className="mt-2 text-sm text-white/40">
          SynSight-Übernahmen aus allen Analysen (Google, Username, …) — derzeit
          kostenlos und ohne Zahlungsfunktion. Status: vorbereitet bis erledigt.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-100/80">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/35">Aufträge werden geladen…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-8 text-sm text-white/40">
          Noch keine Aufträge. In einer Analyse auf einer Trefferkarte „SynSight
          soll das übernehmen“ wählen.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    {(order.sourceModule
                      ? (MODULE_LABEL[order.sourceModule] ?? order.sourceModule)
                      : "Analyse"
                    ).toUpperCase()}
                    {" · "}
                    {order.orderType.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <h2 className="mt-1 text-sm font-medium text-white/85">
                    {order.title}
                  </h2>
                  <p className="mt-1 text-xs text-white/40">
                    {order.hitPlatform}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-300/25 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] text-emerald-100/80">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <button
                    type="button"
                    aria-label="Auftrag löschen"
                    title="Auftrag löschen"
                    disabled={deletingId === order.id}
                    onClick={() => void deleteOrder(order.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-white/45 transition hover:border-rose-300/40 hover:bg-rose-400/[0.08] hover:text-rose-100 disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              </div>
              {order.hitUrl ? (
                <a
                  href={order.hitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex font-mono text-[11px] text-cyber-cyan/70 underline-offset-2 hover:underline"
                >
                  Ziel-URL öffnen
                </a>
              ) : null}
              <p className="mt-2 font-mono text-[9px] text-white/25">
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.createdAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
