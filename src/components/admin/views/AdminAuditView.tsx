"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AuditEvent {
  id: number;
  userId: number | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

function eventCategory(eventType: string): {
  label: string;
  className: string;
} {
  const value = eventType.toLowerCase();

  if (
    value.includes("login") ||
    value.includes("auth") ||
    value.includes("session") ||
    value.includes("password")
  ) {
    return {
      label: "ZUGRIFF",
      className: "border-cyber-cyan/20 bg-cyber-cyan/[0.04] text-cyber-cyan/70",
    };
  }

  if (
    value.includes("admin") ||
    value.includes("role") ||
    value.includes("credit") ||
    value.includes("verify")
  ) {
    return {
      label: "ADMIN",
      className: "border-amber-300/20 bg-amber-300/[0.04] text-amber-100/70",
    };
  }

  if (
    value.includes("delete") ||
    value.includes("suspend") ||
    value.includes("block") ||
    value.includes("fail") ||
    value.includes("error")
  ) {
    return {
      label: "PRÜFEN",
      className: "border-rose-300/20 bg-rose-300/[0.04] text-rose-100/70",
    };
  }

  return {
    label: "SYSTEM",
    className: "border-white/10 bg-white/[0.025] text-white/45",
  };
}

function friendlyEventType(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function AdminAuditView({ title }: { title: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/audit?limit=100", {
        cache: "no-store",
      });

      const body = await response.json().catch(() => null);

      if (response.ok && body?.success) {
        setEvents(body.data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const users = new Set(
      events
        .map((event) => event.userId)
        .filter((value): value is number => value !== null)
    );

    const ips = new Set(
      events
        .map((event) => event.ipAddress)
        .filter((value): value is string => Boolean(value))
    );

    const review = events.filter(
      (event) => eventCategory(event.eventType).label === "PRÜFEN"
    ).length;

    return {
      events: events.length,
      users: users.size,
      ips: ips.size,
      review,
    };
  }, [events]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return events.filter((event) => {
      const eventCat = eventCategory(event.eventType).label.toLowerCase();

      if (category !== "all" && eventCat !== category) {
        return false;
      }

      if (!needle) return true;

      return [
        event.eventType,
        event.userId,
        event.entityType,
        event.entityId,
        event.ipAddress,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(needle));
    });
  }, [events, query, category]);

  if (loading && events.length === 0) {
    return <p className="text-sm text-white/40">Ereignisse werden geladen…</p>;
  }

  return (
    <div className="space-y-5">
      <section className="intel-cyber-hud relative overflow-hidden rounded-[1.3rem] border border-cyber-cyan/20 bg-[#050b14]/95 p-5">
        <div className="intel-cyber-scanlines" aria-hidden="true" />

        <div className="relative z-[1]">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
            SECURITY AUDIT CENTER
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white/90">{title}</h2>

          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/45">
            Die letzten administrativen und sicherheitsrelevanten Ereignisse
            nachvollziehen. Audit-Einträge dienen zur Kontrolle und
            Ursachenanalyse – sie ändern selbst keine Konten oder Einstellungen.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Ereignisse", stats.events],
              ["Benutzer", stats.users],
              ["IP-Adressen", stats.ips],
              ["Prüfhinweise", stats.review],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border border-white/[0.07] bg-black/25 p-4"
              >
                <p className="font-mono text-[8px] text-white/30">
                  {String(label).toUpperCase()}
                </p>

                <p className="mt-2 text-xl font-semibold text-white/85">
                  {value}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Event, User-ID, IP oder Objekt suchen…"
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/70"
          >
            <option value="all">Alle Kategorien</option>
            <option value="zugriff">Zugriff / Login</option>
            <option value="admin">Admin-Aktionen</option>
            <option value="prüfen">Prüfhinweise</option>
            <option value="system">System / Sonstige</option>
          </select>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-cyber-cyan/25 px-4 py-2 text-xs text-cyber-cyan/70"
          >
            Aktualisieren
          </button>
        </div>

        <p className="mt-3 text-xs text-white/35">
          {filtered.length} von {events.length} Einträgen sichtbar.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.03] p-4">
          <p className="font-mono text-[8px] text-cyber-cyan/55">ZUGRIFF</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Login-, Session-, Auth- und Passwort-Ereignisse.
          </p>
        </article>

        <article className="rounded-xl border border-amber-300/15 bg-amber-300/[0.03] p-4">
          <p className="font-mono text-[8px] text-amber-100/55">ADMIN</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Administrative Änderungen wie Rollen, Verifizierung oder Guthaben.
          </p>
        </article>

        <article className="rounded-xl border border-rose-300/15 bg-rose-300/[0.03] p-4">
          <p className="font-mono text-[8px] text-rose-100/55">PRÜFEN</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Ereignisse mit Schlüsselwörtern wie Fehler, Sperrung oder Löschung.
            Diese Kennzeichnung ist ein Hinweis und kein automatischer
            Sicherheitsalarm.
          </p>
        </article>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/40">
          Keine passenden Audit-Ereignisse gefunden.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((event) => {
            const cat = eventCategory(event.eventType);

            return (
              <li
                key={event.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[8px] ${cat.className}`}
                      >
                        {cat.label}
                      </span>

                      <span className="font-mono text-[10px] text-cyber-cyan/70">
                        {friendlyEventType(event.eventType)}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] text-white/55">
                      Benutzer #{event.userId ?? "—"}
                      {event.entityType ? ` · ${event.entityType}` : ""}
                      {event.entityId ? ` #${event.entityId}` : ""}
                    </p>

                    {event.ipAddress ? (
                      <p className="mt-1 font-mono text-[10px] text-white/30">
                        IP · {event.ipAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-[9px] text-white/30">
                      {new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(event.createdAt))}
                    </p>

                    <p className="mt-1 font-mono text-[8px] text-white/20">
                      Event #{event.id}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
