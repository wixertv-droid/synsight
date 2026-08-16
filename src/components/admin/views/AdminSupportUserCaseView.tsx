"use client";

import { FormEvent, useEffect, useState } from "react";

type SupportTab = "overview" | "analyses" | "logs" | "communications";

type SearchUser = {
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
};

type SnapshotRow = {
  id: number;
  userId: number;
  moduleKey: string;
  nativeRunId: number | null;
  requestId: string | null;
  status: string;
  inputSnapshotJson: unknown;
  resultSnapshotJson: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  creditsCharged: number;
  retentionDays: number;
  expiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type UserProfile = {
  user: {
    id: number;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    publicAlias?: string | null;
    aliases?: string[];
    status: string;
    role: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
  };
  identity: Record<string, unknown> | null;
  credits: Record<string, unknown>;
  transactions: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
  analyses: Record<string, unknown>;
  promotions: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
};

type SupportCase = {
  profile: UserProfile;

  analysisSnapshots: SnapshotRow[];

  analysisHistory: {
    username: Array<Record<string, unknown>>;
    digitalExposure: Array<Record<string, unknown>>;
    reverseImage: Array<Record<string, unknown>>;
  };

  billingAndUsage: {
    usageLogs: Array<Record<string, unknown>>;
    usernameCosts: Array<Record<string, unknown>>;
  };

  technicalLogs: {
    apiUsageLogs: Array<Record<string, unknown>>;
    apiUsageEvents: Array<Record<string, unknown>>;
    auditEvents: Array<Record<string, unknown>>;
    sessions: Array<Record<string, unknown>>;
  };

  communications: {
    support: Array<Record<string, unknown>>;
    contact: Array<Record<string, unknown>>;
    press: Array<Record<string, unknown>>;
    partner: Array<Record<string, unknown>>;
  };
};

function formatDate(value: unknown): string {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(String(value)));
  } catch {
    return String(value);
  }
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  if (Array.isArray(value)) {
    if (!value.length) return "—";

    return value
      .map((entry) => {
        if (entry && typeof entry === "object") {
          return JSON.stringify(entry);
        }

        return String(entry);
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "Keine Daten gespeichert.";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function field(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function moduleLabel(key: string): string {
  switch (key) {
    case "google_search":
      return "Google Intelligence";
    case "username_intelligence":
      return "Username Intelligence";
    case "digital_leak_exposure":
      return "Digital Leak & Exposure";
    case "public_image_exposure_scan":
      return "Public Image Exposure";
    case "face_identity_verification":
      return "Face Identity Verification";
    default:
      return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Erfolgreich";
    case "failed":
      return "Fehlgeschlagen";
    case "running":
      return "Läuft";
    case "pending":
      return "Ausstehend";
    case "refunded":
      return "Erstattet";
    case "active":
      return "Aktiv";
    case "suspended":
      return "Gesperrt";
    case "pending_verification":
      return "Verifizierung offen";
    default:
      return status || "—";
  }
}

function statusClasses(status: string): string {
  if (status === "completed" || status === "active") {
    return "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-100/70";
  }

  if (status === "failed" || status === "suspended") {
    return "border-rose-400/20 bg-rose-400/[0.05] text-rose-100/70";
  }

  if (status === "running" || status === "pending") {
    return "border-amber-400/20 bg-amber-400/[0.05] text-amber-100/70";
  }

  return "border-white/10 bg-white/[0.02] text-white/50";
}

function GenericLogList({
  rows,
  emptyText,
}: {
  rows: Array<Record<string, unknown>>;
  emptyText: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-white/30">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <details
          key={`${String(field(row, "id") ?? index)}-${index}`}
          className="rounded-xl border border-white/[0.06] bg-black/20"
        >
          <summary className="cursor-pointer px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-white/65">
                  {displayValue(
                    field(row, "eventType") ??
                      field(row, "analysisKey") ??
                      field(row, "requestType") ??
                      field(row, "providerCode") ??
                      field(row, "provider") ??
                      field(row, "status") ??
                      field(row, "description") ??
                      "Eintrag"
                  )}
                </div>

                <div className="mt-1 text-[9px] text-white/25">
                  {formatDate(
                    field(row, "createdAt") ?? field(row, "startedAt")
                  )}
                </div>
              </div>

              {field(row, "status") ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[9px] ${statusClasses(
                    String(field(row, "status"))
                  )}`}
                >
                  {statusLabel(String(field(row, "status")))}
                </span>
              ) : null}
            </div>
          </summary>

          <pre className="max-h-[440px] overflow-auto border-t border-white/[0.05] p-4 text-[10px] leading-relaxed text-white/45">
            {prettyJson(row)}
          </pre>
        </details>
      ))}
    </div>
  );
}

function CommunicationList({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-white/70">{title}</h3>

        <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] text-white/35">
          {rows.length}
        </span>
      </div>

      <div className="mt-4">
        {!rows.length ? (
          <p className="text-sm text-white/30">Keine Einträge vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <details
                key={`${String(field(row, "id") ?? index)}-${index}`}
                className="rounded-lg border border-white/[0.06] bg-black/20"
              >
                <summary className="cursor-pointer px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-white/65">
                        {displayValue(
                          field(row, "subject") ??
                            field(row, "topic") ??
                            field(row, "partnershipType") ??
                            "Nachricht"
                        )}
                      </div>

                      <div className="mt-1 text-[10px] text-white/30">
                        {displayValue(field(row, "name"))} ·{" "}
                        {displayValue(field(row, "email"))}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] text-white/25">
                        {formatDate(field(row, "createdAt"))}
                      </div>

                      {field(row, "status") ? (
                        <div className="mt-1 text-[9px] text-cyber-cyan/50">
                          {displayValue(field(row, "status"))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </summary>

                <div className="border-t border-white/[0.05] p-4">
                  {field(row, "message") ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/55">
                      {displayValue(field(row, "message"))}
                    </div>
                  ) : null}

                  <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg bg-black/20 p-3 text-[10px] text-white/35">
                    {prettyJson(row)}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminSupportUserCaseView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  const [supportCase, setSupportCase] = useState<SupportCase | null>(null);

  const [tab, setTab] = useState<SupportTab>("overview");

  const [searching, setSearching] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const email = new URLSearchParams(window.location.search)
      .get("email")
      ?.trim();

    if (!email) return;

    setQuery(email);

    void (async () => {
      setSearching(true);

      try {
        const params = new URLSearchParams({
          q: email,
          page: "1",
          limit: "25",
          sort: "login",
          direction: "desc",
        });

        const response = await fetch(
          `/api/admin/users/list?${params.toString()}`
        );

        const body = await response.json().catch(() => null);

        if (!response.ok || !body?.success) {
          return;
        }

        const rows = Array.isArray(body.data?.users)
          ? (body.data.users as SearchUser[])
          : [];

        setResults(rows);

        const exact =
          rows.find(
            (user) => user.email.trim().toLowerCase() === email.toLowerCase()
          ) ?? rows[0];

        if (exact) {
          await openCase(exact);
        }
      } finally {
        setSearching(false);
      }
    })();
  }, []);

  async function searchUsers(event?: FormEvent) {
    event?.preventDefault();

    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        page: "1",
        limit: "25",
        sort: "login",
        direction: "desc",
      });

      const response = await fetch(
        `/api/admin/users/list?${params.toString()}`
      );

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(body?.error?.message ?? "Benutzersuche fehlgeschlagen.");
        return;
      }

      setResults(Array.isArray(body.data?.users) ? body.data.users : []);
    } catch {
      setError("Verbindung zur Benutzersuche fehlgeschlagen.");
    } finally {
      setSearching(false);
    }
  }

  async function openCase(user: SearchUser) {
    setSelectedUser(user);
    setSupportCase(null);
    setLoadingCase(true);
    setError(null);
    setTab("overview");

    try {
      const response = await fetch(`/api/admin/support/users/${user.id}/case`);

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ?? "Support-Akte konnte nicht geladen werden."
        );
        return;
      }

      setSupportCase(body.data.supportCase);
    } catch {
      setError("Verbindung zur Support-Akte fehlgeschlagen.");
    } finally {
      setLoadingCase(false);
    }
  }

  const user = supportCase?.profile.user ?? null;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.email
    : "";

  const communicationCount = supportCase
    ? supportCase.communications.support.length +
      supportCase.communications.contact.length +
      supportCase.communications.press.length +
      supportCase.communications.partner.length
    : 0;

  const technicalLogCount = supportCase
    ? supportCase.technicalLogs.apiUsageLogs.length +
      supportCase.technicalLogs.apiUsageEvents.length +
      supportCase.technicalLogs.auditEvents.length +
      supportCase.technicalLogs.sessions.length
    : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyber-cyan/15 bg-[#06101a]/90 p-5 md:p-6">
        <div className="max-w-3xl">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            SUPPORT CASE SEARCH
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white/85">
            Benutzer-Supportakte
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Suche nach Name, E-Mail, Benutzername oder Benutzer-ID. Anschließend
            können gespeicherte Analyseläufe, Originalergebnisse, Fehler,
            Nutzung, Logs und bisherige Kommunikation geprüft werden.
          </p>
        </div>

        <form
          onSubmit={searchUsers}
          className="mt-5 flex flex-col gap-3 md:flex-row"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, E-Mail, Benutzername oder ID…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-cyber-cyan/35"
          />

          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan px-6 py-3 text-sm font-semibold text-space-black disabled:opacity-40"
          >
            {searching ? "Suche läuft…" : "Benutzer suchen"}
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </div>
      ) : null}

      {results.length > 0 ? (
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-white/65">
              Suchergebnisse
            </h3>

            <span className="font-mono text-[9px] text-white/30">
              {results.length} Treffer
            </span>
          </div>

          <div className="grid gap-2">
            {results.map((row) => {
              const name =
                [row.firstName, row.lastName].filter(Boolean).join(" ") ||
                row.username;

              const active = selectedUser?.id === row.id;

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => void openCase(row)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-cyber-cyan/30 bg-cyber-cyan/[0.06]"
                      : "border-white/[0.06] bg-black/15 hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white/75">
                        {name}
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        {row.email}
                      </div>

                      <div className="mt-1 font-mono text-[9px] text-white/25">
                        ID #{row.id} · @{row.username}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] ${statusClasses(
                          row.status
                        )}`}
                      >
                        {statusLabel(row.status)}
                      </span>

                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/40">
                        {row.synCredits} Credits
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {loadingCase ? (
        <div className="rounded-xl border border-white/[0.07] p-6 text-sm text-white/40">
          Support-Akte wird geladen…
        </div>
      ) : null}

      {supportCase && user ? (
        <>
          <section className="rounded-2xl border border-white/[0.08] bg-[#060d16]/90 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  SUPPORT CASE · USER #{user.id}
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white/88">
                  {displayName}
                </h2>

                <p className="mt-1 text-sm text-white/38">{user.email}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] ${statusClasses(
                      user.status
                    )}`}
                  >
                    {statusLabel(user.status)}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">
                    @{user.username}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">
                    Rolle: {user.role}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">
                    {user.emailVerifiedAt
                      ? "E-Mail verifiziert"
                      : "E-Mail nicht verifiziert"}
                  </span>
                </div>
              </div>

              <div className="grid min-w-[300px] grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="font-mono text-[8px] text-white/25">
                    ORIGINAL-LÄUFE
                  </div>

                  <div className="mt-1 text-xl text-cyan-100/75">
                    {supportCase.analysisSnapshots.length}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="font-mono text-[8px] text-white/25">
                    NACHRICHTEN
                  </div>

                  <div className="mt-1 text-xl text-white/75">
                    {communicationCount}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="font-mono text-[8px] text-white/25">
                    TECHNISCHE LOGS
                  </div>

                  <div className="mt-1 text-xl text-white/75">
                    {technicalLogCount}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="font-mono text-[8px] text-white/25">
                    LETZTER LOGIN
                  </div>

                  <div className="mt-1 text-xs text-white/65">
                    {formatDate(user.lastLoginAt)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <nav className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
            {[
              {
                id: "overview",
                label: "Kunde & Profil",
              },
              {
                id: "analyses",
                label: "Analysen & Ergebnisse",
              },
              {
                id: "logs",
                label: "Logs & Verlauf",
              },
              {
                id: "communications",
                label: "Kommunikation",
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as SupportTab)}
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
            <div className="space-y-4">
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    KONTO
                  </p>

                  <dl className="mt-4 space-y-3">
                    {[
                      ["Benutzer-ID", user.id],
                      ["Benutzername", user.username],
                      ["E-Mail", user.email],
                      ["Rolle", user.role],
                      ["Status", statusLabel(user.status)],
                      ["Registriert", formatDate(user.createdAt)],
                      ["Verifiziert", formatDate(user.emailVerifiedAt)],
                      ["Letzter Login", formatDate(user.lastLoginAt)],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-2 text-sm"
                      >
                        <dt className="text-white/32">{label}</dt>

                        <dd className="max-w-[65%] break-words text-right text-white/65">
                          {String(value ?? "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    SYNCREDITS
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.entries(supportCase.profile.credits).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg border border-white/[0.05] bg-black/20 p-3"
                        >
                          <div className="font-mono text-[8px] uppercase text-white/25">
                            {key}
                          </div>

                          <div className="mt-1 text-sm text-cyan-100/65">
                            {displayValue(value)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
                  GESPEICHERTE IDENTITÄT / KUNDENEINGABEN
                </p>

                <p className="mt-2 text-xs leading-relaxed text-white/35">
                  Aktuell im Kundenprofil gespeicherte Daten. Für den exakten
                  Zustand zum Zeitpunkt einer Analyse siehe den jeweiligen
                  Original-Lauf unter „Analysen & Ergebnisse“.
                </p>

                {!supportCase.profile.identity ? (
                  <p className="mt-4 text-sm text-white/30">
                    Kein Identitätsprofil gespeichert.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(supportCase.profile.identity).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
                        >
                          <div className="font-mono text-[8px] uppercase tracking-[.1em] text-white/25">
                            {key
                              .replace(/([a-z])([A-Z])/g, "$1 $2")
                              .replace(/_/g, " ")}
                          </div>

                          <div className="mt-2 break-words text-sm text-white/62">
                            {displayValue(value)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {tab === "analyses" ? (
            <div className="space-y-5">
              <section className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
                <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
                  ORIGINAL-SNAPSHOTS
                </p>

                <h3 className="mt-2 text-base font-medium text-white/78">
                  Tatsächlich verwendete Eingaben und ausgegebene Ergebnisse
                </h3>

                <p className="mt-2 max-w-4xl text-xs leading-relaxed text-white/35">
                  Diese Datensätze dienen der Rekonstruktion eines Supportfalls.
                  Eine spätere Neuberechnung ersetzt diese gespeicherten
                  Ergebnisse nicht.
                </p>

                <div className="mt-5 space-y-3">
                  {!supportCase.analysisSnapshots.length ? (
                    <p className="text-sm text-white/30">
                      Noch keine Support-Snapshots vorhanden. Sie werden bei
                      zukünftigen Analysen automatisch angelegt.
                    </p>
                  ) : (
                    supportCase.analysisSnapshots.map((run) => (
                      <details
                        key={run.id}
                        className="rounded-xl border border-white/[0.07] bg-black/20"
                      >
                        <summary className="cursor-pointer p-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white/75">
                                {moduleLabel(run.moduleKey)}
                              </div>

                              <div className="mt-1 font-mono text-[9px] text-white/25">
                                Support-Lauf #{run.id}
                                {run.nativeRunId
                                  ? ` · Modul-Lauf #${run.nativeRunId}`
                                  : ""}
                                {run.requestId
                                  ? ` · Request ${run.requestId}`
                                  : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[9px] ${statusClasses(
                                  run.status
                                )}`}
                              >
                                {statusLabel(run.status)}
                              </span>

                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/40">
                                {run.creditsCharged} Credits
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-[10px] text-white/30 sm:grid-cols-3">
                            <span>
                              Start:{" "}
                              {formatDate(run.startedAt ?? run.createdAt)}
                            </span>

                            <span>Ende: {formatDate(run.completedAt)}</span>

                            <span>
                              Gespeichert bis:{" "}
                              {run.retentionDays === 0
                                ? "bis zur manuellen Löschung"
                                : formatDate(run.expiresAt)}
                            </span>
                          </div>
                        </summary>

                        <div className="border-t border-white/[0.05] p-4">
                          {run.errorMessage ? (
                            <div className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] p-4">
                              <div className="font-mono text-[9px] text-rose-100/50">
                                FEHLER · {run.errorCode ?? "ANALYSIS_FAILED"}
                              </div>

                              <div className="mt-2 text-sm text-rose-100/70">
                                {run.errorMessage}
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div>
                              <div className="mb-2 font-mono text-[9px] tracking-[.12em] text-cyber-cyan/50">
                                VERWENDETE EINGABEN
                              </div>

                              <pre className="max-h-[650px] overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-4 text-[10px] leading-relaxed text-white/48">
                                {prettyJson(run.inputSnapshotJson)}
                              </pre>
                            </div>

                            <div>
                              <div className="mb-2 font-mono text-[9px] tracking-[.12em] text-emerald-300/50">
                                AUSGEGEBENES ERGEBNIS
                              </div>

                              <pre className="max-h-[650px] overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-4 text-[10px] leading-relaxed text-white/48">
                                {prettyJson(run.resultSnapshotJson)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </details>
                    ))
                  )}
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.12em] text-white/30">
                    USERNAME-LÄUFE
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.analysisHistory.username}
                      emptyText="Keine Username-Analysen gespeichert."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.12em] text-white/30">
                    DIGITAL-LEAK-LÄUFE
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.analysisHistory.digitalExposure}
                      emptyText="Keine Digital-Leak-Analysen gespeichert."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.12em] text-white/30">
                    BILDANALYSE-LÄUFE
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.analysisHistory.reverseImage}
                      emptyText="Keine Bildanalysen gespeichert."
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "logs" ? (
            <div className="space-y-4">
              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
                    ANALYSE / CREDIT USAGE
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.billingAndUsage.usageLogs}
                      emptyText="Keine Usage-Logs vorhanden."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    USERNAME-KOSTEN
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.billingAndUsage.usernameCosts}
                      emptyText="Keine Kostenlogs vorhanden."
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    API REQUEST LOGS
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.technicalLogs.apiUsageLogs}
                      emptyText="Keine API-Logs vorhanden."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    API USAGE EVENTS
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.technicalLogs.apiUsageEvents}
                      emptyText="Keine API-Events vorhanden."
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    AUDIT-VERLAUF
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.technicalLogs.auditEvents}
                      emptyText="Keine Audit-Ereignisse vorhanden."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                    LOGIN / SITZUNGEN
                  </p>

                  <div className="mt-4">
                    <GenericLogList
                      rows={supportCase.technicalLogs.sessions}
                      emptyText="Keine Sitzungen gespeichert."
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "communications" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <CommunicationList
                title="Support-Anfragen"
                rows={supportCase.communications.support}
              />

              <CommunicationList
                title="Kontakt-Anfragen"
                rows={supportCase.communications.contact}
              />

              <CommunicationList
                title="Presse-Anfragen"
                rows={supportCase.communications.press}
              />

              <CommunicationList
                title="Partnerschafts-Anfragen"
                rows={supportCase.communications.partner}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
