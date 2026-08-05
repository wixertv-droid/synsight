/**
 * SEO Knowledge CMS — repository contract (in-memory + MySQL).
 */

export type SeoKnowledgeStatus = "draft" | "published" | "archived";
export type SeoKnowledgePriority = "hoch" | "mittel" | "niedrig";
export type SeoKnowledgeIntent =
  "informational" | "commercial" | "transactional" | "navigational";
export type SeoKnowledgeDifficulty =
  "einsteiger" | "fortgeschritten" | "experte";
export type SeoKnowledgeRisk = "niedrig" | "mittel" | "hoch" | "kritisch";
export type SeoKnowledgeCtaPreset =
  "analyse_starten" | "kostenlos_testen" | "jetzt_pruefen" | "custom";
export type SeoKnowledgeSectionType =
  "content" | "infobox" | "hint" | "code" | "table" | "list";
export type SeoKnowledgeLinkType = "wissen" | "analyse" | "landing" | "module";

export type SeoKnowledgeSectionInput = {
  id?: number;
  sortOrder: number;
  sectionType: SeoKnowledgeSectionType;
  heading: string | null;
  body: string | null;
  imageUrl: string | null;
  metaJson: unknown | null;
};

export type SeoKnowledgeFaqInput = {
  id?: number;
  sortOrder: number;
  question: string;
  answer: string;
};

export type SeoKnowledgeLinkInput = {
  id?: number;
  sortOrder: number;
  linkType: SeoKnowledgeLinkType;
  target: string;
  label: string;
};

export type SeoKnowledgePageRecord = {
  id: number;
  slug: string;
  title: string;
  language: string;
  status: SeoKnowledgeStatus;
  category: string;
  targetModule: string;
  seoPriority: SeoKnowledgePriority;
  searchIntent: SeoKnowledgeIntent;
  difficulty: SeoKnowledgeDifficulty;
  riskLevel: SeoKnowledgeRisk;
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
  ctaPreset: SeoKnowledgeCtaPreset;
  ctaLabel: string;
  ctaHref: string;
  authorId: number | null;
  authorName: string | null;
  publishedAt: string | null;
  deletedAt: string | null;
  automationFlagsJson: unknown | null;
  createdAt: string;
  updatedAt: string;
};

export type SeoKnowledgeSectionRecord = SeoKnowledgeSectionInput & {
  id: number;
  pageId: number;
};

export type SeoKnowledgeFaqRecord = SeoKnowledgeFaqInput & {
  id: number;
  pageId: number;
};

export type SeoKnowledgeLinkRecord = SeoKnowledgeLinkInput & {
  id: number;
  pageId: number;
};

export type SeoKnowledgePageDetail = SeoKnowledgePageRecord & {
  sections: SeoKnowledgeSectionRecord[];
  faqs: SeoKnowledgeFaqRecord[];
  links: SeoKnowledgeLinkRecord[];
};

export type SeoKnowledgeListFilters = {
  q?: string;
  category?: string;
  status?: SeoKnowledgeStatus | "all";
  targetModule?: string;
  priority?: SeoKnowledgePriority | "all";
  language?: string;
  trash?: boolean;
  sortBy?: "title" | "updatedAt" | "createdAt" | "priority" | "searchVolume";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type SeoKnowledgePageUpsertInput = {
  slug: string;
  title: string;
  language: string;
  status: SeoKnowledgeStatus;
  category: string;
  targetModule: string;
  seoPriority: SeoKnowledgePriority;
  searchIntent: SeoKnowledgeIntent;
  difficulty: SeoKnowledgeDifficulty;
  riskLevel: SeoKnowledgeRisk;
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
  ctaPreset: SeoKnowledgeCtaPreset;
  ctaLabel: string;
  ctaHref: string;
  authorId: number | null;
  authorName: string | null;
  publishedAt: string | null;
  automationFlagsJson: unknown | null;
  sections: SeoKnowledgeSectionInput[];
  faqs: SeoKnowledgeFaqInput[];
  links: SeoKnowledgeLinkInput[];
};

export interface SeoKnowledgeRepository {
  listPages(
    filters: SeoKnowledgeListFilters
  ): Promise<{ items: SeoKnowledgePageRecord[]; total: number }>;
  getPageById(
    id: number,
    includeDeleted?: boolean
  ): Promise<SeoKnowledgePageDetail | null>;
  getPageBySlug(
    slug: string,
    language?: string,
    opts?: { publishedOnly?: boolean; includeDeleted?: boolean }
  ): Promise<SeoKnowledgePageDetail | null>;
  createPage(
    input: SeoKnowledgePageUpsertInput
  ): Promise<SeoKnowledgePageDetail>;
  updatePage(
    id: number,
    input: SeoKnowledgePageUpsertInput
  ): Promise<SeoKnowledgePageDetail | null>;
  softDeletePage(id: number): Promise<boolean>;
  restorePage(id: number): Promise<boolean>;
  hardDeletePage(id: number): Promise<boolean>;
  duplicatePage(
    id: number,
    opts: { authorId: number | null; authorName: string | null }
  ): Promise<SeoKnowledgePageDetail | null>;
  listPublishedSlugs(
    language?: string
  ): Promise<Array<{ slug: string; updatedAt: string; language: string }>>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneDetail(page: SeoKnowledgePageDetail): SeoKnowledgePageDetail {
  return JSON.parse(JSON.stringify(page)) as SeoKnowledgePageDetail;
}

export function createInMemorySeoKnowledgeRepository(): SeoKnowledgeRepository {
  let nextPageId = 1;
  let nextSectionId = 1;
  let nextFaqId = 1;
  let nextLinkId = 1;
  const pages = new Map<number, SeoKnowledgePageDetail>();

  function matches(
    page: SeoKnowledgePageRecord,
    filters: SeoKnowledgeListFilters
  ) {
    if (filters.trash) {
      if (!page.deletedAt) return false;
    } else if (page.deletedAt) {
      return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = `${page.title} ${page.slug} ${page.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category && page.category !== filters.category) return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      page.status !== filters.status
    ) {
      return false;
    }
    if (filters.targetModule && page.targetModule !== filters.targetModule) {
      return false;
    }
    if (
      filters.priority &&
      filters.priority !== "all" &&
      page.seoPriority !== filters.priority
    ) {
      return false;
    }
    if (filters.language && page.language !== filters.language) return false;
    return true;
  }

  function sortItems(
    items: SeoKnowledgePageRecord[],
    sortBy: SeoKnowledgeListFilters["sortBy"],
    sortDir: "asc" | "desc"
  ) {
    const dir = sortDir === "asc" ? 1 : -1;
    const priorityRank: Record<SeoKnowledgePriority, number> = {
      hoch: 3,
      mittel: 2,
      niedrig: 1,
    };
    items.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title, "de") * dir;
        case "createdAt":
          return a.createdAt.localeCompare(b.createdAt) * dir;
        case "priority":
          return (
            (priorityRank[a.seoPriority] - priorityRank[b.seoPriority]) * dir
          );
        case "searchVolume":
          return (a.searchVolume - b.searchVolume) * dir;
        case "updatedAt":
        default:
          return a.updatedAt.localeCompare(b.updatedAt) * dir;
      }
    });
  }

  function attachChildren(
    base: SeoKnowledgePageRecord,
    input: SeoKnowledgePageUpsertInput
  ): SeoKnowledgePageDetail {
    const sections = input.sections.map((section, index) => ({
      id: section.id && section.id > 0 ? section.id : nextSectionId++,
      pageId: base.id,
      sortOrder: section.sortOrder ?? index,
      sectionType: section.sectionType,
      heading: section.heading,
      body: section.body,
      imageUrl: section.imageUrl,
      metaJson: section.metaJson,
    }));
    const faqs = input.faqs.map((faq, index) => ({
      id: faq.id && faq.id > 0 ? faq.id : nextFaqId++,
      pageId: base.id,
      sortOrder: faq.sortOrder ?? index,
      question: faq.question,
      answer: faq.answer,
    }));
    const links = input.links.map((link, index) => ({
      id: link.id && link.id > 0 ? link.id : nextLinkId++,
      pageId: base.id,
      sortOrder: link.sortOrder ?? index,
      linkType: link.linkType,
      target: link.target,
      label: link.label,
    }));
    return { ...base, sections, faqs, links };
  }

  return {
    async listPages(filters) {
      const all = [...pages.values()].map((p) => {
        const { sections: _s, faqs: _f, links: _l, ...rest } = p;
        return rest;
      });
      const filtered = all.filter((p) => matches(p, filters));
      sortItems(
        filtered,
        filters.sortBy ?? "updatedAt",
        filters.sortDir ?? "desc"
      );
      const total = filtered.length;
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 100;
      return { items: filtered.slice(offset, offset + limit), total };
    },

    async getPageById(id, includeDeleted = false) {
      const page = pages.get(id);
      if (!page) return null;
      if (page.deletedAt && !includeDeleted) return null;
      return cloneDetail(page);
    },

    async getPageBySlug(slug, language = "de", opts) {
      for (const page of pages.values()) {
        if (page.slug !== slug || page.language !== language) continue;
        if (page.deletedAt && !opts?.includeDeleted) continue;
        if (opts?.publishedOnly && page.status !== "published") continue;
        return cloneDetail(page);
      }
      return null;
    },

    async createPage(input) {
      const ts = nowIso();
      const id = nextPageId++;
      const base: SeoKnowledgePageRecord = {
        id,
        slug: input.slug,
        title: input.title,
        language: input.language,
        status: input.status,
        category: input.category,
        targetModule: input.targetModule,
        seoPriority: input.seoPriority,
        searchIntent: input.searchIntent,
        difficulty: input.difficulty,
        riskLevel: input.riskLevel,
        searchVolume: input.searchVolume,
        keywordDifficulty: input.keywordDifficulty,
        seoTitle: input.seoTitle,
        metaDescription: input.metaDescription,
        metaKeywords: input.metaKeywords,
        canonicalUrl: input.canonicalUrl,
        ogTitle: input.ogTitle,
        ogDescription: input.ogDescription,
        ogImageUrl: input.ogImageUrl,
        twitterCard: input.twitterCard,
        robotsIndex: input.robotsIndex,
        robotsFollow: input.robotsFollow,
        heroTitle: input.heroTitle,
        heroSubtitle: input.heroSubtitle,
        heroImageUrl: input.heroImageUrl,
        intro: input.intro,
        ctaPreset: input.ctaPreset,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        authorId: input.authorId,
        authorName: input.authorName,
        publishedAt:
          input.status === "published" ? (input.publishedAt ?? ts) : null,
        deletedAt: null,
        automationFlagsJson: input.automationFlagsJson,
        createdAt: ts,
        updatedAt: ts,
      };
      const detail = attachChildren(base, input);
      pages.set(id, detail);
      return cloneDetail(detail);
    },

    async updatePage(id, input) {
      const existing = pages.get(id);
      if (!existing || existing.deletedAt) return null;
      const ts = nowIso();
      const publishedAt =
        input.status === "published"
          ? (input.publishedAt ?? existing.publishedAt ?? ts)
          : existing.publishedAt;
      const base: SeoKnowledgePageRecord = {
        ...existing,
        slug: input.slug,
        title: input.title,
        language: input.language,
        status: input.status,
        category: input.category,
        targetModule: input.targetModule,
        seoPriority: input.seoPriority,
        searchIntent: input.searchIntent,
        difficulty: input.difficulty,
        riskLevel: input.riskLevel,
        searchVolume: input.searchVolume,
        keywordDifficulty: input.keywordDifficulty,
        seoTitle: input.seoTitle,
        metaDescription: input.metaDescription,
        metaKeywords: input.metaKeywords,
        canonicalUrl: input.canonicalUrl,
        ogTitle: input.ogTitle,
        ogDescription: input.ogDescription,
        ogImageUrl: input.ogImageUrl,
        twitterCard: input.twitterCard,
        robotsIndex: input.robotsIndex,
        robotsFollow: input.robotsFollow,
        heroTitle: input.heroTitle,
        heroSubtitle: input.heroSubtitle,
        heroImageUrl: input.heroImageUrl,
        intro: input.intro,
        ctaPreset: input.ctaPreset,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        authorId: input.authorId ?? existing.authorId,
        authorName: input.authorName ?? existing.authorName,
        publishedAt,
        automationFlagsJson: input.automationFlagsJson,
        updatedAt: ts,
      };
      const detail = attachChildren(base, {
        ...input,
        sections: input.sections.map((s) => ({
          ...s,
          id: undefined,
        })),
        faqs: input.faqs.map((f) => ({ ...f, id: undefined })),
        links: input.links.map((l) => ({ ...l, id: undefined })),
      });
      pages.set(id, detail);
      return cloneDetail(detail);
    },

    async softDeletePage(id) {
      const page = pages.get(id);
      if (!page || page.deletedAt) return false;
      page.deletedAt = nowIso();
      page.updatedAt = page.deletedAt;
      return true;
    },

    async restorePage(id) {
      const page = pages.get(id);
      if (!page || !page.deletedAt) return false;
      page.deletedAt = null;
      page.updatedAt = nowIso();
      return true;
    },

    async hardDeletePage(id) {
      return pages.delete(id);
    },

    async duplicatePage(id, opts) {
      const source = pages.get(id);
      if (!source || source.deletedAt) return null;
      const { sections, faqs, links, ...rest } = source;
      return this.createPage({
        ...rest,
        slug: `${source.slug}-kopie-${Date.now().toString(36)}`,
        title: `${source.title} (Kopie)`,
        status: "draft",
        publishedAt: null,
        authorId: opts.authorId,
        authorName: opts.authorName,
        sections: sections.map(({ id: _id, pageId: _p, ...s }) => s),
        faqs: faqs.map(({ id: _id, pageId: _p, ...f }) => f),
        links: links.map(({ id: _id, pageId: _p, ...l }) => l),
      });
    },

    async listPublishedSlugs(language = "de") {
      return [...pages.values()]
        .filter(
          (p) =>
            !p.deletedAt && p.status === "published" && p.language === language
        )
        .map((p) => ({
          slug: p.slug,
          updatedAt: p.updatedAt,
          language: p.language,
        }));
    },
  };
}
