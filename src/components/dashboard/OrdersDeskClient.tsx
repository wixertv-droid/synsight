"use client";

import { useEffect, useMemo, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

interface DeskOrder {
  id: number;
  userId: number;
  sourceModule: string;
  hitPlatform: string;
  hitUrl: string | null;
  title: string;
  orderType: string;
  status: SynSightOrderStatus;
  note: string | null;
  creditsCharged?: number | null;
  submittedAt?: string | null;
  createdAt: string;
  userEmail?: string | null;
  username?: string | null;
}

const STATUS_SECTIONS: Array<{
  id: SynSightOrderStatus | "neu";
  title: string;
  hint: string;
  match: (order: DeskOrder) => boolean;
}> = [
  {
    id: "neu",
    title: "Neue Aufträge",
    hint: "Frisch eingereicht — Status offen.",
    match: (order) => order.status === "offen",
  },
  {
    id: "in_bearbeitung",
    title: "In Bearbeitung",
    hint: "Aktive Fälle.",
    match: (order) => order.status === "in_bearbeitung",
  },
  {
    id: "erledigt",
    title: "Erledigt",
    hint: "Abgeschlossene Aufträge.",
    match: (order) => order.status === "erledigt",
  },
  {
    id: "abgelehnt",
    title: "Abgelehnt",
    hint: "Nicht umsetzbar oder zurückgewiesen.",
    match: (order) => order.status === "abgelehnt",
  },
];

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  erledigt: "Erledigt",
  abgelehnt: "Abgelehnt",
};

export default function OrdersDeskClient() {
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/desk");
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sections = useMemo(
    () =>
      STATUS_SECTIONS.map((section) => ({
        ...section,
        orders: orders.filter(section.match),
      })),
    [orders]
  );

  async function setStatus(
    orderId: number,
    status: "offen" | "in_bearbeitung" | "erledigt" | "abgelehnt"
  ) {
    setUpdatingId(orderId);
    setError(null);
    try {
      const response = await fetch("/api/orders/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Status konnte nicht geändert werden.");
        return;
      }
      await load();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="mx-auto flex max-h-[calc(100vh-6.5rem)] max-w-5xl flex-col overflow-hidden">
      <header className="mb-8 shrink-0">
        <p className="font-mono text-[8px] tracking-[.16em] text-amber-200/50">
          OPERATIONS / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Auftragsübersicht
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/40">
          Eingereichte Aufträge von Nutzern — neue, offene und laufende Fälle
          für Admin und Worker.
        </p>
      </header>

      {error ? (
        <p className="mb-4 shrink-0 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-100/80">
          {error}
        </p>
      ) : null}

      <div className="synsight-orders-scroll min-h-0 flex-1 overflow-y-auto pr-2">
        {loading ? (
          <p className="text-sm text-white/35">Laden…</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section) => (
              <section
                key={section.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-white/85">
                      {section.title}
                    </h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/35">
                      {section.hint}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[9px] tracking-[.12em] text-white/30">
                    {section.orders.length}
                  </span>
                </div>

                {section.orders.length === 0 ? (
                  <div className="mt-5 flex min-h-[88px] items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-black/20">
                    <p className="font-mono text-[9px] tracking-[.14em] text-white/22">
                      KEINE AUFTRÄGE
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {section.orders.map((order) => (
                      <li
                        key={order.id}
                        className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-3"
                      >
                        <p className="text-sm text-white/85">{order.title}</p>
                        <p className="mt-1 font-mono text-[9px] text-white/35">
                          #{order.id} · {order.orderType} ·{" "}
                          {order.username ||
                            order.userEmail ||
                            `User ${order.userId}`}
                          {order.creditsCharged != null
                            ? ` · ${order.creditsCharged} SC`
                            : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-white/40">
                          {order.hitPlatform}
                          {order.hitUrl ? " · URL vorhanden" : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(
                            [
                              "offen",
                              "in_bearbeitung",
                              "erledigt",
                              "abgelehnt",
                            ] as const
                          ).map((status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={
                                updatingId === order.id ||
                                order.status === status
                              }
                              onClick={() => void setStatus(order.id, status)}
                              className={`rounded border px-2 py-1 font-mono text-[8px] tracking-[.1em] transition disabled:opacity-40 ${
                                order.status === status
                                  ? "border-amber-300/40 text-amber-100/90"
                                  : "border-white/10 text-white/40 hover:text-white/70"
                              }`}
                            >
                              {STATUS_LABEL[status]}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
