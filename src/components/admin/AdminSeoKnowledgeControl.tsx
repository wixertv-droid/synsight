"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import InfoHeading from "@/components/ui/InfoHeading";

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

type PageListItem = {
  id: number;
  slug: string;
  title: string;
  language: string;
  status: "draft" | "published" | "archived";
  category: string;
  targetModule: string;
  seoPriority: "hoch" | "mittel" | "niedrig";
  searchVolume: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type SectionForm = {
  key: string;
  sortOrder: number;
  sectionType: "content" | "infobox" | "hint" | "code" | "table" | "list";
  heading: string;
  body: string;
  imageUrl: string;
};

type FaqForm = {
  key: string;
  sortOrder: number;
  question: string;
  answer: string;
};
type LinkForm = {
  key: string;
  sortOrder: number;
  linkType: "wissen" | "analyse" | "landing" | "module";
  target: string;
  label: string;
};

type EditorForm = {
  slug: string;
  title: string;
  language: string;
  status: "draft" | "published" | "archived";
  category: string;
  targetModule: string;
  seoPriority: "hoch" | "mittel" | "niedrig";
  searchIntent:
    "informational" | "commercial" | "transactional" | "navigational";
  difficulty: "einsteiger" | "fortgeschritten" | "experte";
  riskLevel: "niedrig" | "mittel" | "hoch" | "kritisch";
  searchVolume: string;
  keywordDifficulty: string;
  seoTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCard: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  intro: string;
  ctaPreset:
    "analyse_starten" | "kostenlos_testen" | "jetzt_pruefen" | "custom";
  ctaLabel: string;
  ctaHref: string;
  sections: SectionForm[];
  faqs: FaqForm[];
  links: LinkForm[];
};

const CATEGORIES = [
  "OSINT",
  "Datenschutz",
  "Datenlecks",
  "Cybersecurity",
  "Social Media",
  "Reverse Image",
  "Google",
  "Benutzernamen",
  "Telefon",
  "Email",
  "Identität",
  "Sicherheit",
];

const TARGET_MODULES = [
  { value: "google", label: "Google Analyse" },
  { value: "username", label: "Username Intelligence" },
  { value: "digital-leak", label: "Digital Leak" },
  { value: "reverse-image", label: "Reverse Image Search" },
  { value: "face-scan", label: "FaceScan" },
  { value: "social", label: "Social Media Analyse" },
  { value: "phone", label: "Telefon Analyse" },
  { value: "email", label: "Email Analyse" },
  { value: "dashboard", label: "Dashboard" },
];

const CTA_PRESETS: Array<{
  value: EditorForm["ctaPreset"];
  label: string;
  href: string;
}> = [
  { value: "analyse_starten", label: "Analyse starten", href: "/analysen" },
  {
    value: "kostenlos_testen",
    label: "Kostenlos testen",
    href: "/#demo-scanner",
  },
  { value: "jetzt_pruefen", label: "Jetzt prüfen", href: "/#demo-scanner" },
  { value: "custom", label: "Eigener Buttontext", href: "/#demo-scanner" },
];

const statusLabel: Record<PageListItem["status"], string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  archived: "Archiviert",
};

const statusClass: Record<PageListItem["status"], string> = {
  draft: "text-amber-100/70 border-amber-300/15 bg-amber-300/[0.04]",
  published: "text-emerald-200/70 border-emerald-300/15 bg-emerald-300/[0.04]",
  archived: "text-white/40 border-white/10 bg-white/[0.02]",
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyEditor(): EditorForm {
  return {
    slug: "",
    title: "",
    language: "de",
    status: "draft",
    category: "OSINT",
    targetModule: "dashboard",
    seoPriority: "mittel",
    searchIntent: "informational",
    difficulty: "einsteiger",
    riskLevel: "mittel",
    searchVolume: "0",
    keywordDifficulty: "0",
    seoTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    twitterCard: "summary_large_image",
    robotsIndex: true,
    robotsFollow: true,
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl: "",
    intro: "",
    ctaPreset: "jetzt_pruefen",
    ctaLabel: "Jetzt prüfen",
    ctaHref: "/#demo-scanner",
    sections: [],
    faqs: [],
    links: [],
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function formatDate(value: string | null) {
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

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 outline-none focus:border-cyber-cyan/40";
const labelClass = "block text-[11px] tracking-wide text-white/45";

export default function AdminSeoKnowledgeControl({
  trashMode = false,
}: {
  trashMode?: boolean;
}) {
  const [items, setItems] = useState<PageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditorForm>(emptyEditor);
  const [slugLocked, setSlugLocked] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [targetModule, setTargetModule] = useState("");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (targetModule) params.set("targetModule", targetModule);
      if (priority !== "all") params.set("priority", priority);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      params.set("limit", "200");
      if (trashMode) params.set("trash", "1");

      const response = await fetch(`/api/admin/seo/knowledge?${params}`);
      const result = (await response.json()) as ApiResult<{
        items: PageListItem[];
        total: number;
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Laden fehlgeschlagen." : result.error.message
        );
        return;
      }
      setItems(result.data.items);
      setTotal(result.data.total);
      setMessage(null);
    } catch {
      setMessage("Verbindung zur SEO-Verwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [q, category, status, targetModule, priority, sortBy, sortDir, trashMode]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyEditor());
    setSlugLocked(false);
    setMode("edit");
  };

  const openEdit = async (id: number) => {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/seo/knowledge/${id}`);
      const result = (await response.json()) as ApiResult<
        Record<string, unknown>
      >;
      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Seite nicht geladen." : result.error.message
        );
        return;
      }
      const page = result.data as {
        id: number;
        slug: string;
        title: string;
        language: string;
        status: EditorForm["status"];
        category: string;
        targetModule: string;
        seoPriority: EditorForm["seoPriority"];
        searchIntent: EditorForm["searchIntent"];
        difficulty: EditorForm["difficulty"];
        riskLevel: EditorForm["riskLevel"];
        searchVolume: number;
        keywordDifficulty: number;
        seoTitle: string | null;
        metaDescription: string | null;
        metaKeywords: string | null;
        canonicalUrl: string | null;
        ogTitle: string | null;
        ogDescription: string | null;
        ogImageUrl: string | null;
        twitterCard: string;
        robotsIndex: boolean;
        robotsFollow: boolean;
        heroTitle: string | null;
        heroSubtitle: string | null;
        heroImageUrl: string | null;
        intro: string | null;
        ctaPreset: EditorForm["ctaPreset"];
        ctaLabel: string;
        ctaHref: string;
        sections: Array<{
          sortOrder: number;
          sectionType: SectionForm["sectionType"];
          heading: string | null;
          body: string | null;
          imageUrl: string | null;
        }>;
        faqs: Array<{ sortOrder: number; question: string; answer: string }>;
        links: Array<{
          sortOrder: number;
          linkType: LinkForm["linkType"];
          target: string;
          label: string;
        }>;
      };
      setEditingId(page.id);
      setSlugLocked(true);
      setForm({
        slug: page.slug,
        title: page.title,
        language: page.language,
        status: page.status,
        category: page.category,
        targetModule: page.targetModule,
        seoPriority: page.seoPriority,
        searchIntent: page.searchIntent,
        difficulty: page.difficulty,
        riskLevel: page.riskLevel,
        searchVolume: String(page.searchVolume ?? 0),
        keywordDifficulty: String(page.keywordDifficulty ?? 0),
        seoTitle: page.seoTitle ?? "",
        metaDescription: page.metaDescription ?? "",
        metaKeywords: page.metaKeywords ?? "",
        canonicalUrl: page.canonicalUrl ?? "",
        ogTitle: page.ogTitle ?? "",
        ogDescription: page.ogDescription ?? "",
        ogImageUrl: page.ogImageUrl ?? "",
        twitterCard: page.twitterCard ?? "summary_large_image",
        robotsIndex: page.robotsIndex,
        robotsFollow: page.robotsFollow,
        heroTitle: page.heroTitle ?? "",
        heroSubtitle: page.heroSubtitle ?? "",
        heroImageUrl: page.heroImageUrl ?? "",
        intro: page.intro ?? "",
        ctaPreset: page.ctaPreset,
        ctaLabel: page.ctaLabel,
        ctaHref: page.ctaHref,
        sections: (page.sections ?? []).map((s, i) => ({
          key: uid(),
          sortOrder: s.sortOrder ?? i,
          sectionType: s.sectionType,
          heading: s.heading ?? "",
          body: s.body ?? "",
          imageUrl: s.imageUrl ?? "",
        })),
        faqs: (page.faqs ?? []).map((f, i) => ({
          key: uid(),
          sortOrder: f.sortOrder ?? i,
          question: f.question,
          answer: f.answer,
        })),
        links: (page.links ?? []).map((l, i) => ({
          key: uid(),
          sortOrder: l.sortOrder ?? i,
          linkType: l.linkType,
          target: l.target,
          label: l.label,
        })),
      });
      setMode("edit");
    } catch {
      setMessage("Seite konnte nicht geladen werden.");
    }
  };

  const payloadFromForm = useMemo(() => {
    const preset = CTA_PRESETS.find((p) => p.value === form.ctaPreset);
    return {
      slug: form.slug,
      title: form.title,
      language: form.language,
      status: form.status,
      category: form.category,
      targetModule: form.targetModule,
      seoPriority: form.seoPriority,
      searchIntent: form.searchIntent,
      difficulty: form.difficulty,
      riskLevel: form.riskLevel,
      searchVolume: Number(form.searchVolume) || 0,
      keywordDifficulty: Number(form.keywordDifficulty) || 0,
      seoTitle: form.seoTitle || null,
      metaDescription: form.metaDescription || null,
      metaKeywords: form.metaKeywords || null,
      canonicalUrl: form.canonicalUrl || null,
      ogTitle: form.ogTitle || null,
      ogDescription: form.ogDescription || null,
      ogImageUrl: form.ogImageUrl || null,
      twitterCard: form.twitterCard || "summary_large_image",
      robotsIndex: form.robotsIndex,
      robotsFollow: form.robotsFollow,
      heroTitle: form.heroTitle || null,
      heroSubtitle: form.heroSubtitle || null,
      heroImageUrl: form.heroImageUrl || null,
      intro: form.intro || null,
      ctaPreset: form.ctaPreset,
      ctaLabel:
        form.ctaPreset === "custom"
          ? form.ctaLabel
          : (preset?.label ?? form.ctaLabel),
      ctaHref: form.ctaHref || preset?.href || "/#demo-scanner",
      sections: form.sections.map((s, i) => ({
        sortOrder: i,
        sectionType: s.sectionType,
        heading: s.heading || null,
        body: s.body || null,
        imageUrl: s.imageUrl || null,
        metaJson: null,
      })),
      faqs: form.faqs.map((f, i) => ({
        sortOrder: i,
        question: f.question,
        answer: f.answer,
      })),
      links: form.links.map((l, i) => ({
        sortOrder: i,
        linkType: l.linkType,
        target: l.target,
        label: l.label,
      })),
    };
  }, [form]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/admin/seo/knowledge/${editingId}`
          : "/api/admin/seo/knowledge",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm),
        }
      );
      const result = (await response.json()) as ApiResult<{
        id: number;
        slug: string;
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success ? "Speichern fehlgeschlagen." : result.error.message
        );
        return;
      }
      setMessage(
        editingId
          ? "Seite gespeichert. Öffentliche URL: /wissen/" + result.data.slug
          : "Seite erstellt. Öffentliche URL: /wissen/" + result.data.slug
      );
      setEditingId(result.data.id);
      setSlugLocked(true);
      await loadList();
    } catch {
      setMessage("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, hard = false) => {
    const label = hard
      ? "Seite endgültig löschen? Das kann nicht rückgängig gemacht werden."
      : "Seite in den Papierkorb verschieben?";
    if (!window.confirm(label)) return;
    const response = await fetch(
      `/api/admin/seo/knowledge/${id}${hard ? "?hard=1" : ""}`,
      { method: "DELETE" }
    );
    const result = (await response.json()) as ApiResult<unknown>;
    if (!response.ok || !result.success) {
      setMessage(
        result.success ? "Löschen fehlgeschlagen." : result.error.message
      );
      return;
    }
    setMessage(
      hard ? "Seite endgültig gelöscht." : "Seite in den Papierkorb gelegt."
    );
    if (editingId === id) {
      setMode("list");
      setEditingId(null);
    }
    await loadList();
  };

  const handleRestore = async (id: number) => {
    const response = await fetch(
      `/api/admin/seo/knowledge/${id}?action=restore`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }
    );
    // restore uses action=restore without body validation - wait, PATCH with empty body will fail validation.
    // Fix: restore is checked before body parse - good, but we still JSON.parse. Empty {} is fine but upsert schema will fail if we fall through.
    // Looking at PATCH - if action=restore, it returns early. Good.
    const result = (await response.json()) as ApiResult<unknown>;
    if (!response.ok || !result.success) {
      setMessage(
        result.success
          ? "Wiederherstellen fehlgeschlagen."
          : result.error.message
      );
      return;
    }
    setMessage("Seite wiederhergestellt.");
    await loadList();
  };

  const handleDuplicate = async (id: number) => {
    const response = await fetch(`/api/admin/seo/knowledge/${id}/duplicate`, {
      method: "POST",
    });
    const result = (await response.json()) as ApiResult<{ id: number }>;
    if (!response.ok || !result.success) {
      setMessage(
        result.success ? "Duplizieren fehlgeschlagen." : result.error.message
      );
      return;
    }
    setMessage("Kopie als Entwurf erstellt.");
    await loadList();
    await openEdit(result.data.id);
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return { ...prev, sections: next };
    });
  };

  const onSectionDragStart = (index: number) => (event: DragEvent) => {
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
  };

  const onSectionDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    const from = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isInteger(from) || from === index) return;
    setForm((prev) => {
      const next = [...prev.sections];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(index, 0, item);
      return { ...prev, sections: next };
    });
  };

  if (mode === "edit" && !trashMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <InfoHeading
              label={
                editingId ? "Wissensseite bearbeiten" : "Neue Wissensseite"
              }
              info="Inhalte werden nach dem Speichern automatisch unter /wissen/[slug] ausgeliefert — ohne manuelle HTML-Dateien."
              as="h2"
              className="text-xl font-semibold text-white/90"
            />
            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Speichern erzeugt die öffentliche Seite unter /wissen/[slug] —
              ohne manuelle HTML-Dateien.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:border-white/25"
              onClick={() => {
                setMode("list");
                void loadList();
              }}
            >
              Zurück zur Übersicht
            </button>
            {editingId ? (
              <a
                href={`/wissen/${form.slug}${form.status !== "published" ? "?preview=1" : ""}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-3 py-2 text-xs text-cyber-cyan/90"
              >
                Vorschau öffnen
              </a>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {message}
          </p>
        ) : null}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Allgemein
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Titel
                <input
                  className={fieldClass}
                  required
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title,
                      slug: slugLocked ? prev.slug : slugify(title),
                      heroTitle: prev.heroTitle || title,
                      seoTitle: prev.seoTitle || title,
                    }));
                  }}
                />
              </label>
              <label className={labelClass}>
                URL-Slug
                <input
                  className={fieldClass}
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugLocked(true);
                    setForm((prev) => ({
                      ...prev,
                      slug: slugify(e.target.value),
                    }));
                  }}
                />
              </label>
              <label className={labelClass}>
                Kategorie
                <select
                  className={fieldClass}
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Sprache
                <select
                  className={fieldClass}
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, language: e.target.value }))
                  }
                >
                  <option value="de">Deutsch (de)</option>
                  <option value="en">English (en)</option>
                </select>
              </label>
              <label className={labelClass}>
                Status
                <select
                  className={fieldClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as EditorForm["status"],
                    }))
                  }
                >
                  <option value="draft">Entwurf</option>
                  <option value="published">Veröffentlicht</option>
                  <option value="archived">Archiviert</option>
                </select>
              </label>
              <label className={labelClass}>
                Zielmodul
                <select
                  className={fieldClass}
                  value={form.targetModule}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      targetModule: e.target.value,
                    }))
                  }
                >
                  {TARGET_MODULES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                SEO-Priorität
                <select
                  className={fieldClass}
                  value={form.seoPriority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      seoPriority: e.target.value as EditorForm["seoPriority"],
                    }))
                  }
                >
                  <option value="hoch">hoch</option>
                  <option value="mittel">mittel</option>
                  <option value="niedrig">niedrig</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              SEO
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                SEO-Titel
                <input
                  className={fieldClass}
                  value={form.seoTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, seoTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Canonical URL
                <input
                  className={fieldClass}
                  value={form.canonicalUrl}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      canonicalUrl: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Meta-Description
                <textarea
                  className={`${fieldClass} min-h-[72px]`}
                  value={form.metaDescription}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      metaDescription: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Meta-Keywords (kommagetrennt)
                <input
                  className={fieldClass}
                  value={form.metaKeywords}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      metaKeywords: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                OpenGraph Titel
                <input
                  className={fieldClass}
                  value={form.ogTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ogTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                OpenGraph Bild-URL
                <input
                  className={fieldClass}
                  value={form.ogImageUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ogImageUrl: e.target.value }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                OpenGraph Beschreibung
                <textarea
                  className={`${fieldClass} min-h-[64px]`}
                  value={form.ogDescription}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      ogDescription: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Twitter Card
                <select
                  className={fieldClass}
                  value={form.twitterCard}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      twitterCard: e.target.value,
                    }))
                  }
                >
                  <option value="summary_large_image">
                    summary_large_image
                  </option>
                  <option value="summary">summary</option>
                </select>
              </label>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={form.robotsIndex}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        robotsIndex: e.target.checked,
                      }))
                    }
                  />
                  robots index
                </label>
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={form.robotsFollow}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        robotsFollow: e.target.checked,
                      }))
                    }
                  />
                  robots follow
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Hero & Einleitung
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Hero-Titel
                <input
                  className={fieldClass}
                  value={form.heroTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, heroTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Hero-Bild-URL
                <input
                  className={fieldClass}
                  value={form.heroImageUrl}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      heroImageUrl: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Hero-Untertitel
                <input
                  className={fieldClass}
                  value={form.heroSubtitle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      heroSubtitle: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Einleitung (Rich Text / HTML oder Markdown)
                <textarea
                  className={`${fieldClass} min-h-[140px] font-mono text-[13px]`}
                  value={form.intro}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, intro: e.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Call-to-Action
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Vorgabe
                <select
                  className={fieldClass}
                  value={form.ctaPreset}
                  onChange={(e) => {
                    const value = e.target.value as EditorForm["ctaPreset"];
                    const preset = CTA_PRESETS.find((p) => p.value === value);
                    setForm((prev) => ({
                      ...prev,
                      ctaPreset: value,
                      ctaLabel: preset?.label ?? prev.ctaLabel,
                      ctaHref: preset?.href ?? prev.ctaHref,
                    }));
                  }}
                >
                  {CTA_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Buttontext
                <input
                  className={fieldClass}
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Button-Link
                <input
                  className={fieldClass}
                  value={form.ctaHref}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ctaHref: e.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Suchvolumen & Intent
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              <label className={labelClass}>
                Suchvolumen
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={form.searchVolume}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      searchVolume: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Keyword-Schwierigkeit (0–100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={fieldClass}
                  value={form.keywordDifficulty}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      keywordDifficulty: e.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Suchintention
                <select
                  className={fieldClass}
                  value={form.searchIntent}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      searchIntent: e.target
                        .value as EditorForm["searchIntent"],
                    }))
                  }
                >
                  <option value="informational">informational</option>
                  <option value="commercial">commercial</option>
                  <option value="transactional">transactional</option>
                  <option value="navigational">navigational</option>
                </select>
              </label>
              <label className={labelClass}>
                Schwierigkeit
                <select
                  className={fieldClass}
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      difficulty: e.target.value as EditorForm["difficulty"],
                    }))
                  }
                >
                  <option value="einsteiger">einsteiger</option>
                  <option value="fortgeschritten">fortgeschritten</option>
                  <option value="experte">experte</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Inhaltsbereiche (Drag & Drop)
            </h3>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] px-3 py-2 text-xs text-cyan-100"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    sections: [
                      ...prev.sections,
                      {
                        key: uid(),
                        sortOrder: prev.sections.length,
                        sectionType: "content",
                        heading: "",
                        body: "",
                        imageUrl: "",
                      },
                    ],
                  }))
                }
              >
                Abschnitt hinzufügen
              </button>
            </div>
            <div className="space-y-3">
              {form.sections.map((section, index) => (
                <div
                  key={section.key}
                  draggable
                  onDragStart={onSectionDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onSectionDrop(index)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tracking-[.14em] text-white/35">
                      ABSCHNITT {index + 1} · ziehen zum Sortieren
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-white/40 hover:text-white/70"
                        onClick={() => moveSection(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-xs text-white/40 hover:text-white/70"
                        onClick={() => moveSection(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-300/70"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            sections: prev.sections.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={labelClass}>
                      Typ
                      <select
                        className={fieldClass}
                        value={section.sectionType}
                        onChange={(e) =>
                          setForm((prev) => {
                            const sections = [...prev.sections];
                            sections[index] = {
                              ...section,
                              sectionType: e.target
                                .value as SectionForm["sectionType"],
                            };
                            return { ...prev, sections };
                          })
                        }
                      >
                        <option value="content">Inhalt</option>
                        <option value="infobox">Infobox</option>
                        <option value="hint">Hinweis</option>
                        <option value="code">Codeblock</option>
                        <option value="table">Tabelle</option>
                        <option value="list">Aufzählung</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Überschrift
                      <input
                        className={fieldClass}
                        value={section.heading}
                        onChange={(e) =>
                          setForm((prev) => {
                            const sections = [...prev.sections];
                            sections[index] = {
                              ...section,
                              heading: e.target.value,
                            };
                            return { ...prev, sections };
                          })
                        }
                      />
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      Inhalt
                      <textarea
                        className={`${fieldClass} min-h-[100px] font-mono text-[13px]`}
                        value={section.body}
                        onChange={(e) =>
                          setForm((prev) => {
                            const sections = [...prev.sections];
                            sections[index] = {
                              ...section,
                              body: e.target.value,
                            };
                            return { ...prev, sections };
                          })
                        }
                      />
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      Bild-URL
                      <input
                        className={fieldClass}
                        value={section.imageUrl}
                        onChange={(e) =>
                          setForm((prev) => {
                            const sections = [...prev.sections];
                            sections[index] = {
                              ...section,
                              imageUrl: e.target.value,
                            };
                            return { ...prev, sections };
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              {form.sections.length === 0 ? (
                <p className="text-sm text-white/35">Noch keine Abschnitte.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              FAQ (JSON-LD vorbereitet)
            </h3>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] px-3 py-2 text-xs text-cyan-100"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    faqs: [
                      ...prev.faqs,
                      {
                        key: uid(),
                        sortOrder: prev.faqs.length,
                        question: "",
                        answer: "",
                      },
                    ],
                  }))
                }
              >
                FAQ hinzufügen
              </button>
            </div>
            <div className="space-y-3">
              {form.faqs.map((faq, index) => (
                <div
                  key={faq.key}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-red-300/70"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          faqs: prev.faqs.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Entfernen
                    </button>
                  </div>
                  <label className={labelClass}>
                    Frage
                    <input
                      className={fieldClass}
                      value={faq.question}
                      onChange={(e) =>
                        setForm((prev) => {
                          const faqs = [...prev.faqs];
                          faqs[index] = { ...faq, question: e.target.value };
                          return { ...prev, faqs };
                        })
                      }
                    />
                  </label>
                  <label className={`${labelClass} mt-3`}>
                    Antwort
                    <textarea
                      className={`${fieldClass} min-h-[80px]`}
                      value={faq.answer}
                      onChange={(e) =>
                        setForm((prev) => {
                          const faqs = [...prev.faqs];
                          faqs[index] = { ...faq, answer: e.target.value };
                          return { ...prev, faqs };
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Interne Verlinkung
            </h3>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] px-3 py-2 text-xs text-cyan-100"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    links: [
                      ...prev.links,
                      {
                        key: uid(),
                        sortOrder: prev.links.length,
                        linkType: "wissen",
                        target: "",
                        label: "",
                      },
                    ],
                  }))
                }
              >
                Link hinzufügen
              </button>
            </div>
            <div className="space-y-3">
              {form.links.map((link, index) => (
                <div
                  key={link.key}
                  className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:grid-cols-4"
                >
                  <label className={labelClass}>
                    Typ
                    <select
                      className={fieldClass}
                      value={link.linkType}
                      onChange={(e) =>
                        setForm((prev) => {
                          const links = [...prev.links];
                          links[index] = {
                            ...link,
                            linkType: e.target.value as LinkForm["linkType"],
                          };
                          return { ...prev, links };
                        })
                      }
                    >
                      <option value="wissen">Wissensseite</option>
                      <option value="analyse">SynSight-Analyse</option>
                      <option value="landing">Landingpage</option>
                      <option value="module">Modul</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Ziel (Slug/Pfad)
                    <input
                      className={fieldClass}
                      value={link.target}
                      onChange={(e) =>
                        setForm((prev) => {
                          const links = [...prev.links];
                          links[index] = { ...link, target: e.target.value };
                          return { ...prev, links };
                        })
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    Label
                    <input
                      className={fieldClass}
                      value={link.label}
                      onChange={(e) =>
                        setForm((prev) => {
                          const links = [...prev.links];
                          links[index] = { ...link, label: e.target.value };
                          return { ...prev, links };
                        })
                      }
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-red-300/70"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          links: prev.links.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-2.5 text-sm font-semibold text-space-black disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Speichern"}
            </button>
            {editingId ? (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60"
                  onClick={() => void handleDuplicate(editingId)}
                >
                  Duplizieren
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-400/20 px-4 py-2.5 text-sm text-red-300/80"
                  onClick={() => void handleDelete(editingId, false)}
                >
                  In Papierkorb
                </button>
              </>
            ) : null}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <InfoHeading
            label={trashMode ? "Papierkorb" : "SEO & Wissensdatenbank"}
            info={
              trashMode
                ? "Gelöschte Seiten wiederherstellen oder endgültig entfernen."
                : "Verwaltung aller öffentlichen Wissensseiten — Inhalte live unter /wissen/[slug]."
            }
            as="h2"
            className="text-xl font-semibold text-white/90"
          />
          <p className="mt-2 max-w-2xl text-sm text-white/45">
            {trashMode
              ? "Gelöschte Seiten wiederherstellen oder endgültig entfernen."
              : "Verwaltung aller öffentlichen Wissensseiten — Inhalte live unter /wissen/[slug]."}
          </p>
        </div>
        {!trashMode ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-4 py-2.5 text-sm font-semibold text-space-black"
          >
            Neue Seite erstellen
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {message}
        </p>
      ) : null}

      {!trashMode ? (
        <div className="grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 md:grid-cols-3 lg:grid-cols-6">
          <label className={labelClass}>
            Suche
            <input
              className={fieldClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titel, Slug…"
            />
          </label>
          <label className={labelClass}>
            Kategorie
            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Alle</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Status
            <select
              className={fieldClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="archived">Archiviert</option>
            </select>
          </label>
          <label className={labelClass}>
            Zielmodul
            <select
              className={fieldClass}
              value={targetModule}
              onChange={(e) => setTargetModule(e.target.value)}
            >
              <option value="">Alle</option>
              {TARGET_MODULES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Priorität
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="hoch">hoch</option>
              <option value="mittel">mittel</option>
              <option value="niedrig">niedrig</option>
            </select>
          </label>
          <label className={labelClass}>
            Sortierung
            <div className="mt-1.5 flex gap-2">
              <select
                className={`${fieldClass} mt-0`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="title">Name</option>
                <option value="updatedAt">Datum</option>
                <option value="priority">Priorität</option>
                <option value="searchVolume">Suchvolumen</option>
              </select>
              <select
                className={`${fieldClass} mt-0 w-24`}
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </label>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] uppercase tracking-[.14em] text-white/35">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3">Modul</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prio</th>
              <th className="px-4 py-3">Sprache</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Geändert</th>
              <th className="px-4 py-3">Erstellt</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-white/35">
                  Lädt…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-white/35">
                  {trashMode ? "Papierkorb ist leer." : "Noch keine Seiten."}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] text-white/70 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-white/85">
                    {row.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-cyber-cyan/70">
                    {row.slug}
                  </td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3">{row.targetModule}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] ${statusClass[row.status]}`}
                    >
                      {statusLabel[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.seoPriority}</td>
                  <td className="px-4 py-3">{row.language}</td>
                  <td className="px-4 py-3">{row.authorName ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(row.updatedAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {trashMode ? (
                        <>
                          <button
                            type="button"
                            className="text-xs text-cyber-cyan/80"
                            onClick={() => void handleRestore(row.id)}
                          >
                            Wiederherstellen
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-300/70"
                            onClick={() => void handleDelete(row.id, true)}
                          >
                            Endgültig
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-xs text-cyber-cyan/80"
                            onClick={() => void openEdit(row.id)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="text-xs text-white/45"
                            onClick={() => void handleDuplicate(row.id)}
                          >
                            Duplizieren
                          </button>
                          <a
                            href={`/wissen/${row.slug}${row.status !== "published" ? "?preview=1" : ""}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-white/45 hover:text-white/70"
                          >
                            Vorschau
                          </a>
                          <button
                            type="button"
                            className="text-xs text-red-300/70"
                            onClick={() => void handleDelete(row.id, false)}
                          >
                            Löschen
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="font-mono text-[10px] tracking-[.12em] text-white/25">
        {total} Einträge
      </p>
    </div>
  );
}
