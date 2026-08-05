import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ToolLandingView from "@/components/seo/ToolLandingView";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getToolBySlug } from "@/lib/seo/tool-landings";
import { getActiveAnalysisKeys, isToolVisible } from "@/lib/seo/active-modules";

type Props = { params: Promise<{ tool: string }> };

/** Request-time: Admin isActive toggles apply without rebuild. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};
  try {
    const active = await getActiveAnalysisKeys();
    if (!isToolVisible(slug, active))
      return { robots: { index: false, follow: false } };
  } catch {
    // catalog unavailable — still allow metadata for build
  }
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

  try {
    const active = await getActiveAnalysisKeys();
    if (!isToolVisible(slug, active)) notFound();
  } catch {
    // If pricing catalog is down, hide tool pages rather than showing inactive modules
    notFound();
  }

  return <ToolLandingView tool={tool} />;
}
