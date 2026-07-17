"use client";

import { FormEvent, useEffect, useState } from "react";
import InfoHeading from "@/components/ui/InfoHeading";
import InfoPanel from "@/components/ui/InfoPanel";

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

type RequestStatus = "new" | "processing" | "answered" | "archived";
type Channel = "contact" | "partner" | "press";

interface Settings {
  contactEmail: string;
  pressEmail: string;
  partnersEmail: string;
}

interface RequestRow {
  id: number;
  name: string;
  email: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
  company?: string | null;
  subject?: string;
  partnershipType?: string;
  medium?: string;
  topic?: string;
}

interface CommunicationsPayload {
  settings: Settings;
  requests: {
    contact: RequestRow[];
    partner: RequestRow[];
    press: RequestRow[];
  };
}

const statusLabel: Record<RequestStatus, string> = {
  new: "Neu",
  processing: "In Bearbeitung",
  answered: "Beantwortet",
  archived: "Archiviert",
};

const channelLabel: Record<Channel, string> = {
  contact: "Kontakt",
  partner: "Partnerschaft",
  press: "Presse",
};

export default function AdminCommunicationsControl() {
  const [settings, setSettings] = useState<Settings>({
    contactEmail: "contact@synsight.de",
    pressEmail: "press@synsight.de",
    partnersEmail: "partners@synsight.de",
  });
  const [requests, setRequests] = useState<CommunicationsPayload["requests"]>({
    contact: [],
    partner: [],
    press: [],
  });
  const [channel, setChannel] = useState<Channel>("contact");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/communications");
      const result =
        (await response.json()) as ApiResult<CommunicationsPayload>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Kommunikationsdaten konnten nicht geladen werden."
            : result.error.message
        );
        return;
      }
      setSettings({
        contactEmail: result.data.settings.contactEmail,
        pressEmail: result.data.settings.pressEmail,
        partnersEmail: result.data.settings.partnersEmail,
      });
      setRequests(result.data.requests);
    } catch {
      setMessage("Verbindung zur Kommunikationsverwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/communications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as ApiResult<Settings>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Einstellungen konnten nicht gespeichert werden."
            : result.error.message
        );
        return;
      }
      setSettings({
        contactEmail: result.data.contactEmail,
        pressEmail: result.data.pressEmail,
        partnersEmail: result.data.partnersEmail,
      });
      setMessage("Kontakt-E-Mails gespeichert.");
    } catch {
      setMessage("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: RequestStatus) {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, id, status }),
      });
      const result = (await response.json()) as ApiResult<RequestRow>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Status konnte nicht aktualisiert werden."
            : result.error.message
        );
        return;
      }
      setRequests((prev) => ({
        ...prev,
        [channel]: prev[channel].map((row) =>
          row.id === id ? { ...row, status: result.data.status } : row
        ),
      }));
    } catch {
      setMessage("Status-Update fehlgeschlagen.");
    }
  }

  const rows = requests[channel];

  return (
    <section
      className="mt-6 rounded-[1.4rem] border border-white/[0.07] bg-white/[0.015] p-5 md:p-6"
      aria-labelledby="admin-comms-heading"
    >
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[8px] tracking-[.16em] text-white/25">
            SYSTEM / KOMMUNIKATION
          </p>
          <InfoHeading
            id="admin-comms-heading"
            as="h2"
            className="mt-2 text-xl font-medium text-white/75"
            label="Kontakt & Kommunikation"
            info="Verwalten Sie Ziel-E-Mails für Kontakt, Presse und Partnerschaften sowie eingehende Anfragen. Der eigentliche SMTP-Versand folgt später."
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start rounded-lg border border-white/10 px-3 py-2 font-mono text-[9px] tracking-[.12em] text-white/40 transition hover:border-cyber-cyan/30 hover:text-cyber-cyan"
        >
          Aktualisieren
        </button>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-cyber-cyan/15 bg-cyber-cyan/[0.04] px-4 py-3 text-sm text-white/55">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={saveSettings}
        className="mb-8 grid gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:grid-cols-3"
      >
        {(
          [
            ["contactEmail", "Kontakt E-Mail"],
            ["pressEmail", "Presse E-Mail"],
            ["partnersEmail", "Partnerschafts E-Mail"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-2 block font-mono text-[8px] tracking-[.14em] text-white/30">
              {label.toUpperCase()}
            </label>
            <input
              type="email"
              required
              value={settings[key]}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className="w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            />
          </div>
        ))}
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.1] px-4 py-2 font-mono text-[9px] tracking-[.14em] text-cyber-cyan disabled:opacity-50"
          >
            {saving ? "Speichert…" : "E-Mail-Ziele speichern"}
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(channelLabel) as Channel[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setChannel(key)}
            className={`rounded-lg border px-3 py-2 font-mono text-[9px] tracking-[.12em] transition ${
              channel === key
                ? "border-cyber-cyan/35 bg-cyber-cyan/[0.1] text-cyber-cyan"
                : "border-white/10 text-white/35 hover:border-white/20"
            }`}
          >
            {channelLabel[key]} ({requests[key].length})
          </button>
        ))}
      </div>

      {loading ? (
        <InfoPanel
          title="Lädt Anfragen…"
          description="Kommunikationsdaten werden synchronisiert."
          compact
        />
      ) : rows.length === 0 ? (
        <InfoPanel
          title="Keine Anfragen"
          description={`Für ${channelLabel[channel]} liegen noch keine Einträge vor.`}
          compact
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={`${channel}-${row.id}`}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
                    #{row.id} · {statusLabel[row.status]} · {row.createdAt}
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    {row.name}{" "}
                    <span className="text-white/35">&lt;{row.email}&gt;</span>
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {row.subject ??
                      row.topic ??
                      row.partnershipType ??
                      row.medium ??
                      row.company ??
                      "—"}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">
                    {row.message}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "new",
                      "processing",
                      "answered",
                      "archived",
                    ] as RequestStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateStatus(row.id, status)}
                      className={`rounded border px-2 py-1 font-mono text-[8px] tracking-[.1em] ${
                        row.status === status
                          ? "border-cyber-cyan/30 text-cyber-cyan"
                          : "border-white/10 text-white/30 hover:border-white/20"
                      }`}
                    >
                      {statusLabel[status]}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
