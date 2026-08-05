import { z } from "zod";

const sectionType = z.enum([
  "content",
  "infobox",
  "hint",
  "code",
  "table",
  "list",
]);
const linkType = z.enum(["wissen", "analyse", "landing", "module"]);
const status = z.enum(["draft", "published", "archived"]);
const priority = z.enum(["hoch", "mittel", "niedrig"]);
const intent = z.enum([
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);
const difficulty = z.enum(["einsteiger", "fortgeschritten", "experte"]);
const risk = z.enum(["niedrig", "mittel", "hoch", "kritisch"]);
const ctaPreset = z.enum([
  "analyse_starten",
  "kostenlos_testen",
  "jetzt_pruefen",
  "custom",
]);

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: nur a-z, 0-9 und Bindestriche");

export const seoKnowledgeSectionSchema = z.object({
  id: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).default(0),
  sectionType: sectionType.default("content"),
  heading: z.string().trim().max(255).nullable().optional(),
  body: z.string().nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  metaJson: z.unknown().nullable().optional(),
});

export const seoKnowledgeFaqSchema = z.object({
  id: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).default(0),
  question: z.string().trim().min(2).max(500),
  answer: z.string().trim().min(1).max(10_000),
});

export const seoKnowledgeLinkSchema = z.object({
  id: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).default(0),
  linkType: linkType.default("wissen"),
  target: z.string().trim().min(1).max(500),
  label: z.string().trim().min(1).max(255),
});

export const seoKnowledgeUpsertSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(255),
  language: z.string().trim().min(2).max(8).default("de"),
  status: status.default("draft"),
  category: z.string().trim().min(1).max(64),
  targetModule: z.string().trim().min(1).max(64),
  seoPriority: priority.default("mittel"),
  searchIntent: intent.default("informational"),
  difficulty: difficulty.default("einsteiger"),
  riskLevel: risk.default("mittel"),
  searchVolume: z.number().int().min(0).max(10_000_000).default(0),
  keywordDifficulty: z.number().int().min(0).max(100).default(0),
  seoTitle: z.string().trim().max(255).nullable().optional(),
  metaDescription: z.string().trim().max(500).nullable().optional(),
  metaKeywords: z.string().trim().max(2000).nullable().optional(),
  canonicalUrl: z.string().trim().max(500).nullable().optional(),
  ogTitle: z.string().trim().max(255).nullable().optional(),
  ogDescription: z.string().trim().max(500).nullable().optional(),
  ogImageUrl: z.string().trim().max(500).nullable().optional(),
  twitterCard: z.string().trim().max(32).default("summary_large_image"),
  robotsIndex: z.boolean().default(true),
  robotsFollow: z.boolean().default(true),
  heroTitle: z.string().trim().max(255).nullable().optional(),
  heroSubtitle: z.string().trim().max(500).nullable().optional(),
  heroImageUrl: z.string().trim().max(500).nullable().optional(),
  intro: z.string().nullable().optional(),
  ctaPreset: ctaPreset.default("jetzt_pruefen"),
  ctaLabel: z.string().trim().min(1).max(120).default("Jetzt prüfen"),
  ctaHref: z.string().trim().min(1).max(500).default("/#demo-scanner"),
  automationFlagsJson: z.unknown().nullable().optional(),
  sections: z.array(seoKnowledgeSectionSchema).max(200).default([]),
  faqs: z.array(seoKnowledgeFaqSchema).max(100).default([]),
  links: z.array(seoKnowledgeLinkSchema).max(100).default([]),
});

export const seoKnowledgeListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(64).optional(),
  status: z.union([status, z.literal("all")]).optional(),
  targetModule: z.string().trim().max(64).optional(),
  priority: z.union([priority, z.literal("all")]).optional(),
  language: z.string().trim().max(8).optional(),
  trash: z
    .union([
      z.literal("1"),
      z.literal("true"),
      z.literal("0"),
      z.literal("false"),
    ])
    .optional(),
  sortBy: z
    .enum(["title", "updatedAt", "createdAt", "priority", "searchVolume"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type SeoKnowledgeUpsertParsed = z.infer<typeof seoKnowledgeUpsertSchema>;
