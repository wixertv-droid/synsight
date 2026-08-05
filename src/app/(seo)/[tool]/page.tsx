import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ToolLandingView from "@/components/seo/ToolLandingView";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getToolBySlug, TOOL_SLUGS } from "@/lib/seo/tool-landings";

type Props = { params: Promise<{ tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_SLUGS.map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};
  return buildPageMetadata({
    title: tool.title,
    description: tool.metaDescription,
    path: `/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default async function ToolPage({ params }: Props) {
  const { tool: slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  return <ToolLandingView tool={tool} />;
}
