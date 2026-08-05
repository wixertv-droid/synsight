import { describe, expect, it } from "vitest";
import { createInMemorySeoKnowledgeRepository } from "@/lib/repositories/seo-knowledge-repository";

function sampleInput(slug = "digitaler-fussabdruck") {
  return {
    slug,
    title: "Digitaler Fußabdruck",
    language: "de",
    status: "draft" as const,
    category: "OSINT",
    targetModule: "dashboard",
    seoPriority: "hoch" as const,
    searchIntent: "informational" as const,
    difficulty: "einsteiger" as const,
    riskLevel: "mittel" as const,
    searchVolume: 1200,
    keywordDifficulty: 35,
    seoTitle: "Digitaler Fußabdruck prüfen",
    metaDescription: "So prüfen Sie Ihren digitalen Fußabdruck.",
    metaKeywords: "digitaler fussabdruck, osint",
    canonicalUrl: null,
    ogTitle: null,
    ogDescription: null,
    ogImageUrl: null,
    twitterCard: "summary_large_image",
    robotsIndex: true,
    robotsFollow: true,
    heroTitle: "Digitaler Fußabdruck",
    heroSubtitle: "Was online über Sie steht",
    heroImageUrl: null,
    intro: "Einführungstext",
    ctaPreset: "jetzt_pruefen" as const,
    ctaLabel: "Jetzt prüfen",
    ctaHref: "/#demo-scanner",
    authorId: 1,
    authorName: "Admin",
    publishedAt: null,
    automationFlagsJson: { sitemap: true },
    sections: [
      {
        sortOrder: 0,
        sectionType: "content" as const,
        heading: "Was bedeutet das?",
        body: "Inhalt",
        imageUrl: null,
        metaJson: null,
      },
    ],
    faqs: [
      {
        sortOrder: 0,
        question: "Was ist ein digitaler Fußabdruck?",
        answer: "Öffentliche Spuren im Netz.",
      },
    ],
    links: [
      {
        sortOrder: 0,
        linkType: "analyse" as const,
        target: "/analysen",
        label: "Analysen",
      },
    ],
  };
}

describe("seo knowledge repository (in-memory)", () => {
  it("supports create, list, update, soft-delete, restore, duplicate", async () => {
    const repo = createInMemorySeoKnowledgeRepository();
    const created = await repo.createPage(sampleInput());
    expect(created.id).toBeGreaterThan(0);
    expect(created.sections).toHaveLength(1);
    expect(created.faqs).toHaveLength(1);

    const listed = await repo.listPages({ q: "Fußabdruck" });
    expect(listed.total).toBe(1);

    const updated = await repo.updatePage(created.id, {
      ...sampleInput(),
      status: "published",
      title: "Aktualisiert",
      sections: [
        {
          sortOrder: 0,
          sectionType: "infobox",
          heading: "Hinweis",
          body: "Neu",
          imageUrl: null,
          metaJson: null,
        },
      ],
      faqs: [],
      links: [],
    });
    expect(updated?.title).toBe("Aktualisiert");
    expect(updated?.status).toBe("published");
    expect(updated?.publishedAt).toBeTruthy();

    const pub = await repo.getPageBySlug("digitaler-fussabdruck", "de", {
      publishedOnly: true,
    });
    expect(pub?.title).toBe("Aktualisiert");

    const dup = await repo.duplicatePage(created.id, {
      authorId: 2,
      authorName: "Copy",
    });
    expect(dup?.status).toBe("draft");
    expect(dup?.slug).toContain("kopie");

    await repo.softDeletePage(created.id);
    const afterSoft = await repo.listPages({});
    expect(afterSoft.total).toBe(1); // only duplicate remains
    const trash = await repo.listPages({ trash: true });
    expect(trash.total).toBe(1);

    await repo.restorePage(created.id);
    expect((await repo.listPages({})).total).toBe(2);

    await repo.hardDeletePage(created.id);
    expect(await repo.getPageById(created.id, true)).toBeNull();
  });
});
