"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type UserRole = "user" | "support" | "worker" | "admin";

type UserRow = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  status: string;
  role: UserRole;
  verified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  synCredits: number;
};

type RoleDefinition = {
  role: UserRole;
  label: string;
  description: string;
  access: string[];
};

const roleTone: Record<UserRole, string> = {
  user: "border-white/10 text-white/55",
  support: "border-cyan-400/25 text-cyan-100/75",
  worker: "border-violet-400/25 text-violet-100/75",
  admin: "border-amber-400/25 text-amber-100/80",
};

function userName(user: UserRow) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email
  );
}

export default function AdminUserAccessControl({
  verificationOnly = false,
}: {
  verificationOnly?: boolean;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);

  const [roles, setRoles] = useState<RoleDefinition[]>([]);

  const [query, setQuery] = useState("");

  const [busy, setBusy] = useState<number | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      q: query,
      limit: "100",
    });

    if (verificationOnly) {
      params.set("status", "pending_verification");
    }

    const [usersResponse, rolesResponse] = await Promise.all([
      fetch(`/api/admin/users/list?${params.toString()}`),
      fetch("/api/admin/users/access"),
    ]);

    const usersBody = await usersResponse.json().catch(() => null);

    const rolesBody = await rolesResponse.json().catch(() => null);

    if (usersResponse.ok && usersBody?.success) {
      setUsers(usersBody.data.users);
    }

    if (rolesResponse.ok && rolesBody?.success) {
      setRoles(rolesBody.data.roles);
    }
  }, [query, verificationOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(
    userId: number,
    payload: Record<string, unknown>,
    successMessage: string
  ) {
    setBusy(userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/users/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          ...payload,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(body?.error?.message ?? "Aktion fehlgeschlagen.");
        return;
      }

      setMessage(successMessage);

      await load();
    } finally {
      setBusy(null);
    }
  }

  if (verificationOnly) {
    return (
      <div className="space-y-5">
        <section className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
            E-MAIL-VERIFIZIERUNG
          </p>

          <h2 className="mt-2 text-lg font-medium text-white/80">
            Offene Verifizierungen
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40">
            Hier sehen Sie Konten, deren E-Mail-Adresse noch nicht bestätigt
            wurde. Sie können eine neue Verifizierungsmail senden oder das Konto
            nach manueller Prüfung selbst freischalten.
          </p>
        </section>

        {message ? (
          <p className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/70">
            ✓ {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/70">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="rounded-xl border border-white/[0.07] p-6 text-center text-sm text-white/35">
              Keine offenen Verifizierungen.
            </div>
          ) : (
            users.map((user) => (
              <article
                key={user.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white/75">
                      {userName(user)}
                    </div>

                    <div className="mt-1 text-xs text-white/35">
                      #{user.id} · {user.email}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() =>
                        void action(
                          user.id,
                          {
                            action: "resend_verification",
                          },
                          `Verifizierung für ${user.email} wurde erneut versendet.`
                        )
                      }
                      className="rounded-lg border border-cyber-cyan/20 px-3 py-2 text-xs text-cyan-100/65"
                    >
                      E-Mail erneut senden
                    </button>

                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `${user.email} wirklich manuell verifizieren?`
                          )
                        ) {
                          return;
                        }

                        void action(
                          user.id,
                          {
                            action: "verify",
                          },
                          `${user.email} wurde manuell verifiziert.`
                        );
                      }}
                      className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] px-3 py-2 text-xs text-emerald-100/70"
                    >
                      Manuell verifizieren
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyber-cyan/15 bg-[#060d16]/90 p-5">
        <p className="font-mono text-[9px] tracking-[.15em] text-cyber-cyan/55">
          ROLE BASED ACCESS CONTROL
        </p>

        <h2 className="mt-2 text-lg font-medium text-white/82">
          Rollen & Berechtigungen
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40">
          SynSight verwendet ein festes Rollenmodell. Dadurch bleiben Rechte
          nachvollziehbar und ein Mitarbeiter erhält nicht versehentlich
          einzelne gefährliche Sonderrechte.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roles.map((role) => (
            <article
              key={role.role}
              className={`rounded-xl border bg-black/20 p-4 ${roleTone[role.role]}`}
            >
              <div className="font-mono text-[9px] uppercase tracking-[.12em]">
                {role.label}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-white/40">
                {role.description}
              </p>

              <ul className="mt-3 space-y-1">
                {role.access.map((item) => (
                  <li key={item} className="text-[10px] text-white/30">
                    ✓ {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {message ? (
        <p className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/70">
          ✓ {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Benutzer, Name, E-Mail oder ID suchen…"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/75 outline-none focus:border-cyber-cyan/35"
        />

        <button
          type="submit"
          className="rounded-lg border border-cyber-cyan/25 px-4 py-2 text-sm text-cyan-100/65"
        >
          Suchen
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[8px] tracking-[.12em] text-white/30">
            <tr>
              <th className="px-4 py-3">Benutzer</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Konto</th>
              <th className="px-4 py-3">Verifiziert</th>
              <th className="px-4 py-3">Sitzungen</th>
              <th className="px-4 py-3">Profil</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/[0.04]">
                <td className="px-4 py-4">
                  <div className="text-sm text-white/70">{userName(user)}</div>

                  <div className="mt-1 text-[10px] text-white/30">
                    #{user.id} · {user.email}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <select
                    value={user.role}
                    disabled={busy === user.id}
                    onChange={(event) => {
                      const role = event.target.value as UserRole;

                      if (
                        !window.confirm(
                          `Rolle von ${user.email} wirklich auf „${role}“ ändern?\n\nBestehende Sitzungen werden beendet.`
                        )
                      ) {
                        return;
                      }

                      void action(
                        user.id,
                        {
                          action: "role",
                          role,
                        },
                        `Rolle von ${user.email} wurde geändert.`
                      );
                    }}
                    className="rounded-lg border border-white/10 bg-[#071018] px-3 py-2 text-xs text-white/70 [color-scheme:dark]"
                  >
                    {roles.map((role) => (
                      <option key={role.role} value={role.role}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-4">
                  {user.status === "suspended" ? (
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() =>
                        void action(
                          user.id,
                          {
                            action: "status",
                            status: "active",
                          },
                          `${user.email} wurde entsperrt.`
                        )
                      }
                      className="rounded-lg border border-emerald-400/25 px-3 py-2 text-xs text-emerald-100/65"
                    >
                      Entsperren
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `${user.email} wirklich sperren?\n\nAlle aktiven Sitzungen werden beendet.`
                          )
                        ) {
                          return;
                        }

                        void action(
                          user.id,
                          {
                            action: "status",
                            status: "suspended",
                          },
                          `${user.email} wurde gesperrt.`
                        );
                      }}
                      className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-100/55"
                    >
                      Sperren
                    </button>
                  )}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={
                      user.verified
                        ? "text-xs text-emerald-100/65"
                        : "text-xs text-amber-100/60"
                    }
                  >
                    {user.verified ? "✓ Ja" : "○ Offen"}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    disabled={busy === user.id}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Alle Sitzungen von ${user.email} beenden?`
                        )
                      ) {
                        return;
                      }

                      void action(
                        user.id,
                        {
                          action: "revoke_sessions",
                        },
                        `Alle Sitzungen von ${user.email} wurden beendet.`
                      );
                    }}
                    className="text-xs text-white/45 hover:text-white/70"
                  >
                    Alle beenden
                  </button>
                </td>

                <td className="px-4 py-4">
                  <Link
                    href={`/admin/benutzer/profil/${user.id}`}
                    className="text-xs text-cyber-cyan/60 hover:text-cyber-cyan"
                  >
                    Profil öffnen →
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
