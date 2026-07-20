"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminUserOverviewStats } from "@/lib/repositories/admin-repository";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
      <p className="font-mono text-[8px] tracking-[.13em] text-white/28">
        {label.toUpperCase()}
      </p>
      <p className="mt-3 text-2xl font-medium text-white/82">{value}</p>
      {hint ? <p className="mt-2 text-[10px] text-white/30">{hint}</p> : null}
    </article>
  );
}

export default function AdminUserOverviewView({
  initialStats,
}: {
  initialStats?: AdminUserOverviewStats | null;
}) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    if (initialStats) return;
    fetch("/api/admin/users/overview")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setStats(body.data.stats);
      })
      .catch(() => undefined);
  }, [initialStats]);

  if (!stats) {
    return <p className="text-sm text-white/40">Statistiken werden geladen…</p>;
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Benutzer gesamt" value={stats.usersTotal} />
      <StatCard
        label="Registrierungen heute"
        value={stats.registrationsToday}
      />
      <StatCard label="Diese Woche" value={stats.registrationsThisWeek} />
      <StatCard label="Diesen Monat" value={stats.registrationsThisMonth} />
      <StatCard label="Verifiziert" value={stats.verifiedUsers} />
      <StatCard label="Nicht verifiziert" value={stats.unverifiedUsers} />
      <StatCard label="Aktive Benutzer" value={stats.activeUsers} />
      <StatCard label="Gesperrt" value={stats.blockedUsers} />
      <StatCard label="Administratoren" value={stats.administratorsTotal} />
      <StatCard
        label="Support"
        value={stats.supportStaffTotal}
        hint="Rollenmodell folgt"
      />
      <StatCard
        label="Moderatoren"
        value={stats.moderatorsTotal}
        hint="Rollenmodell folgt"
      />
      <StatCard label="Ø SynCredits" value={stats.averageSynCredits} />
      <StatCard
        label="Letzte Anmeldung"
        value={
          stats.lastLoginAt
            ? new Intl.DateTimeFormat("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(stats.lastLoginAt))
            : "—"
        }
      />
    </section>
  );
}

export function AdminUserTable() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<
    Array<{
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
      status: string;
      role: string;
      verified: boolean;
      lastLoginAt: string | null;
      createdAt: string;
      synCredits: number;
      riskScore: number | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/list?q=${encodeURIComponent(search)}&limit=50`
      );
      const body = await response.json();
      if (body.success) setUsers(body.data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void load(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Suche: Name, E-Mail, ID, Alias…"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
        >
          Suchen
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[8px] tracking-[.12em] text-white/35">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">E-Mail</th>
              <th className="px-3 py-3">Registriert</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Verifiziert</th>
              <th className="px-3 py-3">Admin</th>
              <th className="px-3 py-3">Letzter Login</th>
              <th className="px-3 py-3">Risiko</th>
              <th className="px-3 py-3">SynCredits</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 text-white/75">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-white/45">
                  {user.id}
                </td>
                <td className="px-3 py-3 text-white/60">{user.email}</td>
                <td className="px-3 py-3 text-white/45">
                  {new Intl.DateTimeFormat("de-DE").format(
                    new Date(user.createdAt)
                  )}
                </td>
                <td className="px-3 py-3">{user.status}</td>
                <td className="px-3 py-3">{user.verified ? "Ja" : "Nein"}</td>
                <td className="px-3 py-3">
                  {user.role === "admin" ? "Ja" : "Nein"}
                </td>
                <td className="px-3 py-3 text-white/45">
                  {user.lastLoginAt
                    ? new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(user.lastLoginAt))
                    : "—"}
                </td>
                <td className="px-3 py-3">{user.riskScore ?? "—"}</td>
                <td className="px-3 py-3 text-cyber-cyan/80">
                  {user.synCredits}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/benutzer/profil/${user.id}`}
                    className="rounded border border-cyber-cyan/30 px-2 py-1 text-xs text-cyber-cyan hover:border-cyber-cyan/50"
                  >
                    Profil öffnen
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
