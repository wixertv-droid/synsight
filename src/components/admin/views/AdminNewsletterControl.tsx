"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "standard" | "product" | "security" | "promotion" | "content";

type Tab =
  | "overview"
  | "campaigns"
  | "calendar"
  | "templates"
  | "subscribers"
  | "settings";

type Campaign = {
  id: number;
  internalName: string;
  subject: string;
  preheader: string | null;
  status: string;
  templateId: number | null;
  contentJson: unknown;
  renderedHtml: string;
  senderName: string | null;
  replyTo: string | null;
  scheduledAt: string | null;
  scheduleTimezone: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  contentJson: unknown;
  renderedHtml: string;
  isSystem: boolean;
};

type Subscriber = {
  id: number;
  userId: number | null;
  email: string;
  name: string | null;
  status: string;
  source: string;
  consentAt: string | null;
  unsubscribedAt: string | null;
  bounceCount: number;
  createdAt: string;
};

type Settings = {
  enabled: boolean;
  defaultSenderName: string;
  defaultReplyTo: string | null;
  defaultTimezone: string;
  batchSize: number;
  workerIntervalSeconds: number;
  unsubscribeFooterText: string | null;
  companyAddress: string | null;
};

type Overview = {
  stats: {
    campaigns: number;
    drafts: number;
    scheduled: number;
    sent: number;
    subscribers: number;
    unsubscribed: number;
    failedDeliveries: number;
    queuedDeliveries: number;
  };
  upcoming: Campaign[];
  latest: Campaign[];
};

type ApiResult<T> = {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
};

type Block =
  | {
      id: string;
      type: "heading";
      text: string;
    }
  | {
      id: string;
      type: "text";
      text: string;
    }
  | {
      id: string;
      type: "button";
      text: string;
      url: string;
    }
  | {
      id: string;
      type: "divider";
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function themeFromCategory(category?: string | null): Theme {
  if (category === "product") return "product";
  if (category === "security") return "security";
  if (category === "promotion") return "promotion";
  if (category === "content") return "content";
  return "standard";
}

function isTheme(value: unknown): value is Theme {
  return ["standard", "product", "security", "promotion", "content"].includes(
    String(value)
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderBlocks(blocks: Block[], preheader: string, theme: Theme) {
  const themes = {
    standard: {
      accent: "#e879f9",
      button: "#c026d3",
      border: "#4a044e",
      glow: "#701a75",
      eyebrow: "SYNSIGHT // DIGITAL IDENTITY",
    },
    product: {
      accent: "#67e8f9",
      button: "#0891b2",
      border: "#164e63",
      glow: "#083344",
      eyebrow: "SYNSIGHT // PRODUCT UPDATE",
    },
    security: {
      accent: "#fb7185",
      button: "#e11d48",
      border: "#881337",
      glow: "#4c0519",
      eyebrow: "SYNSIGHT // SECURITY ALERT",
    },
    promotion: {
      accent: "#f0abfc",
      button: "#c026d3",
      border: "#713f12",
      glow: "#4a044e",
      eyebrow: "SYNSIGHT // EXCLUSIVE ACCESS",
    },
    content: {
      accent: "#a78bfa",
      button: "#7c3aed",
      border: "#312e81",
      glow: "#2e1065",
      eyebrow: "SYNSIGHT // INTELLIGENCE",
    },
  } as const;

  const design = themes[theme];

  const body = blocks
    .map((block) => {
      if (block.type === "heading") {
        return `
          <h1 style="
            margin:0 0 22px;
            font-size:34px;
            line-height:1.15;
            color:#ffffff;
            letter-spacing:-0.6px;
          ">
            ${escapeHtml(block.text)}
          </h1>
        `;
      }

      if (block.type === "text") {
        return `
          <p style="
            margin:0 0 20px;
            font-size:16px;
            line-height:1.75;
            color:#d4d4d8;
          ">
            ${escapeHtml(block.text).replaceAll("\n", "<br>")}
          </p>
        `;
      }

      if (block.type === "button") {
        return `
          <p style="margin:30px 0">
            <a
              href="${escapeHtml(block.url)}"
              style="
                display:inline-block;
                background:${design.button};
                color:#ffffff;
                text-decoration:none;
                font-weight:700;
                padding:14px 22px;
                border-radius:10px;
                box-shadow:0 0 28px ${design.glow};
              "
            >
              ${escapeHtml(block.text)}
            </a>
          </p>
        `;
      }

      return `
        <div style="
          height:1px;
          background:linear-gradient(
            90deg,
            transparent,
            ${design.accent},
            transparent
          );
          opacity:.45;
          margin:30px 0;
        "></div>
      `;
    })
    .join("");

  return `
<!doctype html>
<html>
<body style="
  margin:0;
  padding:36px 16px;
  background:#030407;
  font-family:Arial,sans-serif;
">
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
  ">
    ${escapeHtml(preheader)}
  </div>

  <div style="
    max-width:680px;
    margin:0 auto;
    background:#080a0f;
    border:1px solid ${design.border};
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 0 70px ${design.glow};
  ">
    <div style="
      height:3px;
      background:${design.accent};
      box-shadow:0 0 25px ${design.accent};
    "></div>

    <div style="padding:36px">
      <div style="
        margin-bottom:30px;
        font-size:12px;
        font-weight:700;
        color:${design.accent};
        text-transform:uppercase;
        letter-spacing:2.4px;
      ">
        ${design.eyebrow}
      </div>

      ${body}

      <div style="
        margin-top:40px;
        padding-top:24px;
        border-top:1px solid #27272a;
        color:#71717a;
        font-size:12px;
        line-height:1.7;
      ">
        <strong style="color:#a1a1aa">
          SynSight
        </strong>
        <br>
        Digitale Identität & Sicherheit
        <br>
        {{company_address}}
        <br><br>
        <a
          href="{{unsubscribe_url}}"
          style="color:${design.accent}"
        >
          Newsletter abmelden
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function formatDate(value: string | null) {
  if (!value) return "–";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Entwurf",
    scheduled: "Geplant",
    sending: "Versand läuft",
    sent: "Versendet",
    paused: "Pausiert",
    cancelled: "Abgebrochen",
    failed: "Fehler",
  };

  return map[status] ?? status;
}

function statusClass(status: string) {
  if (status === "sent") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "scheduled") {
    return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  }

  if (status === "failed") {
    return "border-red-400/30 bg-red-400/10 text-red-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

export default function AdminNewsletterControl() {
  const [tab, setTab] = useState<Tab>("overview");

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");

  const [overview, setOverview] = useState<Overview | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  const [settings, setSettings] = useState<Settings | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [internalName, setInternalName] = useState("");

  const [subject, setSubject] = useState("");

  const [preheader, setPreheader] = useState("");

  const [senderName, setSenderName] = useState("SynSight");

  const [replyTo, setReplyTo] = useState("");

  const [templateId, setTemplateId] = useState<number | null>(null);

  const [theme, setTheme] = useState<Theme>("standard");

  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: crypto.randomUUID(),
      type: "heading",
      text: "Neuigkeiten von SynSight",
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "Hier beginnt dein Newsletter.",
    },
  ]);

  const [scheduleAt, setScheduleAt] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const [subscriberEmail, setSubscriberEmail] = useState("");

  const [subscriberName, setSubscriberName] = useState("");

  const [subscriberConsent, setSubscriberConsent] = useState(false);

  const htmlPreview = useMemo(
    () => renderBlocks(blocks, preheader, theme),
    [blocks, preheader, theme]
  );

  async function fetchResource<T>(resource: string): Promise<T> {
    const response = await fetch(`/api/admin/newsletter?resource=${resource}`, {
      cache: "no-store",
    });

    const result = (await response.json()) as ApiResult<T>;

    if (!response.ok || !result.success) {
      throw new Error(
        result.error?.message ??
          "Newsletter-Daten konnten nicht geladen werden."
      );
    }

    return result.data;
  }

  async function loadAll() {
    setLoading(true);

    try {
      const [
        overviewData,
        campaignData,
        templateData,
        subscriberData,
        settingsData,
      ] = await Promise.all([
        fetchResource<Overview>("overview"),
        fetchResource<Campaign[]>("campaigns"),
        fetchResource<Template[]>("templates"),
        fetchResource<Subscriber[]>("subscribers"),
        fetchResource<Settings | null>("settings"),
      ]);

      setOverview(overviewData);

      setCampaigns(campaignData);

      setTemplates(templateData);

      setSubscribers(subscriberData);

      setSettings(settingsData);

      if (settingsData) {
        setSenderName(settingsData.defaultSenderName || "SynSight");

        setReplyTo(settingsData.defaultReplyTo ?? "");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Laden fehlgeschlagen."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function mutate(method: "POST" | "PATCH" | "DELETE", body: unknown) {
    const response = await fetch("/api/admin/newsletter", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as ApiResult<unknown>;

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message ?? "Aktion fehlgeschlagen.");
    }

    return result.data;
  }

  function resetEditor() {
    setEditingId(null);
    setInternalName("");
    setSubject("");
    setPreheader("");
    setTemplateId(null);
    setTheme("standard");

    setSenderName(settings?.defaultSenderName ?? "SynSight");

    setReplyTo(settings?.defaultReplyTo ?? "");

    setBlocks([
      {
        id: crypto.randomUUID(),
        type: "heading",
        text: "Neuigkeiten von SynSight",
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        text: "Hier beginnt dein Newsletter.",
      },
    ]);

    setScheduleAt("");
  }

  function openNewCampaign() {
    resetEditor();
    setEditorOpen(true);
  }

  function openCampaign(campaign: Campaign) {
    setEditingId(campaign.id);

    setInternalName(campaign.internalName);

    setSubject(campaign.subject);

    setPreheader(campaign.preheader ?? "");

    setSenderName(campaign.senderName ?? "SynSight");

    setReplyTo(campaign.replyTo ?? "");

    setTemplateId(campaign.templateId);

    const raw = campaign.contentJson as {
      blocks?: Block[];
      theme?: Theme;
    };

    const linkedTemplate = templates.find(
      (item) => item.id === campaign.templateId
    );

    setTheme(
      isTheme(raw?.theme)
        ? raw.theme
        : themeFromCategory(linkedTemplate?.category)
    );

    setBlocks(Array.isArray(raw?.blocks) ? raw.blocks : []);

    if (campaign.scheduledAt) {
      const date = new Date(campaign.scheduledAt);

      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setScheduleAt(local);
    } else {
      setScheduleAt("");
    }

    setEditorOpen(true);
  }

  function applyTemplate(id: number) {
    const template = templates.find((item) => item.id === id);

    if (!template) return;

    setTemplateId(id);
    setTheme(themeFromCategory(template.category));

    const raw = template.contentJson as {
      blocks?: Block[];
    };

    if (Array.isArray(raw?.blocks)) {
      setBlocks(
        raw.blocks.map((block) => ({
          ...block,
          id: crypto.randomUUID(),
        }))
      );
    }
  }

  function addBlock(type: Block["type"]) {
    if (type === "heading") {
      setBlocks([
        ...blocks,
        {
          id: crypto.randomUUID(),
          type,
          text: "Neue Überschrift",
        },
      ]);
      return;
    }

    if (type === "text") {
      setBlocks([
        ...blocks,
        {
          id: crypto.randomUUID(),
          type,
          text: "Neuer Textblock",
        },
      ]);
      return;
    }

    if (type === "button") {
      setBlocks([
        ...blocks,
        {
          id: crypto.randomUUID(),
          type,
          text: "Mehr erfahren",
          url: "https://synsight.de",
        },
      ]);
      return;
    }

    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type: "divider",
      },
    ]);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const next = [...blocks];

    const target = index + direction;

    if (target < 0 || target >= next.length) {
      return;
    }

    [next[index], next[target]] = [next[target], next[index]];

    setBlocks(next);
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter((block) => block.id !== id));
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks(
      blocks.map((block) =>
        block.id === id
          ? ({
              ...block,
              ...patch,
            } as Block)
          : block
      )
    );
  }

  async function saveCampaign() {
    if (!internalName.trim() || !subject.trim()) {
      setMessage("Interner Name und Betreff sind erforderlich.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const contentJson = {
        version: 2,
        theme,
        blocks,
      };

      let campaignId = editingId;

      if (campaignId) {
        await mutate("PATCH", {
          action: "update_campaign",
          id: campaignId,
          internalName,
          subject,
          preheader: preheader || null,
          templateId,
          contentJson,
          renderedHtml: htmlPreview,
          senderName,
          replyTo: replyTo || null,
        });
      } else {
        const created = (await mutate("POST", {
          action: "create_campaign",
          internalName,
          subject,
          preheader: preheader || null,
          templateId,
          contentJson,
          renderedHtml: htmlPreview,
          senderName,
          replyTo: replyTo || null,
        })) as {
          id: number;
        };

        campaignId = created.id;

        setEditingId(created.id);
      }

      const previous = campaigns.find((campaign) => campaign.id === campaignId);

      if (scheduleAt && campaignId) {
        await mutate("PATCH", {
          action: "schedule",
          id: campaignId,
          scheduledAt: new Date(scheduleAt).toISOString(),
          timezone: settings?.defaultTimezone ?? "Europe/Berlin",
        });

        const scheduledDate = new Date(scheduleAt);

        setCalendarMonth(
          new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1)
        );

        setMessage("Newsletter gespeichert und im Versandkalender eingeplant.");
      } else {
        if (previous?.status === "scheduled") {
          await mutate("PATCH", {
            action: "cancel_schedule",
            id: campaignId,
          });
        }

        setMessage(
          editingId ? "Newsletter gespeichert." : "Newsletter-Entwurf erstellt."
        );
      }

      await loadAll();
      setEditorOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendNow() {
    if (!internalName.trim() || !subject.trim()) {
      setMessage("Interner Name und Betreff sind erforderlich.");
      return;
    }

    if (
      !window.confirm(
        "Newsletter jetzt wirklich an alle aktiven Empfänger versenden?"
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const contentJson = {
        version: 2,
        theme,
        blocks,
      };

      let campaignId = editingId;

      if (campaignId) {
        await mutate("PATCH", {
          action: "update_campaign",
          id: campaignId,
          internalName,
          subject,
          preheader: preheader || null,
          templateId,
          contentJson,
          renderedHtml: htmlPreview,
          senderName,
          replyTo: replyTo || null,
        });
      } else {
        const created = (await mutate("POST", {
          action: "create_campaign",
          internalName,
          subject,
          preheader: preheader || null,
          templateId,
          contentJson,
          renderedHtml: htmlPreview,
          senderName,
          replyTo: replyTo || null,
        })) as {
          id: number;
        };

        campaignId = created.id;

        setEditingId(created.id);
      }

      await mutate("PATCH", {
        action: "send_now",
        id: campaignId,
      });

      setMessage("Newsletter wurde zum sofortigen Versand freigegeben.");

      await loadAll();
      setEditorOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Sofortversand fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function scheduleCampaign(id: number) {
    if (!scheduleAt) {
      setMessage("Bitte Datum und Uhrzeit auswählen.");
      return;
    }

    setBusy(true);

    try {
      await mutate("PATCH", {
        action: "schedule",
        id,
        scheduledAt: new Date(scheduleAt).toISOString(),
        timezone: settings?.defaultTimezone ?? "Europe/Berlin",
      });

      setMessage("Newsletter wurde geplant.");

      await loadAll();
      setEditorOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Planung fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelSchedule(id: number) {
    setBusy(true);

    try {
      await mutate("PATCH", {
        action: "cancel_schedule",
        id,
      });

      setMessage("Planung aufgehoben.");

      await loadAll();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aktion fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign(id: number) {
    if (!window.confirm("Diesen Newsletter-Entwurf wirklich löschen?")) {
      return;
    }

    setBusy(true);

    try {
      await mutate("DELETE", {
        id,
      });

      setMessage("Newsletter gelöscht.");

      await loadAll();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addSubscriber() {
    if (!subscriberConsent) {
      setMessage(
        "Die dokumentierte Newsletter-Einwilligung muss bestätigt werden."
      );
      return;
    }

    setBusy(true);

    try {
      await mutate("POST", {
        action: "add_subscriber",
        email: subscriberEmail,
        name: subscriberName || null,
        consentConfirmed: true,
      });

      setSubscriberEmail("");
      setSubscriberName("");
      setSubscriberConsent(false);

      setMessage("Empfänger hinzugefügt.");

      await loadAll();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Empfänger konnte nicht hinzugefügt werden."
      );
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe(id: number) {
    setBusy(true);

    try {
      await mutate("PATCH", {
        action: "unsubscribe",
        id,
      });

      setMessage("Empfänger abgemeldet.");

      await loadAll();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Abmeldung fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setBusy(true);

    try {
      await mutate("PATCH", {
        action: "settings",
        ...settings,
      });

      setMessage("Newsletter-Einstellungen gespeichert.");

      await loadAll();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  const scheduledByDate = useMemo(() => {
    const map = new Map<string, Campaign[]>();

    campaigns
      .filter(
        (campaign) => campaign.status === "scheduled" && campaign.scheduledAt
      )
      .forEach((campaign) => {
        const key = localDateKey(new Date(campaign.scheduledAt!));

        map.set(key, [...(map.get(key) ?? []), campaign]);
      });

    return map;
  }, [campaigns]);

  const currentMonth = calendarMonth;

  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const calendarDays: Array<Date | null> = [];

  let startOffset = monthStart.getDay();

  startOffset = startOffset === 0 ? 6 : startOffset - 1;

  for (let i = 0; i < startOffset; i += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    calendarDays.push(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    );
  }

  const tabs: Array<{
    id: Tab;
    label: string;
  }> = [
    {
      id: "overview",
      label: "Übersicht",
    },
    {
      id: "campaigns",
      label: "Kampagnen",
    },
    {
      id: "calendar",
      label: "Kalender",
    },
    {
      id: "templates",
      label: "Templates",
    },
    {
      id: "subscribers",
      label: "Empfänger",
    },
    {
      id: "settings",
      label: "Einstellungen",
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-zinc-400">
        Newsletter-Center wird geladen …
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
              A8 · Newsletter Command Center
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Newsletter & Kampagnen
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Newsletter gestalten, Empfänger verwalten, Versandtermine planen
              und Kampagnen zentral überwachen.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewCampaign}
            className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2.5 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-400/20"
          >
            + Newsletter erstellen
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                tab === item.id
                  ? "bg-fuchsia-400/15 text-fuchsia-200"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 px-4 py-3 text-sm text-fuchsia-100">
          {message}
        </div>
      ) : null}

      {tab === "overview" && overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Kampagnen", overview.stats.campaigns],
              ["Geplant", overview.stats.scheduled],
              ["Aktive Empfänger", overview.stats.subscribers],
              ["Versandfehler", overview.stats.failedDeliveries],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <p className="text-sm text-zinc-400">{label}</p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-semibold text-white">
                Nächste geplante Newsletter
              </h3>

              <div className="mt-4 space-y-3">
                {overview.upcoming.length ? (
                  overview.upcoming.map((campaign) => (
                    <button
                      type="button"
                      key={campaign.id}
                      onClick={() => openCampaign(campaign)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
                    >
                      <p className="font-medium text-zinc-200">
                        {campaign.internalName}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(campaign.scheduledAt)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">
                    Noch keine Newsletter geplant.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-semibold text-white">Status</h3>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-zinc-500">Entwürfe</p>

                  <p className="mt-2 text-xl text-white">
                    {overview.stats.drafts}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-zinc-500">Versendet</p>

                  <p className="mt-2 text-xl text-white">
                    {overview.stats.sent}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-zinc-500">Abgemeldet</p>

                  <p className="mt-2 text-xl text-white">
                    {overview.stats.unsubscribed}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-zinc-500">Warteschlange</p>

                  <p className="mt-2 text-xl text-white">
                    {overview.stats.queuedDeliveries}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === "campaigns" ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Kampagnen</h3>

            <span className="text-xs text-zinc-500">
              {campaigns.length} gesamt
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {campaigns.length ? (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-100">
                        {campaign.internalName}
                      </p>

                      <span
                        className={`rounded-md border px-2 py-1 text-[11px] ${statusClass(
                          campaign.status
                        )}`}
                      >
                        {statusLabel(campaign.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-400">
                      {campaign.subject}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      {campaign.scheduledAt
                        ? `Versand: ${formatDate(campaign.scheduledAt)}`
                        : `Erstellt: ${formatDate(campaign.createdAt)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {campaign.status !== "sent" ? (
                      <button
                        type="button"
                        onClick={() => openCampaign(campaign)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
                      >
                        Bearbeiten
                      </button>
                    ) : null}

                    {campaign.status === "scheduled" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void cancelSchedule(campaign.id)}
                        className="rounded-lg border border-amber-400/20 px-3 py-2 text-xs text-amber-200"
                      >
                        Planung aufheben
                      </button>
                    ) : null}

                    {campaign.status === "draft" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteCampaign(campaign.id)}
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200"
                      >
                        Löschen
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Noch keine Kampagnen vorhanden.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "calendar" ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1
                  )
                )
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]"
            >
              ←
            </button>

            <h3 className="text-lg font-semibold capitalize text-white">
              {new Intl.DateTimeFormat("de-DE", {
                month: "long",
                year: "numeric",
              }).format(currentMonth)}
            </h3>

            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1
                  )
                )
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]"
            >
              →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}

            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-24" />;
              }

              const key = localDateKey(date);

              const entries = scheduledByDate.get(key) ?? [];

              return (
                <div
                  key={key}
                  className="min-h-24 rounded-xl border border-white/10 bg-white/[0.02] p-2 text-left"
                >
                  <p className="text-xs font-medium text-zinc-400">
                    {date.getDate()}
                  </p>

                  <div className="mt-2 space-y-1">
                    {entries.map((campaign) => (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => openCampaign(campaign)}
                        className="block w-full rounded-md bg-fuchsia-400/10 px-2 py-1 text-left text-[10px] text-fuchsia-200"
                      >
                        {campaign.internalName}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "templates" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{template.name}</h3>

                {template.isSystem ? (
                  <span className="rounded-md bg-fuchsia-400/10 px-2 py-1 text-[10px] text-fuchsia-200">
                    SynSight
                  </span>
                ) : null}
              </div>

              <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">
                {template.description ?? "Eigene Newsletter-Vorlage"}
              </p>

              <button
                type="button"
                onClick={() => {
                  resetEditor();
                  applyTemplate(template.id);
                  setEditorOpen(true);
                }}
                className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:bg-white/[0.05]"
              >
                Vorlage verwenden
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "subscribers" ? (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h3 className="font-semibold text-white">Empfänger hinzufügen</h3>

            <div className="mt-4 space-y-3">
              <input
                value={subscriberName}
                onChange={(event) => setSubscriberName(event.target.value)}
                placeholder="Name optional"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
              />

              <input
                type="email"
                value={subscriberEmail}
                onChange={(event) => setSubscriberEmail(event.target.value)}
                placeholder="E-Mail-Adresse"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
              />

              <label className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">
                <input
                  type="checkbox"
                  checked={subscriberConsent}
                  onChange={(event) =>
                    setSubscriberConsent(event.target.checked)
                  }
                  className="mt-1"
                />

                <span>
                  Ich bestätige, dass eine dokumentierte Einwilligung zum
                  Newsletter-Versand vorliegt.
                </span>
              </label>

              <button
                type="button"
                disabled={busy || !subscriberEmail}
                onClick={() => void addSubscriber()}
                className="w-full rounded-xl bg-fuchsia-500/20 px-4 py-2.5 text-sm font-medium text-fuchsia-100 disabled:opacity-40"
              >
                Empfänger hinzufügen
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h3 className="font-semibold text-white">Empfänger</h3>

            <div className="mt-4 space-y-2">
              {subscribers.length ? (
                subscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {subscriber.name ?? subscriber.email}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {subscriber.email}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-600">
                        Zustimmung: {formatDate(subscriber.consentAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-1 text-[10px] ${
                          subscriber.status === "active"
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border-white/10 text-zinc-500"
                        }`}
                      >
                        {subscriber.status}
                      </span>

                      {subscriber.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => void unsubscribe(subscriber.id)}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400"
                        >
                          Abmelden
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Noch keine Empfänger vorhanden.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "settings" && settings ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="grid max-w-4xl gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-400">
              <span>Newsletter-System</span>

              <select
                value={settings.enabled ? "on" : "off"}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    enabled: event.target.value === "on",
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              >
                <option value="off">Deaktiviert</option>
                <option value="on">Aktiviert</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-zinc-400">
              <span>Standard-Absendername</span>

              <input
                value={settings.defaultSenderName}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultSenderName: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-400">
              <span>Reply-To</span>

              <input
                type="email"
                value={settings.defaultReplyTo ?? ""}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultReplyTo: event.target.value || null,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-400">
              <span>Zeitzone</span>

              <input
                value={settings.defaultTimezone}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultTimezone: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-400">
              <span>Nachrichten pro Batch</span>

              <input
                type="number"
                min={1}
                max={250}
                value={settings.batchSize}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    batchSize: Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-400">
              <span>Worker-Prüfung in Sekunden</span>

              <input
                type="number"
                min={10}
                max={3600}
                value={settings.workerIntervalSeconds}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    workerIntervalSeconds: Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-400 md:col-span-2">
              <span>Firmenanschrift im Newsletter</span>

              <input
                value={settings.companyAddress ?? ""}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    companyAddress: event.target.value || null,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSettings()}
            className="mt-5 rounded-xl bg-fuchsia-500/20 px-4 py-2.5 text-sm font-medium text-fuchsia-100"
          >
            Einstellungen speichern
          </button>

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            SMTP-Zugangsdaten für das Newsletter-Postfach werden weiterhin
            zentral unter A3 → Kontakt & E-Mail verwaltet.
          </p>
        </div>
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-fuchsia-300">
                  Newsletter Editor
                </p>

                <h3 className="mt-1 text-xl font-semibold text-white">
                  {editingId ? "Newsletter bearbeiten" : "Newsletter erstellen"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400"
              >
                Schließen
              </button>
            </div>

            <div className="grid xl:grid-cols-[360px_minmax(0,1fr)_minmax(360px,0.8fr)]">
              <div className="space-y-4 border-r border-white/10 p-5">
                <label className="block space-y-2">
                  <span className="text-xs text-zinc-500">Vorlage</span>

                  <select
                    value={templateId ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);

                      if (value) {
                        applyTemplate(value);
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">Keine Vorlage</option>

                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs text-zinc-500">SynSight Design</span>

                  <select
                    value={theme}
                    onChange={(event) => setTheme(event.target.value as Theme)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                  >
                    <option value="standard">Digital Identity · Magenta</option>
                    <option value="product">Product Update · Cyan</option>
                    <option value="security">Security Alert · Rot</option>
                    <option value="promotion">Promotion · Magenta/Gold</option>
                    <option value="content">Intelligence · Violett</option>
                  </select>
                </label>

                <input
                  value={internalName}
                  onChange={(event) => setInternalName(event.target.value)}
                  placeholder="Interner Kampagnenname"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                />

                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="E-Mail-Betreff"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                />

                <input
                  value={preheader}
                  onChange={(event) => setPreheader(event.target.value)}
                  placeholder="Preheader / Vorschautext"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                />

                <input
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="Absendername"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                />

                <input
                  value={replyTo}
                  onChange={(event) => setReplyTo(event.target.value)}
                  placeholder="Reply-To optional"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                />

                <div className="border-t border-white/10 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Blöcke hinzufügen
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => addBlock("heading")}
                      className="rounded-lg border border-white/10 p-2 text-xs text-zinc-300"
                    >
                      + Überschrift
                    </button>

                    <button
                      type="button"
                      onClick={() => addBlock("text")}
                      className="rounded-lg border border-white/10 p-2 text-xs text-zinc-300"
                    >
                      + Text
                    </button>

                    <button
                      type="button"
                      onClick={() => addBlock("button")}
                      className="rounded-lg border border-white/10 p-2 text-xs text-zinc-300"
                    >
                      + Button
                    </button>

                    <button
                      type="button"
                      onClick={() => addBlock("divider")}
                      className="rounded-lg border border-white/10 p-2 text-xs text-zinc-300"
                    >
                      + Trenner
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="block space-y-2">
                    <span className="text-xs text-zinc-500">Versandtermin</span>

                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(event) => setScheduleAt(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveCampaign()}
                    className="rounded-xl bg-fuchsia-500/20 px-4 py-2.5 text-sm font-medium text-fuchsia-100"
                  >
                    {scheduleAt ? "Speichern & planen" : "Entwurf speichern"}
                  </button>

                  <button
                    type="button"
                    disabled={busy || !settings?.enabled}
                    onClick={() => void sendNow()}
                    className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 disabled:opacity-40"
                    title={
                      settings?.enabled
                        ? "Newsletter sofort versenden"
                        : "Newsletter-System zuerst unter Einstellungen aktivieren"
                    }
                  >
                    Newsletter sofort versenden
                  </button>

                  {!settings?.enabled ? (
                    <p className="text-[11px] leading-5 text-amber-300/70">
                      Sofortversand wird verfügbar, sobald das Newsletter-System
                      aktiviert ist.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 border-r border-white/10 p-5">
                <h4 className="font-medium text-white">Inhalt</h4>

                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-zinc-500">
                        {block.type}
                      </span>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(index, -1)}
                          className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-500"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() => moveBlock(index, 1)}
                          className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-500"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="rounded border border-red-400/20 px-2 py-1 text-xs text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {block.type === "heading" ? (
                      <input
                        value={block.text}
                        onChange={(event) =>
                          updateBlock(block.id, {
                            text: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                    ) : null}

                    {block.type === "text" ? (
                      <textarea
                        rows={5}
                        value={block.text}
                        onChange={(event) =>
                          updateBlock(block.id, {
                            text: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                    ) : null}

                    {block.type === "button" ? (
                      <div className="space-y-2">
                        <input
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(block.id, {
                              text: event.target.value,
                            })
                          }
                          placeholder="Buttontext"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />

                        <input
                          value={block.url}
                          onChange={(event) =>
                            updateBlock(block.id, {
                              url: event.target.value,
                            })
                          }
                          placeholder="https://..."
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </div>
                    ) : null}

                    {block.type === "divider" ? (
                      <div className="border-t border-white/20" />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="bg-black/30 p-5">
                <p className="mb-4 text-xs uppercase tracking-wider text-zinc-500">
                  Live-Vorschau
                </p>

                <div
                  className="overflow-hidden rounded-xl border border-white/10 bg-black"
                  dangerouslySetInnerHTML={{
                    __html: htmlPreview,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
