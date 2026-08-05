import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  seoKnowledgeFaqs,
  seoKnowledgeLinks,
  seoKnowledgePages,
  seoKnowledgeSections,
} from "@/lib/database/schema";
import {
  createInMemorySeoKnowledgeRepository,
  type SeoKnowledgeFaqInput,
  type SeoKnowledgeLinkInput,
  type SeoKnowledgeListFilters,
  type SeoKnowledgePageDetail,
  type SeoKnowledgePageRecord,
  type SeoKnowledgePageUpsertInput,
  type SeoKnowledgeRepository,
  type SeoKnowledgeSectionInput,
} from "../seo-knowledge-repository";

function mapPage(
  row: typeof seoKnowledgePages.$inferSelect
): SeoKnowledgePageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    status: row.status,
    category: row.category,
    targetModule: row.targetModule,
    seoPriority: row.seoPriority,
    searchIntent: row.searchIntent,
    difficulty: row.difficulty,
    riskLevel: row.riskLevel,
    searchVolume: row.searchVolume,
    keywordDifficulty: row.keywordDifficulty,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    metaKeywords: row.metaKeywords,
    canonicalUrl: row.canonicalUrl,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImageUrl: row.ogImageUrl,
    twitterCard: row.twitterCard,
    robotsIndex: row.robotsIndex,
    robotsFollow: row.robotsFollow,
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    heroImageUrl: row.heroImageUrl,
    intro: row.intro,
    ctaPreset: row.ctaPreset,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    authorId: row.authorId,
    authorName: row.authorName,
    publishedAt: row.publishedAt,
    deletedAt: row.deletedAt,
    automationFlagsJson: row.automationFlagsJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function pageColumns(input: SeoKnowledgePageUpsertInput) {
  return {
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
    publishedAt: input.publishedAt,
    automationFlagsJson: input.automationFlagsJson,
  };
}

async function loadChildren(
  db: SynSightDatabase,
  pageId: number
): Promise<Pick<SeoKnowledgePageDetail, "sections" | "faqs" | "links">> {
  const [sections, faqs, links] = await Promise.all([
    db
      .select()
      .from(seoKnowledgeSections)
      .where(eq(seoKnowledgeSections.pageId, pageId))
      .orderBy(
        asc(seoKnowledgeSections.sortOrder),
        asc(seoKnowledgeSections.id)
      ),
    db
      .select()
      .from(seoKnowledgeFaqs)
      .where(eq(seoKnowledgeFaqs.pageId, pageId))
      .orderBy(asc(seoKnowledgeFaqs.sortOrder), asc(seoKnowledgeFaqs.id)),
    db
      .select()
      .from(seoKnowledgeLinks)
      .where(eq(seoKnowledgeLinks.pageId, pageId))
      .orderBy(asc(seoKnowledgeLinks.sortOrder), asc(seoKnowledgeLinks.id)),
  ]);

  return {
    sections: sections.map((s) => ({
      id: s.id,
      pageId: s.pageId,
      sortOrder: s.sortOrder,
      sectionType: s.sectionType,
      heading: s.heading,
      body: s.body,
      imageUrl: s.imageUrl,
      metaJson: s.metaJson,
    })),
    faqs: faqs.map((f) => ({
      id: f.id,
      pageId: f.pageId,
      sortOrder: f.sortOrder,
      question: f.question,
      answer: f.answer,
    })),
    links: links.map((l) => ({
      id: l.id,
      pageId: l.pageId,
      sortOrder: l.sortOrder,
      linkType: l.linkType,
      target: l.target,
      label: l.label,
    })),
  };
}

async function replaceChildren(
  db: SynSightDatabase,
  pageId: number,
  sections: SeoKnowledgeSectionInput[],
  faqs: SeoKnowledgeFaqInput[],
  links: SeoKnowledgeLinkInput[]
) {
  await db
    .delete(seoKnowledgeSections)
    .where(eq(seoKnowledgeSections.pageId, pageId));
  await db.delete(seoKnowledgeFaqs).where(eq(seoKnowledgeFaqs.pageId, pageId));
  await db
    .delete(seoKnowledgeLinks)
    .where(eq(seoKnowledgeLinks.pageId, pageId));

  if (sections.length > 0) {
    await db.insert(seoKnowledgeSections).values(
      sections.map((section, index) => ({
        pageId,
        sortOrder: section.sortOrder ?? index,
        sectionType: section.sectionType,
        heading: section.heading,
        body: section.body,
        imageUrl: section.imageUrl,
        metaJson: section.metaJson,
      }))
    );
  }
  if (faqs.length > 0) {
    await db.insert(seoKnowledgeFaqs).values(
      faqs.map((faq, index) => ({
        pageId,
        sortOrder: faq.sortOrder ?? index,
        question: faq.question,
        answer: faq.answer,
      }))
    );
  }
  if (links.length > 0) {
    await db.insert(seoKnowledgeLinks).values(
      links.map((link, index) => ({
        pageId,
        sortOrder: link.sortOrder ?? index,
        linkType: link.linkType,
        target: link.target,
        label: link.label,
      }))
    );
  }
}

function createMysqlSeoKnowledgeRepository(
  db: SynSightDatabase
): SeoKnowledgeRepository {
  return {
    async listPages(filters: SeoKnowledgeListFilters) {
      const conditions = [];
      if (filters.trash) {
        conditions.push(isNotNull(seoKnowledgePages.deletedAt));
      } else {
        conditions.push(isNull(seoKnowledgePages.deletedAt));
      }
      if (filters.q) {
        const likeQ = `%${filters.q}%`;
        conditions.push(
          or(
            like(seoKnowledgePages.title, likeQ),
            like(seoKnowledgePages.slug, likeQ),
            like(seoKnowledgePages.category, likeQ)
          )!
        );
      }
      if (filters.category) {
        conditions.push(eq(seoKnowledgePages.category, filters.category));
      }
      if (filters.status && filters.status !== "all") {
        conditions.push(eq(seoKnowledgePages.status, filters.status));
      }
      if (filters.targetModule) {
        conditions.push(
          eq(seoKnowledgePages.targetModule, filters.targetModule)
        );
      }
      if (filters.priority && filters.priority !== "all") {
        conditions.push(eq(seoKnowledgePages.seoPriority, filters.priority));
      }
      if (filters.language) {
        conditions.push(eq(seoKnowledgePages.language, filters.language));
      }

      const where = conditions.length ? and(...conditions) : undefined;
      const sortDir = filters.sortDir === "asc" ? asc : desc;
      let orderExpr;
      switch (filters.sortBy) {
        case "title":
          orderExpr = sortDir(seoKnowledgePages.title);
          break;
        case "createdAt":
          orderExpr = sortDir(seoKnowledgePages.createdAt);
          break;
        case "priority":
          orderExpr = sortDir(seoKnowledgePages.seoPriority);
          break;
        case "searchVolume":
          orderExpr = sortDir(seoKnowledgePages.searchVolume);
          break;
        case "updatedAt":
        default:
          orderExpr = sortDir(seoKnowledgePages.updatedAt);
          break;
      }

      const offset = filters.offset ?? 0;
      const limit = Math.min(filters.limit ?? 100, 500);

      const [rows, countRows] = await Promise.all([
        db
          .select()
          .from(seoKnowledgePages)
          .where(where)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(seoKnowledgePages)
          .where(where),
      ]);

      return {
        items: rows.map(mapPage),
        total: Number(countRows[0]?.count ?? 0),
      };
    },

    async getPageById(id, includeDeleted = false) {
      const rows = await db
        .select()
        .from(seoKnowledgePages)
        .where(eq(seoKnowledgePages.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      if (row.deletedAt && !includeDeleted) return null;
      const children = await loadChildren(db, id);
      return { ...mapPage(row), ...children };
    },

    async getPageBySlug(slug, language = "de", opts) {
      const conditions = [
        eq(seoKnowledgePages.slug, slug),
        eq(seoKnowledgePages.language, language),
      ];
      if (!opts?.includeDeleted) {
        conditions.push(isNull(seoKnowledgePages.deletedAt));
      }
      if (opts?.publishedOnly) {
        conditions.push(eq(seoKnowledgePages.status, "published"));
      }
      const rows = await db
        .select()
        .from(seoKnowledgePages)
        .where(and(...conditions))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const children = await loadChildren(db, row.id);
      return { ...mapPage(row), ...children };
    },

    async createPage(input) {
      const publishedAt =
        input.status === "published"
          ? (input.publishedAt ?? new Date().toISOString())
          : null;
      const result = await db.insert(seoKnowledgePages).values({
        ...pageColumns({ ...input, publishedAt }),
      });
      const id = Number(result[0]?.insertId ?? 0);
      if (!id) {
        const bySlug = await this.getPageBySlug(input.slug, input.language, {
          includeDeleted: true,
        });
        if (!bySlug) throw new Error("SEO_PAGE_CREATE_FAILED");
        await replaceChildren(
          db,
          bySlug.id,
          input.sections,
          input.faqs,
          input.links
        );
        return (await this.getPageById(bySlug.id, true))!;
      }
      await replaceChildren(db, id, input.sections, input.faqs, input.links);
      return (await this.getPageById(id, true))!;
    },

    async updatePage(id, input) {
      const existing = await this.getPageById(id, true);
      if (!existing || existing.deletedAt) return null;
      const publishedAt =
        input.status === "published"
          ? (input.publishedAt ??
            existing.publishedAt ??
            new Date().toISOString())
          : existing.publishedAt;
      await db
        .update(seoKnowledgePages)
        .set(pageColumns({ ...input, publishedAt }))
        .where(eq(seoKnowledgePages.id, id));
      await replaceChildren(db, id, input.sections, input.faqs, input.links);
      return this.getPageById(id, true);
    },

    async softDeletePage(id) {
      const result = await db
        .update(seoKnowledgePages)
        .set({ deletedAt: sql`CURRENT_TIMESTAMP(3)` })
        .where(
          and(eq(seoKnowledgePages.id, id), isNull(seoKnowledgePages.deletedAt))
        );
      return (
        Number((result as { rowsAffected?: number }).rowsAffected ?? 1) > 0
      );
    },

    async restorePage(id) {
      const result = await db
        .update(seoKnowledgePages)
        .set({ deletedAt: null })
        .where(
          and(
            eq(seoKnowledgePages.id, id),
            isNotNull(seoKnowledgePages.deletedAt)
          )
        );
      return (
        Number((result as { rowsAffected?: number }).rowsAffected ?? 1) > 0
      );
    },

    async hardDeletePage(id) {
      const result = await db
        .delete(seoKnowledgePages)
        .where(eq(seoKnowledgePages.id, id));
      return (
        Number((result as { rowsAffected?: number }).rowsAffected ?? 1) > 0
      );
    },

    async duplicatePage(id, opts) {
      const source = await this.getPageById(id);
      if (!source) return null;
      const { sections, faqs, links, ...rest } = source;
      return this.createPage({
        ...rest,
        slug: `${source.slug}-kopie-${Date.now().toString(36)}`,
        title: `${source.title} (Kopie)`,
        status: "draft",
        publishedAt: null,
        authorId: opts.authorId,
        authorName: opts.authorName,
        sections: sections.map(({ id: _i, pageId: _p, ...s }) => s),
        faqs: faqs.map(({ id: _i, pageId: _p, ...f }) => f),
        links: links.map(({ id: _i, pageId: _p, ...l }) => l),
      });
    },

    async listPublishedSlugs(language = "de") {
      const rows = await db
        .select({
          slug: seoKnowledgePages.slug,
          updatedAt: seoKnowledgePages.updatedAt,
          language: seoKnowledgePages.language,
        })
        .from(seoKnowledgePages)
        .where(
          and(
            isNull(seoKnowledgePages.deletedAt),
            eq(seoKnowledgePages.status, "published"),
            eq(seoKnowledgePages.language, language)
          )
        )
        .orderBy(desc(seoKnowledgePages.updatedAt));
      return rows;
    },
  };
}

export function createSeoKnowledgeRepository(
  db: SynSightDatabase | null
): SeoKnowledgeRepository {
  return db
    ? createMysqlSeoKnowledgeRepository(db)
    : createInMemorySeoKnowledgeRepository();
}
