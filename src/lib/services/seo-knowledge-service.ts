import type { AuthenticatedUser } from "@/lib/auth/types";
import { getSeoKnowledgeRepository } from "@/lib/repositories";
import type {
  SeoKnowledgeListFilters,
  SeoKnowledgePageDetail,
  SeoKnowledgePageUpsertInput,
} from "@/lib/repositories/seo-knowledge-repository";
import type { SeoKnowledgeUpsertParsed } from "@/lib/validation/admin-seo-knowledge";

export class AdminForbiddenError extends Error {
  constructor() {
    super("ADMIN_FORBIDDEN");
  }
}

export class SeoPageNotFoundError extends Error {
  constructor() {
    super("SEO_PAGE_NOT_FOUND");
  }
}

export class SeoPageConflictError extends Error {
  constructor(message = "SEO_PAGE_CONFLICT") {
    super(message);
  }
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new AdminForbiddenError();
}

function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: string;
    errno?: number;
    cause?: { code?: string; errno?: number };
  };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.errno === 1062 ||
    candidate.cause?.code === "ER_DUP_ENTRY" ||
    candidate.cause?.errno === 1062
  );
}

const CTA_PRESET_LABELS: Record<string, string> = {
  analyse_starten: "Analyse starten",
  kostenlos_testen: "Kostenlos testen",
  jetzt_pruefen: "Jetzt prüfen",
};

export function resolveCtaLabel(preset: string, customLabel: string): string {
  if (preset === "custom") return customLabel || "Jetzt prüfen";
  return CTA_PRESET_LABELS[preset] ?? customLabel;
}

function toUpsertInput(
  data: SeoKnowledgeUpsertParsed,
  actor: AuthenticatedUser
): SeoKnowledgePageUpsertInput {
  const ctaLabel = resolveCtaLabel(data.ctaPreset, data.ctaLabel);
  return {
    slug: data.slug,
    title: data.title,
    language: data.language,
    status: data.status,
    category: data.category,
    targetModule: data.targetModule,
    seoPriority: data.seoPriority,
    searchIntent: data.searchIntent,
    difficulty: data.difficulty,
    riskLevel: data.riskLevel,
    searchVolume: data.searchVolume,
    keywordDifficulty: data.keywordDifficulty,
    seoTitle: data.seoTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    metaKeywords: data.metaKeywords ?? null,
    canonicalUrl: data.canonicalUrl ?? null,
    ogTitle: data.ogTitle ?? null,
    ogDescription: data.ogDescription ?? null,
    ogImageUrl: data.ogImageUrl ?? null,
    twitterCard: data.twitterCard,
    robotsIndex: data.robotsIndex,
    robotsFollow: data.robotsFollow,
    heroTitle: data.heroTitle ?? null,
    heroSubtitle: data.heroSubtitle ?? null,
    heroImageUrl: data.heroImageUrl ?? null,
    intro: data.intro ?? null,
    ctaPreset: data.ctaPreset,
    ctaLabel,
    ctaHref: data.ctaHref,
    authorId: Number(actor.id) || null,
    authorName: actor.displayName || actor.email,
    publishedAt: null,
    automationFlagsJson: data.automationFlagsJson ?? {
      sitemap: true,
      jsonLdFaq: true,
      breadcrumbs: true,
      openGraph: true,
      canonical: true,
      internalLinks: true,
      rss: false,
      multilingual: false,
      aiAssist: false,
    },
    sections: (data.sections ?? []).map((section, index) => ({
      sortOrder: section.sortOrder ?? index,
      sectionType: section.sectionType,
      heading: section.heading ?? null,
      body: section.body ?? null,
      imageUrl: section.imageUrl ?? null,
      metaJson: section.metaJson ?? null,
    })),
    faqs: (data.faqs ?? []).map((faq, index) => ({
      sortOrder: faq.sortOrder ?? index,
      question: faq.question,
      answer: faq.answer,
    })),
    links: (data.links ?? []).map((link, index) => ({
      sortOrder: link.sortOrder ?? index,
      linkType: link.linkType,
      target: link.target,
      label: link.label,
    })),
  };
}

export async function listSeoKnowledgePages(
  actor: AuthenticatedUser,
  filters: SeoKnowledgeListFilters
) {
  assertAdmin(actor);
  return getSeoKnowledgeRepository().listPages(filters);
}

export async function getSeoKnowledgePageAdmin(
  actor: AuthenticatedUser,
  id: number,
  includeDeleted = false
): Promise<SeoKnowledgePageDetail> {
  assertAdmin(actor);
  const page = await getSeoKnowledgeRepository().getPageById(
    id,
    includeDeleted
  );
  if (!page) throw new SeoPageNotFoundError();
  return page;
}

export async function createSeoKnowledgePage(
  actor: AuthenticatedUser,
  data: SeoKnowledgeUpsertParsed
): Promise<SeoKnowledgePageDetail> {
  assertAdmin(actor);
  try {
    return await getSeoKnowledgeRepository().createPage(
      toUpsertInput(data, actor)
    );
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new SeoPageConflictError("Slug bereits vergeben");
    }
    throw error;
  }
}

export async function updateSeoKnowledgePage(
  actor: AuthenticatedUser,
  id: number,
  data: SeoKnowledgeUpsertParsed
): Promise<SeoKnowledgePageDetail> {
  assertAdmin(actor);
  try {
    const page = await getSeoKnowledgeRepository().updatePage(
      id,
      toUpsertInput(data, actor)
    );
    if (!page) throw new SeoPageNotFoundError();
    return page;
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) throw error;
    if (isDuplicateKey(error)) {
      throw new SeoPageConflictError("Slug bereits vergeben");
    }
    throw error;
  }
}

export async function softDeleteSeoKnowledgePage(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);
  const ok = await getSeoKnowledgeRepository().softDeletePage(id);
  if (!ok) throw new SeoPageNotFoundError();
  return { deleted: true, soft: true };
}

export async function restoreSeoKnowledgePage(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);
  const ok = await getSeoKnowledgeRepository().restorePage(id);
  if (!ok) throw new SeoPageNotFoundError();
  return { restored: true };
}

export async function hardDeleteSeoKnowledgePage(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);
  const ok = await getSeoKnowledgeRepository().hardDeletePage(id);
  if (!ok) throw new SeoPageNotFoundError();
  return { deleted: true, soft: false };
}

export async function duplicateSeoKnowledgePage(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);
  const page = await getSeoKnowledgeRepository().duplicatePage(id, {
    authorId: Number(actor.id) || null,
    authorName: actor.displayName || actor.email,
  });
  if (!page) throw new SeoPageNotFoundError();
  return page;
}

/** Public: only published, non-deleted pages. */
export async function getPublishedSeoKnowledgePage(
  slug: string,
  language = "de"
) {
  return getSeoKnowledgeRepository().getPageBySlug(slug, language, {
    publishedOnly: true,
  });
}

export async function listPublishedSeoKnowledgeSlugs(language = "de") {
  return getSeoKnowledgeRepository().listPublishedSlugs(language);
}

export async function listPublishedSeoKnowledgePages(limit = 100) {
  return getSeoKnowledgeRepository().listPages({
    status: "published",
    trash: false,
    sortBy: "updatedAt",
    sortDir: "desc",
    limit,
  });
}
