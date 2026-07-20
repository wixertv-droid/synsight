"use client";

import { useCallback, useEffect, useState } from "react";

interface UserRow {
  id: number;
  email: string;
  role: "admin" | "support" | "user";
}

export default function AdminUserRolesView() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users/roles");
    const body = await response.json();
    if (body.success) setUsers(body.data.users);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateRole(userId: number, role: UserRow["role"]) {
    setBusyId(userId);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setMessage(
          body.error?.message ?? "Rolle konnte nicht gespeichert werden."
        );
        return;
      }
      setMessage(`Rolle für ${body.data.user.email} aktualisiert.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">
        Support-Mitarbeiter sehen nur den Bereich A4 Support im Admin-Panel.
      </p>
      {message ? <p className="text-sm text-cyber-cyan/75">{message}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[8px] tracking-[.12em] text-white/35">
            <tr>
              <th className="px-3 py-3">E-Mail</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Rolle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 text-white/70">{user.email}</td>
                <td className="px-3 py-3 font-mono text-xs text-white/40">
                  {user.id}
                </td>
                <td className="px-3 py-3">
                  <select
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={(event) =>
                      void updateRole(
                        user.id,
                        event.target.value as UserRow["role"]
                      )
                    }
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                  >
                    <option value="user">user</option>
                    <option value="support">support</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
