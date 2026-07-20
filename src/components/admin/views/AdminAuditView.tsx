"use client";

import { useCallback, useEffect, useState } from "react";

interface AuditEvent {
  id: number;
  userId: number | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditView({ title }: { title: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/audit?limit=100");
      const body = await response.json();
      if (body.success) setEvents(body.data.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-white/40">Ereignisse werden geladen…</p>;
  }

  return (
    <section className="space-y-4">
      <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
        {title.toUpperCase()} · {events.length} EINTRÄGE
      </p>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/40">
          Noch keine Audit-Ereignisse vorhanden.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-cyber-cyan/70">
                  {event.eventType}
                </span>
                <span className="font-mono text-[9px] text-white/30">
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-white/55">
                User #{event.userId ?? "—"}
                {event.entityType ? ` · ${event.entityType}` : ""}
                {event.entityId ? ` #${event.entityId}` : ""}
              </p>
              {event.ipAddress ? (
                <p className="mt-1 font-mono text-[10px] text-white/30">
                  IP {event.ipAddress}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
