import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { getActiveToolLandings } from "@/lib/seo/active-modules";
import { listPublishedSeoKnowledgeSlugs } from "@/lib/services/seo-knowledge-service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: "weekly" | "monthly" | "yearly";
  }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/analysen", priority: 0.95, changeFrequency: "weekly" },
    { path: "/wissen", priority: 0.85, changeFrequency: "weekly" },
    { path: "/hilfe", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/impressum", priority: 0.3, changeFrequency: "yearly" },
    { path: "/datenschutz", priority: 0.4, changeFrequency: "yearly" },
    { path: "/agb", priority: 0.3, changeFrequency: "yearly" },
    { path: "/company", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  ];

  let tools: Awaited<ReturnType<typeof getActiveToolLandings>> = [];
  try {
    tools = await getActiveToolLandings();
  } catch {
    tools = [];
  }

  let knowledge: Awaited<ReturnType<typeof listPublishedSeoKnowledgeSlugs>> =
    [];
  try {
    knowledge = await listPublishedSeoKnowledgeSlugs("de");
  } catch {
    knowledge = [];
  }

  return [
    ...staticPages.map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...tools.map((tool) => ({
      url: absoluteUrl(`/${tool.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...knowledge.map((page) => ({
      url: absoluteUrl(`/wissen/${page.slug}`),
      lastModified: new Date(page.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
