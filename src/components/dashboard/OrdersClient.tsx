"use client";

import { useEffect, useState } from "react";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";

interface OrderRow {
  id: number;
  hitPlatform: string;
  hitUrl: string | null;
  title: string;
  orderType: string;
  status: SynSightOrderStatus;
  createdAt: string;
}

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

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setOrders(body.data.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

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
          SynSight-Übernahmen aus Username Intelligence — derzeit kostenlos und
          ohne Zahlungsfunktion. Status: vorbereitet bis erledigt.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-white/35">Aufträge werden geladen…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-8 text-sm text-white/40">
          Noch keine Aufträge. Im Username Intelligence Report bei einer
          Maßnahme „SynSight soll das übernehmen“ wählen.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    {order.orderType.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <h2 className="mt-1 text-sm font-medium text-white/85">
                    {order.title}
                  </h2>
                  <p className="mt-1 text-xs text-white/40">
                    {order.hitPlatform}
                  </p>
                </div>
                <span className="rounded-md border border-emerald-300/25 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] text-emerald-100/80">
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
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
