"use client";

import { useCallback, useEffect, useState } from "react";

interface TicketRow {
  id: number;
  ticketNumber: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
}

export default function AdminSupportTicketsView() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/support/tickets");
    const body = await response.json();
    if (body.success) setTickets(body.data.tickets);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateTicket(
    ticketId: number,
    patch: Record<string, string | null>
  ) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, patch }),
      });
      const body = await response.json();
      if (body.success) {
        await load();
        setSelected(body.data.ticket);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]">
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[8px] tracking-[.12em] text-white/35">
            <tr>
              <th className="px-3 py-3">Ticket</th>
              <th className="px-3 py-3">Betreff</th>
              <th className="px-3 py-3">Von</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Quelle</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 font-mono text-xs text-cyber-cyan/70">
                  {ticket.ticketNumber}
                </td>
                <td className="px-3 py-3 text-white/70">{ticket.subject}</td>
                <td className="px-3 py-3 text-white/45">
                  {ticket.name}
                  <br />
                  <span className="text-xs">{ticket.email}</span>
                </td>
                <td className="px-3 py-3">{ticket.status}</td>
                <td className="px-3 py-3">{ticket.source}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setSelected(ticket)}
                    className="rounded border border-cyber-cyan/30 px-2 py-1 text-xs text-cyber-cyan"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] text-cyber-cyan/70">
                {selected.ticketNumber}
              </p>
              <h3 className="mt-2 text-lg text-white/80">{selected.subject}</h3>
              <p className="mt-2 text-sm text-white/45">{selected.message}</p>
            </div>
            <label className="block">
              <span className="font-mono text-[8px] text-white/30">STATUS</span>
              <select
                value={selected.status}
                disabled={busy}
                onChange={(event) =>
                  void updateTicket(selected.id, { status: event.target.value })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
              >
                {["new", "open", "waiting", "resolved", "closed"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[8px] text-white/30">
                PRIORITÄT
              </span>
              <select
                value={selected.priority}
                disabled={busy}
                onChange={(event) =>
                  void updateTicket(selected.id, {
                    priority: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
              >
                {["low", "normal", "high", "urgent"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="text-sm text-white/35">
            Wählen Sie ein Ticket aus der Liste.
          </p>
        )}
      </aside>
    </div>
  );
}
