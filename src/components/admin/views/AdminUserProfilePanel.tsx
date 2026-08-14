"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserRole = "user" | "support" | "worker" | "admin";

type TabId =
  | "overview"
  | "identity"
  | "access"
  | "credits"
  | "analyses"
  | "sessions"
  | "audit";

type UserData = {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  publicAlias: string | null;
  aliases: string[];
  status: string;
  role: UserRole;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
};

type SessionRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

type AuditRow = {
  id: number;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadataJson?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type CreditTransaction = {
  id: number;
  amount?: number;
  description?: string;
  createdAt: string;
  type?: string;
  balanceAfter?: number;
};

type ProfileData = {
  user: UserData;
  identity: Record<string, unknown> | null;
  credits: Record<string, unknown>;
  transactions: CreditTransaction[];
  sessions: SessionRow[];
  auditEvents: AuditRow[];
  analyses: Record<string, unknown>;
  promotions: Array<{
    promotionId: number;
    credits: number;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    at: string;
    label: string;
    kind: string;
  }>;
};

const tabs: Array<{
  id: TabId;
  label: string;
}> = [
  { id: "overview", label: "Übersicht" },
  { id: "identity", label: "Stammdaten" },
  { id: "access", label: "Rolle & Zugriff" },
  { id: "credits", label: "SynCredits" },
  { id: "analyses", label: "Analysen" },
  { id: "sessions", label: "Sitzungen" },
  { id: "audit", label: "Audit" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((entry) => String(entry)).join(", ") : "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  return String(value);
}

function roleLabel(role: UserRole) {
  switch (role) {
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

export default function AdminUserProfilePanel({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [tab, setTab] = useState<TabId>("overview");

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditOperation, setCreditOperation] = useState<"add" | "remove">(
    "add"
  );
  const [creditConfirmed, setCreditConfirmed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/users/${userId}/profile`);

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.success) {
      setError(
        body?.error?.message ?? "Benutzerprofil konnte nicht geladen werden."
      );
      return;
    }

    setProfile(body.data.profile);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSessions = useMemo(() => {
    return (
      profile?.sessions.filter((session) => !session.revokedAt).length ?? 0
    );
  }, [profile]);

  async function performAction(
    payload: Record<string, unknown>,
    success: string
  ) {
    setBusy(true);
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
        setError(
          body?.error?.message ?? "Aktion konnte nicht durchgeführt werden."
        );
        return;
      }

      setMessage(success);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function adjustCredits() {
    const amount = Number(creditAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Bitte eine gültige Anzahl SynCredits eingeben.");
      return;
    }

    if (creditReason.trim().length < 3) {
      setError("Bitte einen nachvollziehbaren Grund angeben.");
      return;
    }

    if (!creditConfirmed) {
      setError("Bitte die Änderung verbindlich bestätigen.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/credits/${creditOperation}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amount,
          reason: creditReason.trim(),
          confirm: true,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ?? "SynCredits konnten nicht geändert werden."
        );
        return;
      }

      setCreditAmount("");
      setCreditReason("");
      setCreditConfirmed(false);

      setMessage(
        `${creditOperation === "add" ? "Gutschrift" : "Abbuchung"} gespeichert. Neues Guthaben: ${Number(
          body.data.balance
        ).toLocaleString("de-DE")} SynCredits.`
      );

      await load();
    } catch {
      setError("Verbindung zur SynCredit-Verwaltung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <div className="space-y-3">
        {error ? (
          <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4 text-sm text-rose-100/70">
            {error}
          </p>
        ) : (
          <p className="text-sm text-white/40">Benutzerprofil wird geladen…</p>
        )}
      </div>
    );
  }

  const user = profile.user;

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-[#060d16]/90 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              USER CONTROL · #{user.id}
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white/88">
              {displayName}
            </h2>

            <p className="mt-1 text-sm text-white/38">{user.email}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/50">
                {roleLabel(user.role)}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[10px] ${
                  user.status === "active"
                    ? "border-emerald-400/20 text-emerald-100/70"
                    : user.status === "suspended"
                      ? "border-rose-400/20 text-rose-100/70"
                      : "border-amber-400/20 text-amber-100/70"
                }`}
              >
                {user.status}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[10px] ${
                  user.emailVerifiedAt
                    ? "border-emerald-400/20 text-emerald-100/65"
                    : "border-amber-400/20 text-amber-100/65"
                }`}
              >
                {user.emailVerifiedAt ? "E-Mail verifiziert" : "E-Mail offen"}
              </span>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="font-mono text-[8px] text-white/25">
                SYNCREDITS
              </div>
              <div className="mt-1 text-lg text-cyan-100/75">
                {displayValue(profile.credits.balance)}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="font-mono text-[8px] text-white/25">
                AKTIVE SESSIONS
              </div>
              <div className="mt-1 text-lg text-white/75">{activeSessions}</div>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/70">
          ✓ {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg border px-3 py-2 text-xs transition ${
              tab === item.id
                ? "border-cyber-cyan/25 bg-cyber-cyan/[0.08] text-cyber-cyan"
                : "border-white/[0.06] text-white/38 hover:border-white/15 hover:text-white/60"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
              KONTO
            </p>

            <dl className="mt-4 space-y-3">
              {[
                ["Benutzername", user.username],
                ["Rolle", roleLabel(user.role)],
                ["Status", user.status],
                ["Registriert", formatDate(user.createdAt)],
                ["E-Mail verifiziert", formatDate(user.emailVerifiedAt)],
                ["Letzter Login", formatDate(user.lastLoginAt)],
                ["Öffentlicher Alias", user.publicAlias],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-2 text-sm"
                >
                  <dt className="text-white/32">{label}</dt>
                  <dd className="max-w-[60%] text-right text-white/65">
                    {String(value ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
              LETZTE AKTIVITÄTEN
            </p>

            <div className="mt-4 space-y-2">
              {profile.timeline.length === 0 ? (
                <p className="text-sm text-white/30">Noch keine Aktivitäten.</p>
              ) : (
                profile.timeline.slice(0, 12).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[8px] uppercase tracking-[.12em] text-cyber-cyan/45">
                        {entry.kind}
                      </span>

                      <span className="text-[9px] text-white/20">
                        {formatDate(entry.at)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-white/50">{entry.label}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "identity" ? (
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            STAMMDATEN & IDENTITÄT
          </p>

          {!profile.identity ? (
            <p className="mt-4 text-sm text-white/30">
              Noch kein Identitätsprofil vorhanden.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(profile.identity).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
                >
                  <div className="font-mono text-[8px] uppercase tracking-[.1em] text-white/25">
                    {key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}
                  </div>

                  <div className="mt-2 break-words text-sm text-white/62">
                    {displayValue(value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {user.aliases?.length ? (
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="font-mono text-[8px] uppercase tracking-[.1em] text-white/25">
                ALIASE
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {user.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="rounded-full border border-cyber-cyan/15 px-3 py-1 text-xs text-cyan-100/55"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "access" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
              ROLLE
            </p>

            <p className="mt-2 text-sm text-white/40">
              Die Rolle steuert, welche internen Bereiche dieses Konto verwenden
              darf.
            </p>

            <select
              value={user.role}
              disabled={busy}
              onChange={(event) => {
                const nextRole = event.target.value as UserRole;

                if (
                  !window.confirm(
                    `Rolle wirklich von „${roleLabel(
                      user.role
                    )}“ auf „${roleLabel(
                      nextRole
                    )}“ ändern?\n\nAlle bestehenden Sitzungen des Benutzers werden beendet.`
                  )
                ) {
                  return;
                }

                void performAction(
                  {
                    action: "role",
                    role: nextRole,
                  },
                  "Rolle wurde geändert und bestehende Sitzungen wurden beendet."
                );
              }}
              className="mt-5 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-3 text-sm text-white/75 [color-scheme:dark]"
            >
              <option value="user">Benutzer</option>
              <option value="support">Support</option>
              <option value="worker">Worker</option>
              <option value="admin">Administrator</option>
            </select>

            <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-xs leading-relaxed text-white/35">
              Aktuell:{" "}
              <strong className="text-white/65">{roleLabel(user.role)}</strong>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
              KONTOSTATUS
            </p>

            <div className="mt-5 space-y-3">
              {user.status === "suspended" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void performAction(
                      {
                        action: "status",
                        status: "active",
                      },
                      "Konto wurde entsperrt."
                    )
                  }
                  className="w-full rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100/70"
                >
                  Konto entsperren
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Konto wirklich sperren?\n\nAlle aktiven Sitzungen werden beendet."
                      )
                    ) {
                      return;
                    }

                    void performAction(
                      {
                        action: "status",
                        status: "suspended",
                      },
                      "Konto wurde gesperrt und aktive Sitzungen wurden beendet."
                    );
                  }}
                  className="w-full rounded-lg border border-rose-400/20 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/65"
                >
                  Konto sperren
                </button>
              )}

              {!user.emailVerifiedAt ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void performAction(
                        {
                          action: "resend_verification",
                        },
                        "Verifizierungsmail wurde erneut versendet."
                      )
                    }
                    className="w-full rounded-lg border border-cyber-cyan/20 px-4 py-3 text-sm text-cyan-100/65"
                  >
                    Verifizierung erneut senden
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Benutzer wirklich manuell verifizieren?"
                        )
                      ) {
                        return;
                      }

                      void performAction(
                        {
                          action: "verify",
                        },
                        "Benutzer wurde manuell verifiziert."
                      );
                    }}
                    className="w-full rounded-lg border border-amber-400/20 px-4 py-3 text-sm text-amber-100/65"
                  >
                    Manuell verifizieren
                  </button>
                </>
              ) : null}

              <button
                type="button"
                disabled={busy || activeSessions === 0}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Alle aktiven Sitzungen dieses Benutzers beenden?"
                    )
                  ) {
                    return;
                  }

                  void performAction(
                    {
                      action: "revoke_sessions",
                    },
                    "Alle aktiven Sitzungen wurden beendet."
                  );
                }}
                className="w-full rounded-lg border border-white/10 px-4 py-3 text-sm text-white/50 disabled:opacity-30"
              >
                Alle Sitzungen beenden
                {activeSessions ? ` (${activeSessions})` : ""}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "credits" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
                  SYNCREDIT CONTROL
                </p>

                <h3 className="mt-2 text-base font-medium text-white/78">
                  Guthaben ändern
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-white/35">
                  Jede manuelle Änderung wird über die bestehende
                  SynCredit-Transaktionslogik gespeichert.
                </p>
              </div>

              <div className="text-right">
                <div className="font-mono text-[8px] text-white/25">
                  AKTUELL
                </div>
                <div className="mt-1 text-2xl text-cyber-cyan/80">
                  {displayValue(profile.credits.balance)}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setCreditOperation("add")}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  creditOperation === "add"
                    ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100/75"
                    : "border-white/10 text-white/40"
                }`}
              >
                + Gutschreiben
              </button>

              <button
                type="button"
                onClick={() => setCreditOperation("remove")}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  creditOperation === "remove"
                    ? "border-amber-400/25 bg-amber-400/[0.06] text-amber-100/75"
                    : "border-white/10 text-white/40"
                }`}
              >
                − Abbuchen
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[0.35fr_0.65fr]">
              <label className="text-xs text-white/40">
                Anzahl
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75"
                />
              </label>

              <label className="text-xs text-white/40">
                Grund
                <input
                  value={creditReason}
                  onChange={(event) => setCreditReason(event.target.value)}
                  placeholder="z. B. Kulanz, Korrektur, Supportfall…"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/75"
                />
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 text-xs text-white/42">
              <input
                type="checkbox"
                checked={creditConfirmed}
                onChange={(event) => setCreditConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              Ich bestätige diese manuelle Guthabenänderung verbindlich.
            </label>

            <button
              type="button"
              disabled={busy || !creditConfirmed}
              onClick={() => void adjustCredits()}
              className="mt-4 rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-3 text-sm font-semibold text-space-black disabled:opacity-35"
            >
              {busy
                ? "Wird gespeichert…"
                : creditOperation === "add"
                  ? "Gutschrift speichern"
                  : "Abbuchung speichern"}
            </button>
          </section>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(profile.credits).map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
              >
                <div className="font-mono text-[8px] uppercase tracking-[.1em] text-white/25">
                  {key}
                </div>

                <div className="mt-2 text-lg text-cyan-100/70">
                  {displayValue(value)}
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
              TRANSAKTIONSHISTORIE
            </p>

            <div className="mt-4 space-y-2">
              {profile.transactions.length === 0 ? (
                <p className="text-sm text-white/30">
                  Keine SynCredit-Transaktionen vorhanden.
                </p>
              ) : (
                profile.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-black/15 px-3 py-3"
                  >
                    <div>
                      <div className="text-xs text-white/55">
                        {transaction.description ??
                          transaction.type ??
                          "SynCredit-Transaktion"}
                      </div>

                      <div className="mt-1 text-[9px] text-white/25">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>

                    <div className="font-mono text-sm text-cyan-100/70">
                      {transaction.amount ?? "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "analyses" ? (
        <section className="space-y-4">
          {Object.entries(profile.analyses).map(([module, result]) => (
            <article
              key={module}
              className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5"
            >
              <div className="font-mono text-[9px] uppercase tracking-[.14em] text-cyber-cyan/50">
                {module.replace(/_/g, " ")}
              </div>

              {!result ? (
                <p className="mt-3 text-sm text-white/30">
                  Für dieses Modul liegt noch kein gespeichertes Ergebnis vor.
                </p>
              ) : (
                <pre className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-white/[0.05] bg-black/25 p-4 text-[11px] leading-relaxed text-white/45">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {tab === "sessions" ? (
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                SITZUNGEN
              </p>

              <p className="mt-2 text-sm text-white/38">
                {activeSessions} aktive von {profile.sessions.length}{" "}
                gespeicherten Sitzungen
              </p>
            </div>

            <button
              type="button"
              disabled={busy || activeSessions === 0}
              onClick={() => {
                if (!window.confirm("Alle aktiven Sitzungen beenden?")) {
                  return;
                }

                void performAction(
                  {
                    action: "revoke_sessions",
                  },
                  "Alle Sitzungen wurden beendet."
                );
              }}
              className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-100/60 disabled:opacity-30"
            >
              Alle aktiven beenden
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-white/[0.06] font-mono text-[8px] text-white/25">
                <tr>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">IP</th>
                  <th className="px-3 py-3">Gerät / Browser</th>
                  <th className="px-3 py-3">Erstellt</th>
                  <th className="px-3 py-3">Zuletzt aktiv</th>
                </tr>
              </thead>

              <tbody>
                {profile.sessions.map((session) => (
                  <tr key={session.id} className="border-b border-white/[0.04]">
                    <td className="px-3 py-3 text-xs">
                      {session.revokedAt ? (
                        <span className="text-white/30">Beendet</span>
                      ) : (
                        <span className="text-emerald-100/65">Aktiv</span>
                      )}
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-white/48">
                      {session.ipAddress ?? "—"}
                    </td>

                    <td className="max-w-[340px] truncate px-3 py-3 text-xs text-white/40">
                      {session.userAgent ?? "—"}
                    </td>

                    <td className="px-3 py-3 text-xs text-white/35">
                      {formatDate(session.createdAt)}
                    </td>

                    <td className="px-3 py-3 text-xs text-white/35">
                      {formatDate(session.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            AUDIT & SICHERHEITSVERLAUF
          </p>

          <div className="mt-5 space-y-2">
            {profile.auditEvents.length === 0 ? (
              <p className="text-sm text-white/30">
                Keine Audit-Ereignisse vorhanden.
              </p>
            ) : (
              profile.auditEvents.map((event) => {
                const meta = event.metadataJson ?? event.metadata ?? null;

                return (
                  <article
                    key={event.id}
                    className="rounded-lg border border-white/[0.05] bg-black/15 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[9px] text-cyber-cyan/55">
                          {event.eventType}
                        </div>

                        <div className="mt-1 text-[10px] text-white/25">
                          {event.entityType ?? "—"}
                          {event.entityId ? ` · ${event.entityId}` : ""}
                        </div>
                      </div>

                      <div className="text-right text-[9px] text-white/25">
                        <div>{formatDate(event.createdAt)}</div>

                        <div className="mt-1">
                          {event.ipAddress ?? "keine IP"}
                        </div>
                      </div>
                    </div>

                    {meta ? (
                      <div className="mt-3 rounded-lg border border-white/[0.04] bg-black/20 p-3">
                        {Object.entries(meta).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-wrap gap-2 text-[10px]"
                          >
                            <span className="text-white/25">{key}:</span>
                            <span className="text-white/45">
                              {displayValue(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
