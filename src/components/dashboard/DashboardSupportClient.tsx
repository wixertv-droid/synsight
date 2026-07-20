"use client";

import { useCallback, useEffect, useState } from "react";
import SupportStatusIndicator from "@/components/support/SupportStatusIndicator";
import SupportTicketForm from "@/components/support/SupportTicketForm";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface TicketRow {
  id: number;
  ticketNumber: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function DashboardSupportClient({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/support/tickets");
      const body = await response.json();
      if (body.success) setTickets(body.data.tickets);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <span className="hud-label">Plattform / Support</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Support Center
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/40">
          Live-Status, Ticket erstellen und bisherige Anfragen einsehen.
        </p>
      </header>

      <SupportStatusIndicator />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="hardware-panel rounded-[1.2rem] border border-white/[0.08] p-6">
          <h2 className="text-lg font-medium text-white/85">Neues Ticket</h2>
          <p className="mt-2 text-sm text-white/35">
            Ihre Kontodaten werden automatisch verknüpft.
          </p>
          <div className="mt-5">
            <SupportTicketForm
              source="dashboard"
              initialName={user.displayName}
              initialEmail={user.email}
              onSuccess={() => void load()}
            />
          </div>
        </div>

        <div className="hardware-panel rounded-[1.2rem] border border-white/[0.08] p-6">
          <h2 className="text-lg font-medium text-white/85">Ihre Tickets</h2>
          {loading ? (
            <p className="mt-4 text-sm text-white/35">
              Tickets werden geladen…
            </p>
          ) : tickets.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/35">
              Noch keine Support-Tickets vorhanden.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-cyber-cyan/70">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{ticket.subject}</p>
                  <p className="mt-1 font-mono text-[9px] text-white/28">
                    {new Intl.DateTimeFormat("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(ticket.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
