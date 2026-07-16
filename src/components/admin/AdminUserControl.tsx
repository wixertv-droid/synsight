"use client";

import { FormEvent, useState } from "react";

interface UserSummary {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  publicAlias: string | null;
  aliases: string[];
  status: string;
  role: string;
}

interface UserDetail {
  user: UserSummary;
  credits: {
    balance: number;
    spentThisMonth: number;
    lifetimePurchased: number;
    lifetimeSpent: number;
    lifetimeBonus: number;
  };
  transactions: Array<{
    id: number;
    amount: number;
    description: string;
    balanceAfter: number;
    createdAt: string;
  }>;
}

type ApiEnvelope<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export default function AdminUserControl() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [operation, setOperation] = useState<"add" | "remove">("add");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query)}`
      );
      const result = (await response.json()) as ApiEnvelope<{
        users: UserSummary[];
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Suche fehlgeschlagen." : result.error.message
        );
        return;
      }
      setUsers(result.data.users);
      if (result.data.users.length === 0) {
        setMessage("Keine Benutzer gefunden.");
      }
    } catch {
      setMessage("Verbindung zum Admin-API fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function selectUser(userId: number) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/user/${userId}`);
      const result = (await response.json()) as ApiEnvelope<UserDetail>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Benutzer konnte nicht geladen werden."
            : result.error.message
        );
        return;
      }
      setSelected(result.data);
      setAmount("");
      setReason("");
      setConfirmed(false);
    } catch {
      setMessage("Verbindung zum Admin-API fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function adjust(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/credits/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.user.id,
          amount: Number(amount),
          reason,
          confirm: confirmed,
        }),
      });
      const result = (await response.json()) as ApiEnvelope<{
        balance: number;
        transactionId: number;
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Änderung fehlgeschlagen." : result.error.message
        );
        return;
      }
      setMessage(
        `Transaktion #${result.data.transactionId} gespeichert. Neues Guthaben: ${result.data.balance.toLocaleString("de-DE")} SynCredits.`
      );
      await selectUser(selected.user.id);
      setAmount("");
      setReason("");
      setConfirmed(false);
    } catch {
      setMessage("Verbindung zum Admin-API fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-[1.4rem] border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5 md:p-6"
      aria-labelledby="admin-credit-heading"
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
          IDENTITY ACCESS / CREDIT CONTROL
        </p>
        <h2
          id="admin-credit-heading"
          className="text-xl font-medium tracking-[-.02em] text-white/90"
        >
          SynCredits verwalten
        </h2>
      </div>

      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, Alias, E-Mail oder User-ID"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-space-black/55 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyber-blue/40"
          maxLength={150}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14] disabled:opacity-50"
        >
          Benutzer suchen
        </button>
      </form>

      {users.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected?.user.id === user.id
                  ? "border-cyber-cyan/35 bg-cyber-cyan/[0.08]"
                  : "border-white/[0.06] bg-white/[0.018] hover:border-white/15"
              }`}
            >
              <p className="truncate text-xs text-white/75">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  user.username}
              </p>
              <p className="mt-1 truncate font-mono text-[8px] text-white/30">
                #{user.id} · {user.email}
              </p>
              <p className="mt-2 font-mono text-[8px] uppercase text-cyber-cyan/45">
                {user.role} / {user.status}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-white/[0.07] bg-space-black/45 p-5">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
              AUSGEWÄHLTER BENUTZER
            </p>
            <p className="mt-3 text-sm text-white/75">{selected.user.email}</p>
            <p className="mt-5 text-4xl font-semibold text-cyber-cyan/90">
              {selected.credits.balance.toLocaleString("de-DE")}
            </p>
            <p className="mt-1 text-xs text-white/30">SynCredits Guthaben</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-white/25">Gekauft</dt>
                <dd className="mt-1 text-white/60">
                  {selected.credits.lifetimePurchased.toLocaleString("de-DE")}
                </dd>
              </div>
              <div>
                <dt className="text-white/25">Verbraucht</dt>
                <dd className="mt-1 text-white/60">
                  {selected.credits.lifetimeSpent.toLocaleString("de-DE")}
                </dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={adjust}
            className="rounded-xl border border-white/[0.07] bg-space-black/45 p-5"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperation("add")}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  operation === "add"
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    : "border-white/[0.07] text-white/35"
                }`}
              >
                Credits gutschreiben
              </button>
              <button
                type="button"
                onClick={() => setOperation("remove")}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  operation === "remove"
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                    : "border-white/[0.07] text-white/35"
                }`}
              >
                Credits abziehen
              </button>
            </div>

            <label className="mt-4 block text-xs text-white/40">
              Anzahl Credits
              <input
                type="number"
                min={1}
                max={1_000_000}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 text-white outline-none focus:border-cyber-blue/40"
              />
            </label>
            <label className="mt-4 block text-xs text-white/40">
              Grund
              <textarea
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-20 w-full resize-y rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 text-white outline-none focus:border-cyber-blue/40"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-xs text-white/45">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              Revisionssichere Änderung verbindlich bestätigen.
            </label>
            <button
              type="submit"
              disabled={busy || !confirmed}
              className="mt-5 w-full rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-4 py-3 text-sm font-semibold text-space-black disabled:opacity-40"
            >
              {operation === "add"
                ? "Gutschrift bestätigen"
                : "Abbuchung bestätigen"}
            </button>
          </form>
        </div>
      ) : null}

      {message ? (
        <p
          className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-white/60"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
