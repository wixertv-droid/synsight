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

type SeoKeywordAiSuggestion = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  questions: string[];
  searchIntentReason: string;
  articleFocus: string;
  model: string;
};

type SeoOutlineAiSuggestion = {
  heroSubtitleSuggestions: string[];
  sectionHeadings: string[];
  recommendedIntroAngle: string;
  model: string;
};

type SeoContentAiSuggestion = {
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  seoTitle: string;
  metaDescription: string;
  model: string;
};

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

const KEYWORD_PRESETS: Record<string, string[]> = {
  OSINT: [
    "osint",
    "öffentliche daten finden",
    "digitale spuren finden",
    "informationen über personen im internet",
    "was weiß das internet über mich",
    "online identität prüfen",
  ],
  Datenschutz: [
    "was weiß das internet über mich",
    "persönliche daten im internet",
    "digitale spuren",
    "online identität schützen",
    "personenbezogene daten finden",
    "daten aus dem internet löschen",
  ],
  Datenlecks: [
    "datenleck prüfen",
    "email datenleck",
    "passwort geleakt",
    "gestohlene zugangsdaten",
    "email adresse geleakt",
    "breach check",
  ],
  Cybersecurity: [
    "cybersecurity",
    "online sicherheit",
    "digitale identität schützen",
    "internet sicherheit",
    "cyberrisiken",
    "persönliche daten schützen",
  ],
  "Social Media": [
    "social media profile finden",
    "öffentliche social media daten",
    "digitale spuren social media",
    "social media privatsphäre",
    "profile im internet finden",
  ],
  "Reverse Image": [
    "reverse image search",
    "bildersuche rückwärts",
    "bilder von mir im internet finden",
    "gesicht im internet finden",
    "foto rückwärtssuche",
  ],
  Google: [
    "was findet google über mich",
    "google suche eigener name",
    "persönliche daten bei google",
    "google ergebnisse löschen",
    "digitale spuren google",
  ],
  Benutzernamen: [
    "benutzername suchen",
    "username finden",
    "social media profile finden",
    "benutzername im internet",
    "gleicher username mehrere plattformen",
  ],
  Telefon: [
    "telefonnummer im internet finden",
    "rufnummer öffentlich",
    "telefonnummer suchen",
    "telefonnummer datenleck",
    "handynummer im internet",
  ],
  Email: [
    "email adresse im internet finden",
    "email datenleck prüfen",
    "email adresse geleakt",
    "email sicherheit",
    "accounts mit email finden",
  ],
  Identität: [
    "digitale identität",
    "online identität prüfen",
    "digitale identität schützen",
    "persönliche daten im internet",
    "digitaler fußabdruck",
  ],
  Sicherheit: [
    "internet sicherheit",
    "persönliche daten schützen",
    "online sicherheit",
    "digitale sicherheit",
    "privatsphäre internet",
  ],
};

const TARGET_MODULES = [
  { value: "google", label: "Google Analyse" },
  { value: "username", label: "Username Intelligence" },
  {
    value: "digital-leak",
    label: "Digital Leak & Exposure · E-Mail + Telefon",
  },
  { value: "reverse-image", label: "Reverse Image Search" },
  { value: "face-scan", label: "FaceScan" },
  { value: "social", label: "Social Media Analyse" },
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

const selectClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-[#071018] px-3 py-2 text-sm text-white/85 outline-none focus:border-cyber-cyan/40 [color-scheme:dark] [&>option]:bg-[#071018] [&>option]:text-slate-100";
const labelClass = "block text-[11px] tracking-wide text-white/55";

const helpClass =
  "mt-1 block text-[11px] leading-relaxed tracking-normal text-white/30";

const counterClass = (value: number, min: number, max: number) =>
  value >= min && value <= max
    ? "text-emerald-300/70"
    : value > max
      ? "text-red-300/70"
      : "text-amber-300/70";

export default function AdminSeoKnowledgeControl({
  trashMode = false,
}: {
  trashMode?: boolean;
}) {
  const [items, setItems] = useState<PageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<
    "list" | "edit" | "create-choice" | "wizard"
  >("list");
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [seoAiBusy, setSeoAiBusy] = useState(false);
  const [seoAiError, setSeoAiError] = useState<string | null>(null);
  const [seoKeywordAi, setSeoKeywordAi] =
    useState<SeoKeywordAiSuggestion | null>(null);
  const [seoOutlineAi, setSeoOutlineAi] =
    useState<SeoOutlineAiSuggestion | null>(null);
  const [seoContentAi, setSeoContentAi] =
    useState<SeoContentAiSuggestion | null>(null);
  const [wizardNotice, setWizardNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!wizardNotice) return;

    const timer = window.setTimeout(() => {
      setWizardNotice(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [wizardNotice]);
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
    setWizardStep(1);
    setMode("create-choice");
  };

  const openManualCreate = () => {
    setEditingId(null);
    setForm(emptyEditor());
    setSlugLocked(false);
    setMode("edit");
  };

  const openWizardCreate = () => {
    setEditingId(null);
    setForm(emptyEditor());
    setSlugLocked(false);
    setWizardStep(1);
    setMode("wizard");
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

  const seoAudit = useMemo(() => {
    const seoTitle = (form.seoTitle || form.title).trim();
    const description = form.metaDescription.trim();
    const focusKeyword =
      form.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)[0] || "";

    const searchableContent = [
      form.title,
      form.seoTitle,
      form.heroTitle,
      form.heroSubtitle,
      form.intro,
      ...form.sections.flatMap((section) => [section.heading, section.body]),
    ]
      .join(" ")
      .toLowerCase();

    const checks = [
      {
        label: "Seitentitel vorhanden",
        ok: form.title.trim().length >= 2,
        points: 10,
      },
      {
        label: "SEO-Titel hat eine gute Länge",
        ok: seoTitle.length >= 35 && seoTitle.length <= 65,
        points: 12,
      },
      {
        label: "Meta-Beschreibung hat eine gute Länge",
        ok: description.length >= 120 && description.length <= 165,
        points: 12,
      },
      {
        label: "Mindestens ein Fokus-Suchbegriff vorhanden",
        ok: Boolean(focusKeyword),
        points: 10,
      },
      {
        label: "Fokus-Suchbegriff kommt im Inhalt vor",
        ok:
          Boolean(focusKeyword) &&
          searchableContent.includes(focusKeyword.toLowerCase()),
        points: 12,
      },
      {
        label: "Einleitung vorhanden",
        ok: form.intro.trim().length >= 80,
        points: 10,
      },
      {
        label: "Mindestens zwei Inhaltsabschnitte vorhanden",
        ok: form.sections.length >= 2,
        points: 10,
      },
      {
        label: "FAQ vorhanden",
        ok: form.faqs.length >= 2,
        points: 8,
      },
      {
        label: "Interne Verlinkung vorhanden",
        ok: form.links.length >= 1,
        points: 8,
      },
      {
        label: "OpenGraph-Bild vorhanden",
        ok: Boolean(form.ogImageUrl.trim()),
        points: 8,
      },
    ];

    const score = checks.reduce(
      (total, check) => total + (check.ok ? check.points : 0),
      0
    );

    return {
      score,
      checks,
      focusKeyword,
      seoTitle,
      description,
    };
  }, [form]);

  const wizardSteps = [
    { number: 1, label: "Thema" },
    { number: 2, label: "Suchstrategie" },
    { number: 3, label: "Aufbau" },
    { number: 4, label: "Inhalt" },
    { number: 5, label: "SEO & CTA" },
    { number: 6, label: "Fertigstellen" },
  ];

  const wizardCanContinue = useMemo(() => {
    switch (wizardStep) {
      case 1:
        return form.title.trim().length >= 2 && form.category.trim().length > 0;
      case 2:
        return form.metaKeywords.trim().length > 0;
      case 3:
        return form.heroTitle.trim().length >= 2;
      case 4:
        return (
          form.intro.trim().length >= 20 ||
          form.sections.some(
            (section) =>
              section.heading.trim().length > 0 ||
              section.body.trim().length > 0
          )
        );
      case 5:
        return form.seoTitle.trim().length >= 2;
      default:
        return true;
    }
  }, [form, wizardStep]);

  const addKeywordSuggestion = (keyword: string) => {
    setWizardNotice(`✓ Keyword „${keyword}“ wurde übernommen.`);
    setForm((prev) => {
      const existing = prev.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (
        existing.some((value) => value.toLowerCase() === keyword.toLowerCase())
      ) {
        return prev;
      }

      return {
        ...prev,
        metaKeywords: [...existing, keyword].join(", "),
      };
    });
  };

  const removeKeywordSuggestion = (keyword: string) => {
    setForm((prev) => ({
      ...prev,
      metaKeywords: prev.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(
          (value) => value && value.toLowerCase() !== keyword.toLowerCase()
        )
        .join(", "),
    }));
  };

  const generateAiKeywordSuggestions = async () => {
    if (form.title.trim().length < 2) {
      setSeoAiError(
        "Bitte zuerst in Schritt 1 ein konkretes Thema bzw. einen Seitentitel eingeben."
      );
      return;
    }

    setSeoAiBusy(true);
    setSeoAiError(null);

    try {
      const existingKeywords = form.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await fetch("/api/admin/seo/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "keywords",
          title: form.title,
          category: form.category,
          targetModule: form.targetModule,
          searchIntent: form.searchIntent,
          difficulty: form.difficulty,
          language: form.language,
          existingKeywords,
        }),
      });

      const result =
        (await response.json()) as ApiResult<SeoKeywordAiSuggestion>;

      if (!response.ok || !result.success) {
        setSeoAiError(
          result.success
            ? "Gemini konnte keine Vorschläge erstellen."
            : result.error.message
        );
        return;
      }

      setSeoKeywordAi(result.data);
    } catch {
      setSeoAiError("Verbindung zum Gemini SEO-Assistenten fehlgeschlagen.");
    } finally {
      setSeoAiBusy(false);
    }
  };

  const applyAiPrimaryKeyword = (keyword: string) => {
    setWizardNotice(`✓ „${keyword}“ wurde als Hauptkeyword übernommen.`);
    setForm((prev) => {
      const existing = prev.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => value.toLowerCase() !== keyword.toLowerCase());

      return {
        ...prev,
        metaKeywords: [keyword, ...existing].join(", "),
      };
    });
  };

  const applyAllAiKeywords = () => {
    if (!seoKeywordAi) return;
    setWizardNotice(
      "✓ Hauptkeyword, Nebenkeywords und Long-Tail-Begriffe wurden übernommen."
    );

    const values = [
      seoKeywordAi.primaryKeyword,
      ...seoKeywordAi.secondaryKeywords,
      ...seoKeywordAi.longTailKeywords,
    ];

    setForm((prev) => {
      const existing = prev.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const result: string[] = [];

      for (const keyword of [...values, ...existing]) {
        if (
          !result.some((value) => value.toLowerCase() === keyword.toLowerCase())
        ) {
          result.push(keyword);
        }
      }

      return {
        ...prev,
        metaKeywords: result.join(", "),
      };
    });
  };

  const generateAiOutline = async () => {
    setSeoAiBusy(true);
    setSeoAiError(null);
    setWizardNotice(null);

    try {
      const keywords = form.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await fetch("/api/admin/seo/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "outline",
          title: form.title,
          category: form.category,
          targetModule: form.targetModule,
          searchIntent: form.searchIntent,
          difficulty: form.difficulty,
          language: form.language,
          keywords,
        }),
      });

      const result =
        (await response.json()) as ApiResult<SeoOutlineAiSuggestion>;

      if (!response.ok || !result.success) {
        setSeoAiError(
          result.success
            ? "Gemini konnte keine Struktur erstellen."
            : result.error.message
        );
        return;
      }

      setSeoOutlineAi(result.data);
      setWizardNotice(
        "✓ Gemini hat Untertitel und Seitenstruktur vorgeschlagen."
      );
    } catch {
      setSeoAiError(
        "Verbindung zum Gemini-Strukturassistenten fehlgeschlagen."
      );
    } finally {
      setSeoAiBusy(false);
    }
  };

  const applyAiOutline = () => {
    if (!seoOutlineAi) return;

    setForm((prev) => ({
      ...prev,
      sections: seoOutlineAi.sectionHeadings.map((heading, index) => ({
        key: uid(),
        sortOrder: index,
        sectionType: "content",
        heading,
        body: "",
        imageUrl: "",
      })),
    }));

    setWizardNotice(
      `✓ ${seoOutlineAi.sectionHeadings.length} Inhaltsabschnitte wurden übernommen.`
    );
  };

  const generateAiContent = async () => {
    if (form.sections.length === 0) {
      setSeoAiError(
        "Bitte zuerst in Schritt 3 eine Seitenstruktur übernehmen."
      );
      return;
    }

    setSeoAiBusy(true);
    setSeoAiError(null);
    setWizardNotice(null);

    try {
      const keywords = form.metaKeywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await fetch("/api/admin/seo/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "content",
          title: form.title,
          heroSubtitle: form.heroSubtitle,
          category: form.category,
          targetModule: form.targetModule,
          searchIntent: form.searchIntent,
          difficulty: form.difficulty,
          language: form.language,
          keywords,
          sectionHeadings: form.sections
            .map((section) => section.heading.trim())
            .filter(Boolean),
        }),
      });

      const result =
        (await response.json()) as ApiResult<SeoContentAiSuggestion>;

      if (!response.ok || !result.success) {
        setSeoAiError(
          result.success
            ? "Gemini konnte keinen Artikelentwurf erstellen."
            : result.error.message
        );
        return;
      }

      setSeoContentAi(result.data);
      setWizardNotice(
        `✓ Gemini hat ${result.data.sections.length} Abschnitte und ${result.data.faqs.length} FAQ erstellt.`
      );
    } catch {
      setSeoAiError("Verbindung zum Gemini Content Writer fehlgeschlagen.");
    } finally {
      setSeoAiBusy(false);
    }
  };

  const applyAiContent = () => {
    if (!seoContentAi) return;

    setForm((prev) => ({
      ...prev,
      intro: seoContentAi.intro,
      seoTitle: seoContentAi.seoTitle,
      metaDescription: seoContentAi.metaDescription,

      sections: seoContentAi.sections.map((section, index) => ({
        key: prev.sections[index]?.key ?? uid(),
        sortOrder: index,
        sectionType: "content",
        heading:
          section.heading ||
          prev.sections[index]?.heading ||
          `Abschnitt ${index + 1}`,
        body: section.body,
        imageUrl: prev.sections[index]?.imageUrl ?? "",
      })),

      faqs: seoContentAi.faqs.map((faq, index) => ({
        key: uid(),
        sortOrder: index,
        question: faq.question,
        answer: faq.answer,
      })),
    }));

    setWizardNotice(
      `✓ Kompletter Artikel übernommen: ${seoContentAi.sections.length} Abschnitte, ${seoContentAi.faqs.length} FAQ und SEO-Daten.`
    );
  };

  const saveWizardPage = async (status: EditorForm["status"]) => {
    setSaving(true);
    setSeoAiError(null);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/seo/knowledge/${editingId}`
          : "/api/admin/seo/knowledge",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payloadFromForm,
            status,
          }),
        }
      );

      const result = (await response.json()) as ApiResult<{
        id: number;
        slug: string;
      }>;

      if (!response.ok || !result.success) {
        setSeoAiError(
          result.success
            ? "Seite konnte nicht gespeichert werden."
            : result.error.message
        );
        return false;
      }

      setEditingId(result.data.id);
      setSlugLocked(true);

      setForm((prev) => ({
        ...prev,
        status,
        slug: result.data.slug,
      }));

      await loadList();

      if (status === "published") {
        setWizardNotice(
          "✓ Seite veröffentlicht. Sie ist jetzt öffentlich erreichbar."
        );
      } else {
        setWizardNotice(
          "✓ Entwurf gespeichert. Die Vorschau kann jetzt geöffnet werden."
        );
      }

      return true;
    } catch {
      setSeoAiError("Seite konnte nicht gespeichert werden.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const wizardNext = () => {
    if (!wizardCanContinue) return;
    setWizardStep((step) => Math.min(6, step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const wizardBack = () => {
    if (wizardStep <= 1) {
      setMode("create-choice");
      return;
    }
    setWizardStep((step) => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

      if (mode === "wizard") {
        setMessage(
          "✓ Seite erfolgreich gespeichert. Sie befinden sich jetzt im vollständigen Editor und können die Seite weiter prüfen oder öffnen."
        );
        setMode("edit");
      }
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

  if (mode === "create-choice" && !trashMode) {
    return (
      <div className="space-y-6">
        <div>
          <InfoHeading
            label="Neue SEO-Seite erstellen"
            info="Wählen Sie, ob SynSight Sie Schritt für Schritt durch die Erstellung führen soll oder ob Sie direkt den vollständigen Editor öffnen möchten."
            as="h2"
            className="text-xl font-semibold text-white/90"
          />
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
            Für neue Inhalte empfehlen wir den geführten Assistenten. Sie
            bearbeiten immer nur den nächsten sinnvollen Schritt und erhalten am
            Ende eine vollständig vorbereitete Wissensseite.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <button
            type="button"
            onClick={openWizardCreate}
            className="group rounded-2xl border border-cyber-cyan/25 bg-cyber-cyan/[0.035] p-6 text-left transition hover:border-cyber-cyan/55 hover:bg-cyber-cyan/[0.06]"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/65">
                  Empfohlen
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  ✦ Geführter Content-Assistent
                </h3>
              </div>
              <div className="rounded-full border border-cyber-cyan/20 px-3 py-1 text-[10px] text-cyan-100/60">
                6 Schritte
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/45">
              SynSight führt Sie durch Thema, Suchstrategie, Seitenaufbau,
              Inhalte, SEO und Veröffentlichung. Gemini wird anschließend direkt
              in die passenden Schritte integriert.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] text-white/35">
              <span>01 · THEMA</span>
              <span>02 · KEYWORDS</span>
              <span>03 · STRUKTUR</span>
              <span>04 · INHALT</span>
              <span>05 · SEO</span>
              <span>06 · FERTIG</span>
            </div>

            <div className="mt-6 text-sm font-semibold text-cyber-cyan">
              Assistent starten →
            </div>
          </button>

          <button
            type="button"
            onClick={openManualCreate}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-left transition hover:border-white/20 hover:bg-white/[0.035]"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
              Profi-Modus
            </div>

            <h3 className="mt-2 text-lg font-semibold text-white/80">
              Seite manuell erstellen
            </h3>

            <p className="mt-5 text-sm leading-relaxed text-white/40">
              Öffnet sofort den vollständigen SEO-Editor mit allen technischen
              Einstellungen, Inhaltsbereichen, FAQ und internen Links.
            </p>

            <div className="mt-6 text-sm text-white/55">
              Vollständigen Editor öffnen →
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMode("list")}
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 hover:border-white/20"
        >
          ← Zurück zur Seitenübersicht
        </button>
      </div>
    );
  }

  if (mode === "wizard" && !trashMode) {
    return (
      <div className="space-y-6">
        {wizardNotice ? (
          <div className="fixed bottom-6 right-6 z-[100] max-w-md rounded-xl border border-emerald-400/30 bg-[#06140f]/95 px-5 py-4 text-sm text-emerald-100 shadow-2xl backdrop-blur">
            {wizardNotice}
          </div>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <InfoHeading
              label="SEO Content Assistent"
              info="Der Assistent führt Sie in sechs Schritten von der ersten Idee bis zur fertigen Wissensseite."
              as="h2"
              className="text-xl font-semibold text-white/90"
            />
            <p className="mt-2 text-sm text-white/45">
              Schritt {wizardStep} von 6 · {wizardSteps[wizardStep - 1]?.label}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMode("create-choice")}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:border-white/20"
          >
            Assistent verlassen
          </button>
        </div>

        {message ? (
          <div className="rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] px-4 py-3 text-sm text-cyan-50/75">
            {message}
          </div>
        ) : null}

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
          <div className="grid gap-2 md:grid-cols-6">
            {wizardSteps.map((step) => {
              const active = step.number === wizardStep;
              const complete = step.number < wizardStep;

              return (
                <div key={step.number} className="relative">
                  <div
                    className={`rounded-lg border px-3 py-3 transition ${
                      active
                        ? "border-cyber-cyan/35 bg-cyber-cyan/[0.07]"
                        : complete
                          ? "border-emerald-400/15 bg-emerald-400/[0.025]"
                          : "border-white/[0.06] bg-white/[0.015]"
                    }`}
                  >
                    <div
                      className={`font-mono text-[9px] tracking-[0.16em] ${
                        active
                          ? "text-cyber-cyan"
                          : complete
                            ? "text-emerald-300/60"
                            : "text-white/25"
                      }`}
                    >
                      {complete ? "✓" : `0${step.number}`}
                    </div>
                    <div
                      className={`mt-1 text-xs ${
                        active ? "text-white/85" : "text-white/40"
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {wizardNotice ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/75">
            {wizardNotice}
          </div>
        ) : null}

        {seoAiError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] px-4 py-3 text-sm text-red-100/70">
            {seoAiError}
          </div>
        ) : null}

        {wizardNotice ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/75">
            {wizardNotice}
          </div>
        ) : null}

        {seoAiError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] px-4 py-3 text-sm text-red-100/70">
            {seoAiError}
          </div>
        ) : null}

        <form onSubmit={handleSave} className="space-y-5">
          {wizardStep === 1 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 01
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  Worum soll es auf der Seite gehen?
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Beginnen Sie nur mit der Frage:{" "}
                  <strong className="text-white/70">
                    Was soll ein Besucher auf dieser Seite erfahren oder lösen?
                  </strong>{" "}
                  Sie müssen hier noch keine SEO-Begriffe kennen. SynSight führt
                  Sie später durch Suchbegriffe, Google-Titel, Inhalte und
                  Veröffentlichung.
                </p>

                <div className="mt-4 rounded-xl border border-cyber-cyan/10 bg-black/20 p-4">
                  <div className="text-xs font-medium text-cyan-100/65">
                    Beispiel für einen guten Seitentitel
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    „Was weiß das Internet über mich?“
                  </div>
                  <div className="mt-3 text-[11px] leading-relaxed text-white/35">
                    Weniger hilfreich wäre nur „Internet“ oder „Datenschutz“.
                    Ein guter Titel beschreibt möglichst konkret die Frage oder
                    das Problem des späteren Besuchers.
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>
                  Thema / Seitentitel
                  <span className={helpClass}>
                    Beschreiben Sie verständlich, was ein Besucher auf dieser
                    Seite lernen oder lösen soll.
                  </span>
                  <input
                    autoFocus
                    className={fieldClass}
                    value={form.title}
                    placeholder="z. B. Was weiß das Internet über mich?"
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
                  Themenkategorie
                  <span className={helpClass}>
                    Hilft SynSight, den Inhalt fachlich einzuordnen.
                  </span>
                  <select
                    className={selectClass}
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Passendes SynSight-Modul
                  <span className={helpClass}>
                    Zu welcher Analyse passt dieser Inhalt am besten?
                  </span>
                  <select
                    className={selectClass}
                    value={form.targetModule}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        targetModule: e.target.value,
                      }))
                    }
                  >
                    {TARGET_MODULES.map((module) => (
                      <option key={module.value} value={module.value}>
                        {module.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Sprache
                  <select
                    className={selectClass}
                    value={form.language}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        language: e.target.value,
                      }))
                    }
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Wissensniveau der Leser
                  <select
                    className={selectClass}
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        difficulty: e.target.value as EditorForm["difficulty"],
                      }))
                    }
                  >
                    <option value="einsteiger">Einsteiger</option>
                    <option value="fortgeschritten">Fortgeschritten</option>
                    <option value="experte">Experte</option>
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          {wizardStep === 2 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 02
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  Wonach sollen Menschen suchen?
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Ein <strong className="text-white/70">Keyword</strong> ist
                  einfach das Wort oder die Frage, die jemand bei Google
                  eingeben könnte. Der erste Begriff ist für SynSight momentan
                  das Hauptkeyword. Danach können weitere passende Begriffe
                  ergänzt werden.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-white/35">
                      Beispiel Hauptkeyword
                    </div>
                    <div className="mt-2 text-sm text-cyan-100/70">
                      was weiß das internet über mich
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                      Das ist das wichtigste Thema, für das die Seite gefunden
                      werden soll.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-white/35">
                      Beispiel Nebenkeywords
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      digitale spuren · persönliche daten im internet · online
                      identität prüfen
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                      Das sind eng verwandte Begriffe, die im Artikel natürlich
                      mitbehandelt werden können.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>
                  Hauptkeyword und weitere passende Suchbegriffe
                  <span className={helpClass}>
                    Schreiben Sie den wichtigsten Begriff zuerst. Weitere
                    Begriffe werden mit Komma getrennt. Sie können unten auch
                    einfach auf passende Vorschläge klicken.
                  </span>
                  <input
                    className={fieldClass}
                    value={form.metaKeywords}
                    placeholder="z. B. was weiß das internet über mich, digitale spuren, online identität prüfen"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        metaKeywords: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="md:col-span-2 rounded-xl border border-cyber-cyan/12 bg-black/20 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white/70">
                        Passende Keyword-Vorgaben
                      </div>
                      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/35">
                        Diese Vorschläge basieren auf der gewählten Kategorie „
                        {form.category}“. Klicken Sie auf einen Begriff, um ihn
                        zu Ihrer Keyword-Liste hinzuzufügen. Sie müssen nicht
                        alle verwenden.
                      </p>
                    </div>

                    <div className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/35">
                      ohne API-Kosten
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(KEYWORD_PRESETS[form.category] ?? []).map((keyword) => {
                      const selected = form.metaKeywords
                        .split(",")
                        .map((value) => value.trim().toLowerCase())
                        .includes(keyword.toLowerCase());

                      return (
                        <button
                          key={keyword}
                          type="button"
                          onClick={() =>
                            selected
                              ? removeKeywordSuggestion(keyword)
                              : addKeywordSuggestion(keyword)
                          }
                          className={`rounded-full border px-3 py-2 text-xs transition ${
                            selected
                              ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100/75"
                              : "border-white/10 bg-white/[0.025] text-white/45 hover:border-cyber-cyan/25 hover:text-cyan-100/70"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {keyword}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-200/60">
                          ✦ Gemini Keyword Intelligence
                        </div>
                        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/35">
                          Gemini verwendet Ihr Thema, die Kategorie, das
                          SynSight-Modul und die Suchintention und schlägt
                          passende Suchbegriffe und typische Nutzerfragen vor.
                          Die Vorschläge werden niemals automatisch übernommen.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={seoAiBusy}
                        onClick={() => void generateAiKeywordSuggestions()}
                        className="rounded-lg border border-violet-400/25 bg-violet-400/[0.06] px-4 py-2.5 text-xs font-medium text-violet-100/75 transition hover:border-violet-300/45 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {seoAiBusy
                          ? "✦ Gemini analysiert…"
                          : "✦ Mit Gemini Keywords finden"}
                      </button>
                    </div>

                    <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/30">
                      Diese Funktion verwendet Ihre hinterlegte Gemini-API.
                      Tokenverbrauch und Kosten werden automatisch unter
                      Finanzen → API-Kosten erfasst.
                    </div>

                    {seoAiError ? (
                      <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.04] px-3 py-2 text-xs text-red-200/70">
                        {seoAiError}
                      </div>
                    ) : null}

                    {seoKeywordAi ? (
                      <div className="mt-5 space-y-5 rounded-xl border border-violet-400/15 bg-violet-400/[0.025] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white/75">
                              Gemini-Vorschlag
                            </div>
                            <div className="mt-1 text-[10px] text-white/25">
                              Modell · {seoKeywordAi.model}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={applyAllAiKeywords}
                            className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/[0.04] px-3 py-2 text-xs text-cyan-100/70"
                          >
                            Alle Keywords übernehmen
                          </button>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/30">
                            Empfohlenes Hauptkeyword
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-3 py-2 text-sm text-violet-100/80">
                              {seoKeywordAi.primaryKeyword}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                applyAiPrimaryKeyword(
                                  seoKeywordAi.primaryKeyword
                                )
                              }
                              className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50"
                            >
                              Als Hauptkeyword übernehmen
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/30">
                            Passende Nebenkeywords
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {seoKeywordAi.secondaryKeywords.map((keyword) => (
                              <button
                                type="button"
                                key={keyword}
                                onClick={() => addKeywordSuggestion(keyword)}
                                className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/55 hover:border-cyber-cyan/25 hover:text-cyan-100/75"
                              >
                                + {keyword}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/30">
                            Long-Tail-Suchbegriffe
                          </div>
                          <p className="mt-1 text-[10px] text-white/25">
                            Längere und konkretere Suchanfragen. Sie sind oft
                            besonders hilfreich für einzelne Artikelabschnitte.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {seoKeywordAi.longTailKeywords.map((keyword) => (
                              <button
                                type="button"
                                key={keyword}
                                onClick={() => addKeywordSuggestion(keyword)}
                                className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/50 hover:border-violet-300/25"
                              >
                                + {keyword}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/30">
                            Typische Fragen der Nutzer
                          </div>
                          <p className="mt-1 text-[10px] text-white/25">
                            Diese Fragen können später als FAQ oder als
                            Zwischenüberschriften verwendet werden.
                          </p>
                          <ul className="mt-3 space-y-2">
                            {seoKeywordAi.questions.map((question) => (
                              <li
                                key={question}
                                className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-white/50"
                              >
                                {question}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {seoKeywordAi.searchIntentReason ? (
                          <div className="rounded-lg border border-cyber-cyan/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-cyber-cyan/45">
                              Warum passt die Suchintention?
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-white/45">
                              {seoKeywordAi.searchIntentReason}
                            </p>
                          </div>
                        ) : null}

                        {seoKeywordAi.articleFocus ? (
                          <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-emerald-300/45">
                              Empfohlener Artikelfokus
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-white/45">
                              {seoKeywordAi.articleFocus}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <label className={labelClass}>
                  Was möchte der Suchende erreichen?
                  <select
                    className={selectClass}
                    value={form.searchIntent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        searchIntent: e.target
                          .value as EditorForm["searchIntent"],
                      }))
                    }
                  >
                    <option value="informational">
                      Information / Problem verstehen
                    </option>
                    <option value="commercial">Lösungen vergleichen</option>
                    <option value="transactional">
                      Aktion durchführen / kaufen
                    </option>
                    <option value="navigational">
                      Bestimmte Seite oder Marke finden
                    </option>
                  </select>
                </label>

                <label className={labelClass}>
                  SEO-Priorität
                  <select
                    className={selectClass}
                    value={form.seoPriority}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        seoPriority: e.target
                          .value as EditorForm["seoPriority"],
                      }))
                    }
                  >
                    <option value="hoch">Hoch · Kernthema</option>
                    <option value="mittel">
                      Mittel · Unterstützender Inhalt
                    </option>
                    <option value="niedrig">
                      Niedrig · Ergänzender Inhalt
                    </option>
                  </select>
                </label>

                <div className="md:col-span-2 rounded-xl border border-violet-400/15 bg-violet-400/[0.025] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-200/55">
                    ✦ Gemini Integration
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/35">
                    Hier kommt im nächsten Ausbau der Button „Keywords mit
                    Gemini vorschlagen“. Thema, Kategorie, Zielgruppe und
                    Suchintention stehen dann bereits als Kontext zur Verfügung.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {wizardStep === 3 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 03
                </div>

                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  Seitenaufbau festlegen
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Jetzt legen wir fest,{" "}
                  <strong className="text-white/70">
                    wie der Artikel aufgebaut wird
                  </strong>
                  . Die Hauptüberschrift steht bereits fest. Danach brauchen wir
                  einen verständlichen Untertitel und mehrere sinnvolle
                  Inhaltsabschnitte.
                </p>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="text-xs font-medium text-cyan-100/65">
                    Einfach erklärt
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                    Stellen Sie sich die Seite wie ein kleines Buch vor: Die
                    Hauptüberschrift ist der Titel, der Untertitel erklärt kurz
                    den Nutzen und die Inhaltsabschnitte sind die Kapitel. Sie
                    müssen die Struktur nicht selbst erfinden – Gemini kann
                    anhand Ihrer Keywords passende Vorschläge erstellen.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>
                  Hauptüberschrift
                  <span className={helpClass}>
                    Das ist die wichtigste sichtbare Überschrift der Seite.
                    Beispiel: „Was weiß das Internet über mich?“
                  </span>
                  <input
                    className={fieldClass}
                    value={form.heroTitle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        heroTitle: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className={`${labelClass} md:col-span-2`}>
                  Unterüberschrift
                  <span className={helpClass}>
                    Ein kurzer Satz, der erklärt, was Besucher auf der Seite
                    erfahren. Beispiel: „Erfahren Sie, welche persönlichen
                    Informationen öffentlich auffindbar sind und wie Sie Ihre
                    digitale Sichtbarkeit kontrollieren können.“
                  </span>
                  <input
                    className={fieldClass}
                    value={form.heroSubtitle}
                    placeholder="Ein kurzer Satz, der Problem und Nutzen erklärt."
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        heroSubtitle: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="md:col-span-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.035] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-violet-200/65">
                        ✦ Gemini Seitenarchitekt
                      </div>
                      <h4 className="mt-2 text-sm font-medium text-white/75">
                        Untertitel und Seitenstruktur automatisch vorschlagen
                      </h4>
                      <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-white/35">
                        Gemini verwendet das Thema, Ihre ausgewählten Keywords,
                        die Suchintention und das Wissensniveau der Zielgruppe.
                        Daraus entstehen mehrere Untertitel und eine sinnvolle
                        Reihenfolge der Artikelabschnitte.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={seoAiBusy}
                      onClick={() => void generateAiOutline()}
                      className="rounded-lg border border-violet-300/25 bg-violet-300/[0.07] px-4 py-2.5 text-xs font-medium text-violet-100/80 transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {seoAiBusy
                        ? "✦ Gemini erstellt Struktur…"
                        : "✦ Struktur mit Gemini erstellen"}
                    </button>
                  </div>

                  <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-[10px] text-white/30">
                    Diese Gemini-Anfrage wird ebenfalls unter Finanzen →
                    API-Kosten als „seo_structure_generation“ erfasst.
                  </div>

                  {seoOutlineAi ? (
                    <div className="mt-5 space-y-5">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Vorschläge für die Unterüberschrift
                        </div>

                        <p className="mt-1 text-[10px] leading-relaxed text-white/25">
                          Wählen Sie einfach die Variante aus, die Ihnen am
                          besten gefällt. Sie können sie danach jederzeit noch
                          selbst verändern.
                        </p>

                        <div className="mt-3 space-y-2">
                          {seoOutlineAi.heroSubtitleSuggestions.map(
                            (subtitle, index) => (
                              <div
                                key={`${subtitle}-${index}`}
                                className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="text-sm leading-relaxed text-white/60">
                                  {subtitle}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      heroSubtitle: subtitle,
                                    }));
                                    setWizardNotice(
                                      `✓ Untertitel Variante ${index + 1} wurde übernommen.`
                                    );
                                  }}
                                  className="shrink-0 rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/[0.04] px-3 py-2 text-[11px] text-cyan-100/70"
                                >
                                  Übernehmen
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-white/30">
                              Empfohlene Artikelstruktur
                            </div>
                            <p className="mt-1 text-[10px] text-white/25">
                              Diese Überschriften werden im nächsten Schritt zu
                              den einzelnen Textabschnitten.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={applyAiOutline}
                            className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-4 py-2 text-xs font-medium text-cyan-100/75"
                          >
                            Komplette Struktur übernehmen
                          </button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {seoOutlineAi.sectionHeadings.map(
                            (heading, index) => (
                              <div
                                key={`${heading}-${index}`}
                                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-3"
                              >
                                <span className="font-mono text-[10px] text-cyber-cyan/45">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className="text-sm text-white/60">
                                  {heading}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {seoOutlineAi.recommendedIntroAngle ? (
                        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-4">
                          <div className="text-[10px] uppercase tracking-wider text-emerald-300/50">
                            Tipp für die spätere Einleitung
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-white/45">
                            {seoOutlineAi.recommendedIntroAngle}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white/70">
                        Aktuelle Inhaltsstruktur
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-white/30">
                        Das sind die Abschnitte, die tatsächlich für Ihre Seite
                        übernommen wurden. Sie können jeden Titel noch
                        bearbeiten, löschen oder zusätzliche Abschnitte
                        hinzufügen.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/[0.04] px-3 py-2 text-xs text-cyan-100/70"
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
                      + Eigenen Abschnitt hinzufügen
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.sections.map((section, index) => (
                      <div
                        key={section.key}
                        className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                      >
                        <div className="pt-3 font-mono text-[10px] text-white/25">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <input
                          className={fieldClass}
                          value={section.heading}
                          placeholder="Überschrift des Abschnitts"
                          onChange={(e) =>
                            setForm((prev) => {
                              const sections = [...prev.sections];
                              sections[index] = {
                                ...sections[index]!,
                                heading: e.target.value,
                              };
                              return { ...prev, sections };
                            })
                          }
                        />

                        <button
                          type="button"
                          title="Abschnitt entfernen"
                          className="px-2 text-xs text-red-300/50 hover:text-red-200"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              sections: prev.sections.filter(
                                (_, i) => i !== index
                              ),
                            }))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {form.sections.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                        <div className="text-sm text-white/35">
                          Noch keine Inhaltsabschnitte übernommen.
                        </div>
                        <p className="mt-2 text-[11px] text-white/25">
                          Nutzen Sie oben „Struktur mit Gemini erstellen“ oder
                          legen Sie einen eigenen Abschnitt an.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {wizardStep === 4 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 04
                </div>

                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  Artikel schreiben
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Jetzt wird aus Ihrer Struktur die eigentliche Seite. Sie
                  können den Text selbst schreiben oder Gemini einen
                  vollständigen Entwurf erstellen lassen.
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.035] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-200/65">
                      ✦ Gemini Content Writer
                    </div>

                    <h4 className="mt-2 text-sm font-medium text-white/75">
                      Kompletten Artikel automatisch vorbereiten
                    </h4>

                    <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-white/35">
                      Gemini verwendet Ihr Thema, Ihre Keywords und die
                      freigegebene Seitenstruktur. Erstellt werden Einleitung,
                      alle Artikelabschnitte, FAQ, Google-Titel und
                      Meta-Beschreibung.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={seoAiBusy}
                    onClick={() => void generateAiContent()}
                    className="rounded-lg border border-violet-300/30 bg-violet-300/[0.07] px-5 py-3 text-xs font-semibold text-violet-100/80 disabled:opacity-40"
                  >
                    {seoAiBusy
                      ? "✦ Gemini schreibt…"
                      : "✦ Kompletten Artikelentwurf erstellen"}
                  </button>
                </div>

                <div className="mt-3 text-[10px] text-white/25">
                  Kosten werden als GEMINI · seo_content_generation erfasst.
                </div>

                {seoContentAi ? (
                  <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white/75">
                          Entwurf fertig
                        </div>
                        <div className="mt-1 text-[10px] text-white/30">
                          {seoContentAi.sections.length} Abschnitte ·{" "}
                          {seoContentAi.faqs.length} FAQ · Modell{" "}
                          {seoContentAi.model}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={applyAiContent}
                        className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-2.5 text-xs font-semibold text-emerald-100/75"
                      >
                        ✓ Kompletten Entwurf übernehmen
                      </button>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-wider text-white/30">
                        Vorschau der Einleitung
                      </div>
                      <p className="mt-2 line-clamp-6 whitespace-pre-line text-xs leading-relaxed text-white/50">
                        {seoContentAi.intro}
                      </p>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {seoContentAi.sections.map((section, index) => (
                        <div
                          key={`${section.heading}-${index}`}
                          className="rounded-lg border border-white/[0.06] bg-black/20 p-3"
                        >
                          <div className="font-mono text-[9px] text-cyber-cyan/40">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {section.heading}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-5">
                <label className={labelClass}>
                  Einleitung
                  <span className={helpClass}>
                    Die Einleitung erklärt dem Besucher, warum das Thema
                    relevant ist und was er auf der Seite erfahren wird.
                  </span>
                  <textarea
                    className={`${fieldClass} min-h-[160px]`}
                    value={form.intro}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        intro: e.target.value,
                      }))
                    }
                  />
                </label>

                {form.sections.map((section, index) => (
                  <div
                    key={section.key}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <div className="text-sm font-medium text-white/70">
                      {section.heading || `Abschnitt ${index + 1}`}
                    </div>

                    <textarea
                      className={`${fieldClass} min-h-[190px]`}
                      value={section.body}
                      onChange={(e) =>
                        setForm((prev) => {
                          const sections = [...prev.sections];

                          sections[index] = {
                            ...sections[index]!,
                            body: e.target.value,
                          };

                          return {
                            ...prev,
                            sections,
                          };
                        })
                      }
                    />
                  </div>
                ))}

                {form.faqs.length > 0 ? (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <div className="text-sm font-medium text-white/70">
                      FAQ · {form.faqs.length} Fragen
                    </div>

                    <div className="mt-3 space-y-2">
                      {form.faqs.map((faq) => (
                        <div
                          key={faq.key}
                          className="rounded-lg border border-white/[0.06] bg-black/20 p-3"
                        >
                          <div className="text-xs font-medium text-white/60">
                            {faq.question}
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-white/35">
                            {faq.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {wizardStep === 5 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 05
                </div>

                <h3 className="mt-2 text-lg font-semibold text-white/90">
                  Google-Vorschau & Handlungsziel
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Hier sehen Sie, wie die Seite ungefähr bei Google erscheinen
                  kann. Wenn Gemini den Artikel erstellt hat, sind Titel und
                  Beschreibung bereits vorbereitet.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>
                  Google-Titel
                  <span className={helpClass}>
                    Der blaue Titel im Suchergebnis. Als Orientierung sind
                    ungefähr 40 bis 65 Zeichen sinnvoll.
                  </span>
                  <input
                    className={fieldClass}
                    value={form.seoTitle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        seoTitle: e.target.value,
                      }))
                    }
                  />
                  <div className="mt-1 text-right text-[10px] text-white/30">
                    {form.seoTitle.length} Zeichen
                  </div>
                </label>

                <label className={labelClass}>
                  Seitenadresse
                  <span className={helpClass}>
                    Daraus wird /wissen/{form.slug || "ihre-seite"}.
                  </span>
                  <input
                    className={fieldClass}
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

                <label className={`${labelClass} md:col-span-2`}>
                  Google-Beschreibung
                  <span className={helpClass}>
                    Kurze Zusammenfassung unter dem Suchergebnis. Sie sollte
                    erklären, warum sich ein Klick lohnt.
                  </span>
                  <textarea
                    className={`${fieldClass} min-h-[100px]`}
                    value={form.metaDescription}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        metaDescription: e.target.value,
                      }))
                    }
                  />
                  <div className="mt-1 text-right text-[10px] text-white/30">
                    {form.metaDescription.length} Zeichen
                  </div>
                </label>

                <div className="md:col-span-2 rounded-xl border border-white/[0.07] bg-black/25 p-5">
                  <div className="text-xs text-emerald-300/55">
                    synsight.de › wissen › {form.slug || "ihre-seite"}
                  </div>

                  <div className="mt-1 text-lg text-[#8ab4f8]">
                    {form.seoTitle || form.title}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-white/45">
                    {form.metaDescription ||
                      "Hier erscheint die Beschreibung des Suchergebnisses."}
                  </p>
                </div>

                <label className={labelClass}>
                  Was soll der Besucher danach tun?
                  <span className={helpClass}>
                    Zum Beispiel den kostenlosen Scanner öffnen oder eine
                    Analyse starten.
                  </span>
                  <select
                    className={selectClass}
                    value={form.ctaPreset}
                    onChange={(e) => {
                      const value = e.target.value as EditorForm["ctaPreset"];

                      const preset = CTA_PRESETS.find(
                        (item) => item.value === value
                      );

                      setForm((prev) => ({
                        ...prev,
                        ctaPreset: value,
                        ctaLabel: preset?.label ?? prev.ctaLabel,
                        ctaHref: preset?.href ?? prev.ctaHref,
                      }));
                    }}
                  >
                    {CTA_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Ziel des Buttons
                  <input
                    className={fieldClass}
                    value={form.ctaHref}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ctaHref: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </section>
          ) : null}

          {wizardStep === 6 ? (
            <section className="rounded-2xl border border-cyber-cyan/15 bg-cyber-cyan/[0.02] p-6">
              <div className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  Schritt 06
                </div>

                <h3 className="mt-2 text-xl font-semibold text-white/90">
                  Prüfen, Vorschau ansehen und veröffentlichen
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                  Ihre Seite ist jetzt inhaltlich vorbereitet. Speichern Sie
                  zunächst einen Entwurf. Danach können Sie die echte
                  SynSight-Vorschau öffnen und anschließend veröffentlichen.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="text-[10px] uppercase tracking-wider text-white/30">
                    SEO Qualität
                  </div>

                  <div className="mt-2 text-4xl font-semibold text-cyber-cyan">
                    {seoAudit.score}
                    <span className="ml-1 text-sm text-white/25">/100</span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan"
                      style={{
                        width: `${seoAudit.score}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 space-y-2">
                    {seoAudit.checks.map((check) => (
                      <div key={check.label} className="flex gap-2 text-xs">
                        <span
                          className={
                            check.ok
                              ? "text-emerald-300/70"
                              : "text-amber-300/60"
                          }
                        >
                          {check.ok ? "✓" : "○"}
                        </span>

                        <span className="text-white/45">{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <div className="text-[10px] uppercase tracking-wider text-white/30">
                      Zusammenfassung
                    </div>

                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] text-white/25">
                          SEITENTITEL
                        </dt>
                        <dd className="mt-1 text-sm text-white/65">
                          {form.title}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] text-white/25">KATEGORIE</dt>
                        <dd className="mt-1 text-sm text-white/65">
                          {form.category}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] text-white/25">
                          INHALTSABSCHNITTE
                        </dt>
                        <dd className="mt-1 text-sm text-white/65">
                          {form.sections.length}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] text-white/25">FAQ</dt>
                        <dd className="mt-1 text-sm text-white/65">
                          {form.faqs.length}
                        </dd>
                      </div>

                      <div className="sm:col-span-2">
                        <dt className="text-[10px] text-white/25">
                          ÖFFENTLICHE URL
                        </dt>
                        <dd className="mt-1 break-all text-sm text-cyan-100/60">
                          /wissen/{form.slug}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {!editingId ? (
                    <div className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
                      <div className="text-sm font-medium text-white/70">
                        1. Entwurf speichern
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-white/35">
                        Dadurch wird die Seite in der Datenbank angelegt, aber
                        noch nicht öffentlich freigegeben. Anschließend steht
                        die echte Vorschau zur Verfügung.
                      </p>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveWizardPage("draft")}
                        className="mt-4 rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-2.5 text-sm font-semibold text-space-black disabled:opacity-40"
                      >
                        {saving
                          ? "Entwurf wird gespeichert…"
                          : "✓ Entwurf speichern & Vorschau vorbereiten"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.025] p-5">
                      <div className="text-sm font-medium text-emerald-100/70">
                        ✓ Seite ist gespeichert
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-white/35">
                        Sie können jetzt die echte Seite ansehen. Als Entwurf
                        ist sie noch nicht regulär öffentlich gelistet.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={`/wissen/${form.slug}${
                            form.status === "published" ? "" : "?preview=1"
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-4 py-2.5 text-sm text-cyan-100/75"
                        >
                          Vorschau öffnen ↗
                        </a>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveWizardPage(form.status)}
                          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/50"
                        >
                          Änderungen speichern
                        </button>
                      </div>
                    </div>
                  )}

                  {editingId && form.status !== "published" ? (
                    <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.025] p-5">
                      <div className="text-sm font-medium text-white/70">
                        2. Seite online schalten
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-white/35">
                        Wenn die Vorschau passt, veröffentlichen Sie die Seite.
                        Danach ist sie regulär unter ihrer /wissen/-Adresse
                        erreichbar.
                      </p>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveWizardPage("published")}
                        className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.08] px-5 py-2.5 text-sm font-semibold text-emerald-100/80 disabled:opacity-40"
                      >
                        {saving
                          ? "Wird veröffentlicht…"
                          : "● Seite jetzt veröffentlichen"}
                      </button>
                    </div>
                  ) : null}

                  {editingId && form.status === "published" ? (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-5">
                      <div className="text-lg font-semibold text-emerald-100/80">
                        ✓ Seite ist online
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-white/40">
                        Der Assistent ist abgeschlossen. Die Seite kann später
                        jederzeit im vollständigen Profi-Editor verändert
                        werden.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={`/wissen/${form.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-4 py-2.5 text-sm font-semibold text-space-black"
                        >
                          Öffentliche Seite ansehen ↗
                        </a>

                        <button
                          type="button"
                          onClick={() => setMode("edit")}
                          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/55"
                        >
                          Im Profi-Editor bearbeiten
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMode("list");
                            void loadList();
                          }}
                          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/55"
                        >
                          Zur Seitenübersicht
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
            <button
              type="button"
              onClick={wizardBack}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/55 hover:border-white/20"
            >
              ← Zurück
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-white/25">
                Schritt {wizardStep} / 6
              </span>

              {wizardStep < 6 ? (
                <button
                  type="button"
                  disabled={!wizardCanContinue}
                  onClick={wizardNext}
                  className="rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-2.5 text-sm font-semibold text-space-black disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Weiter →
                </button>
              ) : (
                <span className="text-xs text-white/30">
                  Vorschau und Veröffentlichung oben abschließen.
                </span>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

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

        <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-cyan/55">
                  SEO Qualität
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Automatische Prüfung der wichtigsten Seitensignale.
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-semibold text-cyber-cyan">
                  {seoAudit.score}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/30">
                  von 100
                </div>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all"
                style={{ width: `${seoAudit.score}%` }}
              />
            </div>

            <div className="mt-4 space-y-2">
              {seoAudit.checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-start gap-2 text-xs"
                >
                  <span
                    className={
                      check.ok ? "text-emerald-300/80" : "text-amber-300/70"
                    }
                  >
                    {check.ok ? "✓" : "○"}
                  </span>
                  <span
                    className={check.ok ? "text-white/55" : "text-white/35"}
                  >
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                  Google Vorschau
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Ungefähre Darstellung des Suchergebnisses.
                </p>
              </div>

              {seoAudit.focusKeyword ? (
                <span className="rounded-full border border-cyber-cyan/15 bg-cyber-cyan/[0.04] px-3 py-1 text-[10px] text-cyan-100/60">
                  Fokus · {seoAudit.focusKeyword}
                </span>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-5">
              <div className="mb-1 text-xs text-emerald-300/60">
                synsight.de › wissen › {form.slug || "ihre-seite"}
              </div>

              <div className="text-lg font-medium leading-snug text-[#8ab4f8]">
                {seoAudit.seoTitle || "SEO-Titel Ihrer Seite"}
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">
                {seoAudit.description ||
                  "Hier erscheint die Meta-Beschreibung. Beschreiben Sie kurz und verständlich, was Nutzer auf dieser Seite erfahren und warum die Seite für ihre Suche relevant ist."}
              </p>
            </div>
          </section>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Seite & Veröffentlichung
            </h3>
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-white/35">
              Hier legen Sie fest, wie die Seite heißt, unter welcher Adresse
              sie erreichbar ist und welchem SynSight-Thema sie zugeordnet wird.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Seitentitel
                <span className={helpClass}>
                  Interner und sichtbarer Name der Wissensseite. Er sollte das
                  Thema klar und verständlich beschreiben.
                </span>
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
                URL-Adresse / Slug
                <span className={helpClass}>
                  Der Teil hinter synsight.de/wissen/. Wird automatisch aus dem
                  Titel erzeugt und sollte kurz und eindeutig bleiben.
                </span>
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
                Themenkategorie
                <span className={helpClass}>
                  Ordnet den Inhalt thematisch ein und hilft später bei
                  Navigation, Filtern und interner Verlinkung.
                </span>
                <select
                  className={selectClass}
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
                Sprache der Seite
                <span className={helpClass}>
                  Sprache, in der Inhalt und Suchmaschineninformationen
                  veröffentlicht werden.
                </span>
                <select
                  className={selectClass}
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
                Veröffentlichungsstatus
                <span className={helpClass}>
                  Entwurf ist nicht öffentlich. Veröffentlicht macht die Seite
                  regulär verfügbar. Archiviert nimmt sie aus dem aktiven
                  Bestand.
                </span>
                <select
                  className={selectClass}
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
                Passendes SynSight-Modul
                <span className={helpClass}>
                  Verknüpft den Wissensinhalt fachlich mit einer Analyse oder
                  einem Bereich von SynSight.
                </span>
                <select
                  className={selectClass}
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
                <span className={helpClass}>
                  Hoch = wichtiges Kernthema oder Landingpage. Mittel =
                  unterstützender Inhalt. Niedrig = ergänzendes Thema.
                </span>
                <select
                  className={selectClass}
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
              Google & Suchmaschinen
            </h3>
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-white/35">
              Diese Angaben helfen Suchmaschinen zu verstehen, worum es auf der
              Seite geht. Die Vorschau oben zeigt sofort, wie Titel und
              Beschreibung zusammenwirken.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Google-Titel / SEO-Titel
                <span className={helpClass}>
                  Überschrift des Google-Suchergebnisses. Ideal ist meist ein
                  klarer Titel von ungefähr 35 bis 65 Zeichen.
                </span>
                <div className="flex items-center justify-end">
                  <span
                    className={`mt-1 text-[10px] ${counterClass(
                      form.seoTitle.length,
                      35,
                      65
                    )}`}
                  >
                    {form.seoTitle.length} Zeichen
                  </span>
                </div>
                <input
                  className={fieldClass}
                  value={form.seoTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, seoTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Bevorzugte Haupt-URL (Canonical)
                <span className={helpClass}>
                  Teilt Suchmaschinen mit, welche URL als Original gelten soll.
                  Leer lassen, wenn SynSight die eigene Seiten-URL verwenden
                  soll.
                </span>
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
                Google-Beschreibung / Meta-Description
                <span className={helpClass}>
                  Kurzer Text unter dem Titel im Suchergebnis. Er soll das
                  Suchproblem beantworten und zum Öffnen der Seite motivieren.
                  Als Orientierung sind etwa 120 bis 165 Zeichen sinnvoll.
                </span>
                <div className="flex items-center justify-end">
                  <span
                    className={`mt-1 text-[10px] ${counterClass(
                      form.metaDescription.length,
                      120,
                      165
                    )}`}
                  >
                    {form.metaDescription.length} Zeichen
                  </span>
                </div>
                <textarea
                  className={`${fieldClass} min-h-[88px]`}
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
                Themen & Suchbegriffe (kommagetrennt)
                <span className={helpClass}>
                  Redaktionelle Keyword-Liste für diese Seite. Der erste Begriff
                  wird momentan als Fokus-Suchbegriff für die lokale SEO-Prüfung
                  verwendet.
                </span>
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
                Social-Media-Titel
                <span className={helpClass}>
                  Titel, der beim Teilen der Seite z. B. in Messengern und
                  sozialen Netzwerken verwendet werden kann.
                </span>
                <input
                  className={fieldClass}
                  value={form.ogTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ogTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Social-Media-Vorschaubild
                <span className={helpClass}>
                  Bild, das beim Teilen der Seite angezeigt werden soll.
                </span>
                <input
                  className={fieldClass}
                  value={form.ogImageUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ogImageUrl: e.target.value }))
                  }
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Social-Media-Beschreibung
                <span className={helpClass}>
                  Kurzer Vorschautext für geteilte Links. Kann von der
                  Google-Beschreibung abweichen.
                </span>
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
                Format der Link-Vorschau
                <span className={helpClass}>
                  „Großes Bild“ eignet sich für Inhaltsseiten normalerweise am
                  besten.
                </span>
                <select
                  className={selectClass}
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
                  <span>
                    In Google aufnehmen
                    <span className="block text-[10px] text-white/30">
                      Suchmaschinen dürfen diese Seite indexieren.
                    </span>
                  </span>
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
                  <span>
                    Links verfolgen
                    <span className="block text-[10px] text-white/30">
                      Suchmaschinen dürfen Links dieser Seite weiterverfolgen.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-medium tracking-wide text-white/75">
              Einstieg der Seite
            </h3>
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-white/35">
              Der Hero ist der erste sichtbare Bereich Ihrer Wissensseite.
              Titel, Untertitel und Einleitung sollten das Problem des Nutzers
              sofort verständlich machen.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Hauptüberschrift im Seitenkopf
                <span className={helpClass}>
                  Die wichtigste sichtbare Überschrift für Besucher. Sie darf
                  verständlicher und emotionaler sein als der SEO-Titel.
                </span>
                <input
                  className={fieldClass}
                  value={form.heroTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, heroTitle: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Titelbild / Hero-Bild
                <span className={helpClass}>
                  Optionales Hauptbild im oberen Bereich der Wissensseite.
                </span>
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
                Unterüberschrift
                <span className={helpClass}>
                  Erklärt in einem Satz, was Besucher auf dieser Seite erwartet.
                </span>
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
                Einleitung
                <span className={helpClass}>
                  Führen Sie verständlich in das Problem ein. Der Leser sollte
                  nach wenigen Sätzen wissen, warum das Thema für ihn relevant
                  ist.
                </span>
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
              Handlungsaufforderung
            </h3>
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-white/35">
              Legt fest, welche Aktion Besucher nach dem Lesen ausführen sollen,
              zum Beispiel eine SynSight-Analyse oder den kostenlosen
              Demo-Scanner.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Ziel der Schaltfläche
                <span className={helpClass}>
                  Wählen Sie eine vorbereitete SynSight-Aktion oder verwenden
                  Sie eine eigene Handlungsaufforderung.
                </span>
                <select
                  className={selectClass}
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
                Text auf der Schaltfläche
                <span className={helpClass}>
                  Kurz und handlungsorientiert, z. B. „Jetzt prüfen“.
                </span>
                <input
                  className={fieldClass}
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Ziel der Schaltfläche
                <span className={helpClass}>
                  Interner Pfad oder vollständige Adresse, die beim Klick
                  geöffnet wird.
                </span>
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
              Keyword-Strategie & Suchintention
            </h3>
            <p className="mb-5 max-w-4xl text-xs leading-relaxed text-white/35">
              Diese Werte helfen bei der redaktionellen Planung. Suchvolumen und
              Keyword-Schwierigkeit werden nicht automatisch von Google
              ermittelt, sondern dienen hier als Planungswerte.
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <label className={labelClass}>
                Geschätztes monatliches Suchvolumen
                <span className={helpClass}>
                  Optionaler Planungswert: Wie häufig ungefähr nach diesem Thema
                  gesucht wird. 0 bedeutet „nicht gepflegt“.
                </span>
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
                Keyword-Wettbewerb (0–100)
                <span className={helpClass}>
                  0 = wenig Wettbewerb, 100 = sehr stark umkämpft. Dies ist ein
                  redaktioneller Planungswert.
                </span>
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
                Was möchte der Suchende erreichen?
                <span className={helpClass}>
                  Information = etwas verstehen. Kommerziell = Lösungen
                  vergleichen. Transaktional = handeln/kaufen. Navigation =
                  gezielt eine Marke oder Seite finden.
                </span>
                <select
                  className={selectClass}
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
                Wissensniveau der Zielgruppe
                <span className={helpClass}>
                  Bestimmt, wie technisch und ausführlich der Inhalt formuliert
                  werden sollte.
                </span>
                <select
                  className={selectClass}
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
                        className={selectClass}
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
                      className={selectClass}
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
              className={selectClass}
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
              className={selectClass}
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
              className={selectClass}
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
              className={selectClass}
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
