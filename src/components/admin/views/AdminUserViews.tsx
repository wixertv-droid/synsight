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
        hint="Support-Mitarbeiter"
      />
      <StatCard
        label="Worker"
        value={stats.workerStaffTotal}
        hint="Interne Auftragsbearbeitung"
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

export function AdminUserTable({
  statusFilter,
  profileHrefBase = "/admin/benutzer/profil",
}: {
  statusFilter?: string;
  profileHrefBase?: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(statusFilter ?? "");
  const [verified, setVerified] = useState("");
  const [sort, setSort] = useState<"id" | "created" | "login" | "credits">(
    "id"
  );
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<
    Array<{
      id: number;
      email: string;
      username: string;
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        limit: String(limit),
        sort,
        direction,
      });

      if (role) params.set("role", role);
      if (status) params.set("status", status);

      const response = await fetch(
        `/api/admin/users/list?${params.toString()}`
      );

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ?? "Benutzer konnten nicht geladen werden."
        );
        return;
      }

      let rows = body.data.users as typeof users;

      if (verified === "yes") {
        rows = rows.filter((user) => user.verified);
      }

      if (verified === "no") {
        rows = rows.filter((user) => !user.verified);
      }

      setUsers(rows);
      setTotal(Number(body.data.total ?? 0));
    } catch {
      setError("Verbindung zur Benutzerverwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [query, role, status, verified, sort, direction, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function resetFilters() {
    setQuery("");
    setRole("");
    setStatus(statusFilter ?? "");
    setVerified("");
    setSort("id");
    setDirection("desc");
    setPage(1);
    setLimit(25);
  }

  function roleLabel(value: string) {
    switch (value) {
      case "admin":
        return "Administrator";
      case "support":
        return "Support";
      case "worker":
        return "Worker";
      default:
        return "Benutzer";
    }
  }

  function statusLabel(value: string) {
    switch (value) {
      case "active":
        return "Aktiv";
      case "suspended":
        return "Gesperrt";
      case "pending_verification":
        return "Verifizierung offen";
      case "deleted":
        return "Gelöscht";
      default:
        return value;
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <div className="grid gap-3 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/28">
              Suche
            </span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Name, E-Mail, Benutzername oder ID…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </label>

          <label>
            <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/28">
              Rolle
            </span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75 [color-scheme:dark]"
            >
              <option value="">Alle Rollen</option>
              <option value="user">Benutzer</option>
              <option value="support">Support</option>
              <option value="worker">Worker</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <label>
            <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/28">
              Status
            </span>
            <select
              value={status}
              disabled={Boolean(statusFilter)}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75 disabled:opacity-50 [color-scheme:dark]"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="pending_verification">Verifizierung offen</option>
              <option value="suspended">Gesperrt</option>
              <option value="deleted">Gelöscht</option>
            </select>
          </label>

          <label>
            <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/28">
              E-Mail
            </span>
            <select
              value={verified}
              onChange={(event) => {
                setVerified(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75 [color-scheme:dark]"
            >
              <option value="">Alle</option>
              <option value="yes">Verifiziert</option>
              <option value="no">Nicht verifiziert</option>
            </select>
          </label>

          <label>
            <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/28">
              Sortierung
            </span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(
                  event.target.value as "id" | "created" | "login" | "credits"
                );
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75 [color-scheme:dark]"
            >
              <option value="id">Benutzer-ID</option>
              <option value="created">Registrierung</option>
              <option value="login">Letzter Login</option>
              <option value="credits">SynCredits</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setDirection((current) => (current === "desc" ? "asc" : "desc"))
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50"
            >
              {direction === "desc" ? "↓ Absteigend" : "↑ Aufsteigend"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/40"
            >
              Filter zurücksetzen
            </button>
          </div>

          <div className="font-mono text-[9px] text-white/30">
            {total.toLocaleString("de-DE")} Benutzer gefunden
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[8px] tracking-[.12em] text-white/35">
            <tr>
              <th className="px-3 py-3">Benutzer</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Rolle</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">E-Mail</th>
              <th className="px-3 py-3">Registriert</th>
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
                <td className="px-3 py-3">
                  <div className="text-white/75">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                      user.username ||
                      "—"}
                  </div>
                  <div className="mt-1 text-[10px] text-white/30">
                    {user.email}
                  </div>
                </td>

                <td className="px-3 py-3 font-mono text-xs text-white/45">
                  #{user.id}
                </td>

                <td className="px-3 py-3">
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55">
                    {roleLabel(user.role)}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] ${
                      user.status === "active"
                        ? "border-emerald-400/20 text-emerald-100/65"
                        : user.status === "suspended"
                          ? "border-rose-400/20 text-rose-100/65"
                          : "border-amber-400/20 text-amber-100/65"
                    }`}
                  >
                    {statusLabel(user.status)}
                  </span>
                </td>

                <td className="px-3 py-3">
                  {user.verified ? (
                    <span className="text-xs text-emerald-100/65">
                      ✓ Verifiziert
                    </span>
                  ) : (
                    <span className="text-xs text-amber-100/60">○ Offen</span>
                  )}
                </td>

                <td className="px-3 py-3 text-white/40">
                  {new Intl.DateTimeFormat("de-DE").format(
                    new Date(user.createdAt)
                  )}
                </td>

                <td className="px-3 py-3 text-white/40">
                  {user.lastLoginAt
                    ? new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(user.lastLoginAt))
                    : "—"}
                </td>

                <td className="px-3 py-3">{user.riskScore ?? "—"}</td>

                <td className="px-3 py-3 font-mono text-cyber-cyan/80">
                  {user.synCredits.toLocaleString("de-DE")}
                </td>

                <td className="px-3 py-3">
                  <Link
                    href={`${profileHrefBase}/${user.id}`}
                    className="rounded-lg border border-cyber-cyan/25 px-3 py-2 text-xs text-cyber-cyan/70 hover:border-cyber-cyan/50"
                  >
                    Öffnen →
                  </Link>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-white/30"
                >
                  Keine Benutzer für diese Filter gefunden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 disabled:opacity-30"
          >
            ← Zurück
          </button>

          <span className="font-mono text-[10px] text-white/35">
            Seite {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 disabled:opacity-30"
          >
            Weiter →
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-white/35">
          Pro Seite
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-[#071018] px-2 py-1.5 text-white/60 [color-scheme:dark]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}
