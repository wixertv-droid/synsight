"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        message: string;
      };
    };

type Channel = "contact" | "partner" | "press" | "support";

type ChannelFilter = "all" | Channel;

type RequestStatus = "new" | "processing" | "answered" | "archived";

interface RequestRow {
  id: number;
  name: string;
  email: string;
  status: RequestStatus;
  message: string;

  company?: string | null;
  phone?: string | null;
  subject?: string | null;

  partnershipType?: string | null;

  medium?: string | null;
  topic?: string | null;

  ipAddress?: string | null;
  userAgent?: string | null;
  adminNotes?: string | null;

  createdAt: string;
  updatedAt?: string;
}

interface Settings {
  contactEmail: string;
  pressEmail: string;
  partnersEmail: string;
  supportEmail: string;
  privacyEmail: string;
}

interface SupportHoursSettings {
  supportHoursStart: string;
  supportHoursEnd: string;
  supportTimezone: string;
  supportResponseText: string;
}

interface CommunicationsPayload {
  settings: Settings;

  requests: {
    contact: RequestRow[];
    partner: RequestRow[];
    press: RequestRow[];
    support: RequestRow[];
  };
}

interface SelectedTicket {
  channel: Channel;
  row: RequestRow;
}

interface UserMatch {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  role: string;
}

interface HistoryRow {
  id: number;
  action: string;
  statusFrom: string | null;
  statusTo: string | null;
  subject: string | null;
  body: string | null;

  deliveryStatus: string | null;
  provider: string | null;
  messageId: string | null;
  errorMessage: string | null;

  actorUserId: number | null;
  actorEmail: string | null;
  actorUsername: string | null;

  createdAt: string;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  support: "Support",
  contact: "Kontakt",
  press: "Presse",
  partner: "Partnerschaften",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "Neu",
  processing: "In Bearbeitung",
  answered: "Beantwortet",
  archived: "Archiviert",
};

function parseDate(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");

  return new Date(normalized);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parseDate(value));
  } catch {
    return value;
  }
}

function ticketTitle(row: RequestRow) {
  return (
    row.subject ??
    row.topic ??
    row.partnershipType ??
    row.medium ??
    row.company ??
    "Nachricht"
  );
}

function replySubject(row: RequestRow) {
  const title = ticketTitle(row);

  return /^re:/i.test(title) ? title : `Re: ${title}`;
}

function statusClass(status: RequestStatus) {
  if (status === "new") {
    return "border-cyber-cyan/30 bg-cyber-cyan/[0.07] text-cyber-cyan";
  }

  if (status === "processing") {
    return "border-amber-400/25 bg-amber-400/[0.05] text-amber-100/70";
  }

  if (status === "answered") {
    return "border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-100/70";
  }

  return "border-white/10 bg-white/[0.02] text-white/40";
}

function mailboxFor(channel: Channel, settings: Settings) {
  if (channel === "contact") {
    return settings.contactEmail;
  }

  if (channel === "support") {
    return settings.supportEmail;
  }

  if (channel === "press") {
    return settings.pressEmail;
  }

  return settings.partnersEmail;
}

export default function AdminSupportDeskView() {
  const [settings, setSettings] = useState<Settings>({
    contactEmail: "contact@synsight.de",
    pressEmail: "press@synsight.de",
    partnersEmail: "partners@synsight.de",
    supportEmail: "support@synsight.de",
    privacyEmail: "datenschutz@synsight.de",
  });

  const [requests, setRequests] = useState<CommunicationsPayload["requests"]>({
    contact: [],
    partner: [],
    press: [],
    support: [],
  });

  const [hours, setHours] = useState<SupportHoursSettings>({
    supportHoursStart: "09:00",
    supportHoursEnd: "18:00",
    supportTimezone: "Europe/Berlin",
    supportResponseText: "In der Regel innerhalb von 1–2 Werktagen",
  });

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("support");

  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>(
    "all"
  );

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<SelectedTicket | null>(null);

  const [userMatch, setUserMatch] = useState<UserMatch | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [note, setNote] = useState("");

  const [replySubjectValue, setReplySubjectValue] = useState("");

  const [replyMessage, setReplyMessage] = useState("");

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [savingHours, setSavingHours] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    try {
      const [commsResponse, hoursResponse] = await Promise.all([
        fetch("/api/admin/communications"),
        fetch("/api/admin/support/settings"),
      ]);

      const comms =
        (await commsResponse.json()) as ApiResult<CommunicationsPayload>;

      if (!commsResponse.ok || !comms.success) {
        setMessage(
          comms.success
            ? "Kommunikation konnte nicht geladen werden."
            : comms.error.message
        );

        return;
      }

      setSettings(comms.data.settings);

      setRequests(comms.data.requests);

      if (selected) {
        const refreshed = comms.data.requests[selected.channel].find(
          (row) => row.id === selected.row.id
        );

        if (refreshed) {
          setSelected({
            channel: selected.channel,
            row: refreshed,
          });

          setNote(refreshed.adminNotes ?? "");
        }
      }

      const hourResult = (await hoursResponse.json()) as ApiResult<{
        settings: SupportHoursSettings;
      }>;

      if (hoursResponse.ok && hourResult.success) {
        setHours(hourResult.data.settings);
      }
    } catch {
      setMessage("Verbindung zum Support-Center fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadHistory(ticket: SelectedTicket) {
    try {
      const response = await fetch(
        `/api/admin/communications/history?channel=${encodeURIComponent(
          ticket.channel
        )}&id=${ticket.row.id}`
      );

      const result = (await response.json()) as ApiResult<{
        history: HistoryRow[];
      }>;

      if (response.ok && result.success) {
        setHistory(result.data.history);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }

  async function loadUserMatch(ticket: SelectedTicket) {
    setUserMatch(null);

    try {
      const email = ticket.row.email.trim().toLowerCase();

      const params = new URLSearchParams({
        q: email,
        page: "1",
        limit: "25",
        sort: "id",
        direction: "desc",
      });

      const response = await fetch(
        `/api/admin/users/list?${params.toString()}`
      );

      const result = (await response.json()) as ApiResult<{
        users: Array<{
          id: number;
          email: string;
          username: string;
          firstName?: string | null;
          lastName?: string | null;
          status: string;
          role: string;
        }>;
      }>;

      if (!response.ok || !result.success) {
        return;
      }

      const matched =
        result.data.users.find(
          (user) => user.email.trim().toLowerCase() === email
        ) ?? null;

      setUserMatch(
        matched
          ? {
              id: matched.id,
              email: matched.email,
              username: matched.username,
              firstName: matched.firstName ?? null,
              lastName: matched.lastName ?? null,
              status: matched.status,
              role: matched.role,
            }
          : null
      );
    } catch {
      setUserMatch(null);
    }
  }

  function openTicket(channel: Channel, row: RequestRow) {
    const ticket = {
      channel,
      row,
    };

    setSelected(ticket);

    setNote(row.adminNotes ?? "");

    setReplySubjectValue(replySubject(row));

    setReplyMessage("");

    void loadHistory(ticket);
    void loadUserMatch(ticket);
  }

  const allTickets = useMemo(() => {
    return (Object.entries(requests) as Array<[Channel, RequestRow[]]>)
      .flatMap(([channel, rows]) =>
        rows.map((row) => ({
          channel,
          row,
        }))
      )
      .sort(
        (a, b) =>
          parseDate(b.row.createdAt).getTime() -
          parseDate(a.row.createdAt).getTime()
      );
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allTickets.filter(({ channel, row }) => {
      if (channelFilter !== "all" && channel !== channelFilter) {
        return false;
      }

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      return [
        row.name,
        row.email,
        row.company,
        row.subject,
        row.topic,
        row.partnershipType,
        row.medium,
        row.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [allTickets, channelFilter, statusFilter, search]);

  const counts = useMemo(() => {
    const result = {
      new: 0,
      processing: 0,
      answered: 0,
      archived: 0,
    };

    for (const item of allTickets) {
      result[item.row.status] += 1;
    }

    return result;
  }, [allTickets]);

  async function updateTicket(
    status: RequestStatus,
    adminNotes: string | null | undefined
  ) {
    if (!selected) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/communications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selected.channel,
          id: selected.row.id,
          status,
          adminNotes,
        }),
      });

      const result = (await response.json()) as ApiResult<RequestRow>;

      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Ticket konnte nicht aktualisiert werden."
            : result.error.message
        );

        return;
      }

      setRequests((previous) => ({
        ...previous,
        [selected.channel]: previous[selected.channel].map((row) =>
          row.id === selected.row.id ? result.data : row
        ),
      }));

      const nextTicket = {
        channel: selected.channel,
        row: result.data,
      };

      setSelected(nextTicket);
      setNote(result.data.adminNotes ?? "");

      await loadHistory(nextTicket);

      setMessage("Ticket aktualisiert.");
    } catch {
      setMessage("Ticket-Update fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();

    if (!selected) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/communications/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selected.channel,
          id: selected.row.id,
          subject: replySubjectValue,
          message: replyMessage,
        }),
      });

      const result = (await response.json()) as ApiResult<{
        delivered: boolean;
        messageId: string | null;
      }>;

      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Antwort konnte nicht versendet werden."
            : result.error.message
        );

        await loadHistory(selected);

        return;
      }

      setReplyMessage("");

      setMessage("Antwort wurde erfolgreich versendet.");

      await load();

      await loadHistory({
        channel: selected.channel,
        row: {
          ...selected.row,
          status: "answered",
        },
      });
    } catch {
      setMessage("Antwortversand fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function forwardTicket() {
    if (!selected) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/communications/forward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selected.channel,
          id: selected.row.id,
        }),
      });

      const result = (await response.json()) as ApiResult<{
        to: string;
      }>;

      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Weiterleitung fehlgeschlagen."
            : result.error.message
        );

        return;
      }

      setMessage(`Weitergeleitet an ${result.data.to}.`);

      await load();
    } catch {
      setMessage("Weiterleitung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTicket() {
    if (!selected) return;

    if (
      !window.confirm(
        `Ticket #${selected.row.id} wirklich endgültig löschen? Archivieren ist für normale Supportfälle vorzuziehen.`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/admin/communications/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selected.channel,
          id: selected.row.id,
        }),
      });

      const result = (await response.json()) as ApiResult<{
        deleted: boolean;
      }>;

      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Löschen fehlgeschlagen." : result.error.message
        );

        return;
      }

      setSelected(null);
      setHistory([]);
      setUserMatch(null);

      await load();

      setMessage("Ticket wurde gelöscht.");
    } catch {
      setMessage("Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHours(event: FormEvent) {
    event.preventDefault();

    setSavingHours(true);

    try {
      const response = await fetch("/api/admin/support/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hours),
      });

      const result = (await response.json()) as ApiResult<{
        settings: SupportHoursSettings;
      }>;

      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Support-Zeiten konnten nicht gespeichert werden."
            : result.error.message
        );

        return;
      }

      setHours(result.data.settings);

      setMessage("Support-Zeiten gespeichert.");
    } finally {
      setSavingHours(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.08] bg-[#060d16]/90 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              A6 · SUPPORT DESK
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white/85">
              Nachrichten & Tickets
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40">
              Kundenanfragen prüfen, intern dokumentieren, Benutzerkonten
              zuordnen und direkt über das jeweilige SMTP-Postfach beantworten.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 hover:border-cyber-cyan/25 hover:text-cyber-cyan"
          >
            Aktualisieren
          </button>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.04] px-4 py-3 text-sm text-white/60">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["new", "Neu"],
            ["processing", "In Bearbeitung"],
            ["answered", "Beantwortet"],
            ["archived", "Archiviert"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left"
          >
            <div className="font-mono text-[8px] uppercase text-white/25">
              {label}
            </div>

            <div className="mt-2 text-2xl text-white/80">{counts[key]}</div>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <div className="flex flex-wrap gap-2">
          {(
            ["all", "support", "contact", "press", "partner"] as ChannelFilter[]
          ).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setChannelFilter(key)}
              className={`rounded-lg border px-3 py-2 text-xs ${
                channelFilter === key
                  ? "border-cyber-cyan/30 bg-cyber-cyan/[0.07] text-cyber-cyan"
                  : "border-white/10 text-white/40"
              }`}
            >
              {key === "all"
                ? `Alle (${allTickets.length})`
                : `${CHANNEL_LABEL[key]} (${requests[key].length})`}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, E-Mail, Betreff, Firma oder Nachricht…"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/75 outline-none"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | RequestStatus)
            }
            className="rounded-lg border border-white/10 bg-[#071018] px-3 py-2.5 text-sm text-white/70"
          >
            <option value="all">Alle Status</option>

            {(Object.keys(STATUS_LABEL) as RequestStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3">
          {loading ? (
            <p className="p-4 text-sm text-white/35">Tickets werden geladen…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-white/35">
              Keine passenden Tickets.
            </p>
          ) : (
            <div className="max-h-[850px] space-y-2 overflow-auto pr-1">
              {filtered.map(({ channel, row }) => (
                <button
                  key={`${channel}-${row.id}`}
                  type="button"
                  onClick={() => openTicket(channel, row)}
                  className={`w-full rounded-xl border p-3 text-left ${
                    selected?.channel === channel && selected?.row.id === row.id
                      ? "border-cyber-cyan/30 bg-cyber-cyan/[0.06]"
                      : "border-white/[0.06] bg-black/15 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-white/70">
                      {row.name}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[8px] ${statusClass(
                        row.status
                      )}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </div>

                  <div className="mt-1 truncate text-[10px] text-white/30">
                    {row.email}
                  </div>

                  <div className="mt-2 line-clamp-1 text-xs text-white/48">
                    {ticketTitle(row)}
                  </div>

                  <div className="mt-2 flex justify-between text-[9px] text-white/22">
                    <span>
                      {CHANNEL_LABEL[channel]} · #{row.id}
                    </span>

                    <span>{formatDate(row.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-8 text-sm text-white/35">
              Links ein Ticket auswählen.
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[9px] text-cyber-cyan/50">
                      {CHANNEL_LABEL[selected.channel]} · TICKET #
                      {selected.row.id}
                    </div>

                    <h3 className="mt-2 text-lg font-medium text-white/80">
                      {ticketTitle(selected.row)}
                    </h3>

                    <div className="mt-2 text-sm text-white/45">
                      {selected.row.name} &lt;
                      {selected.row.email}
                      &gt;
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] ${statusClass(
                      selected.row.status
                    )}`}
                  >
                    {STATUS_LABEL[selected.row.status]}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-[9px] text-white/25">E-MAIL</div>
                    <div className="mt-1 break-all text-xs text-white/60">
                      {selected.row.email}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-white/25">TELEFON</div>
                    <div className="mt-1 text-xs text-white/60">
                      {selected.row.phone ?? "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-white/25">
                      FIRMA / MEDIUM
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {selected.row.company ?? selected.row.medium ?? "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-white/25">EINGANG</div>
                    <div className="mt-1 text-xs text-white/60">
                      {formatDate(selected.row.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4 whitespace-pre-wrap text-sm leading-relaxed text-white/58">
                  {selected.row.message}
                </div>

                <details className="mt-4 rounded-lg border border-white/[0.05] p-3">
                  <summary className="cursor-pointer text-xs text-white/35">
                    Technische Anfrageinformationen
                  </summary>

                  <div className="mt-3 space-y-1 text-[10px] text-white/30">
                    <div>IP: {selected.row.ipAddress ?? "—"}</div>

                    <div className="break-all">
                      User-Agent: {selected.row.userAgent ?? "—"}
                    </div>
                  </div>
                </details>
              </section>

              <section className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
                <div className="font-mono text-[9px] text-cyber-cyan/55">
                  KUNDENZUORDNUNG
                </div>

                {userMatch ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white/70">
                        {[userMatch.firstName, userMatch.lastName]
                          .filter(Boolean)
                          .join(" ") || userMatch.username}
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        Benutzer #{userMatch.id} · @{userMatch.username}
                      </div>
                    </div>

                    <a
                      href={`/support-desk/benutzersuche?email=${encodeURIComponent(
                        userMatch.email
                      )}`}
                      className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.07] px-4 py-2 text-xs text-cyber-cyan"
                    >
                      Supportakte öffnen →
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/35">
                    Zu dieser E-Mail wurde kein registriertes Kundenkonto
                    gefunden.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <div className="font-mono text-[9px] text-white/30">STATUS</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(STATUS_LABEL) as RequestStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy}
                        onClick={() => void updateTicket(status, note)}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          selected.row.status === status
                            ? statusClass(status)
                            : "border-white/10 text-white/38"
                        }`}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    )
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <div className="font-mono text-[9px] text-amber-100/50">
                  INTERNE NOTIZ
                </div>

                <p className="mt-2 text-xs text-white/30">
                  Diese Notiz ist nur intern sichtbar und wird niemals an den
                  Kunden gesendet.
                </p>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70 outline-none"
                />

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void updateTicket(selected.row.status, note)}
                  className="mt-3 rounded-lg border border-amber-400/20 px-4 py-2 text-xs text-amber-100/65"
                >
                  Interne Notiz speichern
                </button>
              </section>

              <form
                onSubmit={sendReply}
                className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.025] p-5"
              >
                <div className="font-mono text-[9px] text-emerald-200/55">
                  DIREKT ANTWORTEN
                </div>

                <p className="mt-2 text-xs text-white/35">
                  Versand über{" "}
                  <span className="text-emerald-200/65">
                    {mailboxFor(selected.channel, settings)}
                  </span>
                  .
                </p>

                <label className="mt-4 block text-xs text-white/35">
                  Betreff
                  <input
                    value={replySubjectValue}
                    onChange={(event) =>
                      setReplySubjectValue(event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/75 outline-none"
                  />
                </label>

                <label className="mt-4 block text-xs text-white/35">
                  Antwort
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    rows={7}
                    placeholder="Antwort an den Kunden…"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75 outline-none"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    busy || !replyMessage.trim() || !replySubjectValue.trim()
                  }
                  className="mt-4 rounded-lg bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#06100b] disabled:opacity-35"
                >
                  Antwort senden
                </button>
              </form>

              <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <div className="font-mono text-[9px] text-white/30">
                  TICKET-VERLAUF
                </div>

                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-white/30">
                      Noch keine Historieneinträge.
                    </p>
                  ) : (
                    history.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-white/[0.06] bg-black/20 p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div className="text-xs font-medium text-white/60">
                            {entry.action}
                          </div>

                          <div className="text-[9px] text-white/25">
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>

                        <div className="mt-1 text-[10px] text-white/30">
                          durch{" "}
                          {entry.actorUsername ??
                            entry.actorEmail ??
                            `User #${entry.actorUserId ?? "—"}`}
                        </div>

                        {entry.statusFrom || entry.statusTo ? (
                          <div className="mt-2 text-xs text-white/40">
                            {entry.statusFrom ?? "—"} → {entry.statusTo ?? "—"}
                          </div>
                        ) : null}

                        {entry.subject ? (
                          <div className="mt-3 text-xs font-medium text-white/55">
                            {entry.subject}
                          </div>
                        ) : null}

                        {entry.body ? (
                          <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/42">
                            {entry.body}
                          </div>
                        ) : null}

                        {entry.deliveryStatus ? (
                          <div className="mt-3 font-mono text-[9px] text-cyber-cyan/45">
                            MAIL: {entry.deliveryStatus}
                            {entry.messageId ? ` · ${entry.messageId}` : ""}
                          </div>
                        ) : null}

                        {entry.errorMessage ? (
                          <div className="mt-2 text-xs text-rose-100/60">
                            {entry.errorMessage}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="flex flex-wrap gap-2 rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void forwardTicket()}
                  className="rounded-lg border border-cyber-cyan/20 px-4 py-2 text-xs text-cyber-cyan/65"
                >
                  An Postfach weiterleiten
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteTicket()}
                  className="rounded-lg border border-rose-400/20 px-4 py-2 text-xs text-rose-100/60"
                >
                  Ticket löschen
                </button>
              </section>
            </div>
          )}
        </main>
      </section>

      <details className="rounded-xl border border-white/[0.07] bg-white/[0.015]">
        <summary className="cursor-pointer p-5">
          <span className="font-mono text-[9px] text-white/40">
            SUPPORT-ZEITEN / ONLINE-AMPEL
          </span>
        </summary>

        <form
          onSubmit={saveHours}
          className="grid gap-4 border-t border-white/[0.06] p-5 md:grid-cols-2"
        >
          <label className="text-xs text-white/35">
            Start
            <input
              value={hours.supportHoursStart}
              onChange={(event) =>
                setHours((previous) => ({
                  ...previous,
                  supportHoursStart: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70"
            />
          </label>

          <label className="text-xs text-white/35">
            Ende
            <input
              value={hours.supportHoursEnd}
              onChange={(event) =>
                setHours((previous) => ({
                  ...previous,
                  supportHoursEnd: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70"
            />
          </label>

          <label className="text-xs text-white/35">
            Zeitzone
            <input
              value={hours.supportTimezone}
              onChange={(event) =>
                setHours((previous) => ({
                  ...previous,
                  supportTimezone: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70"
            />
          </label>

          <label className="text-xs text-white/35">
            Antworttext
            <input
              value={hours.supportResponseText}
              onChange={(event) =>
                setHours((previous) => ({
                  ...previous,
                  supportResponseText: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingHours}
              className="rounded-lg border border-cyber-cyan/20 px-4 py-2 text-xs text-cyber-cyan/70"
            >
              {savingHours ? "Speichert…" : "Support-Zeiten speichern"}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
