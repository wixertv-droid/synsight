import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import FaqAccordion from "@/components/seo/FaqAccordion";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
} from "@/lib/seo/schema";
import { getPublishedSeoKnowledgePage } from "@/lib/services/seo-knowledge-service";
import { getSeoKnowledgeRepository } from "@/lib/repositories";
import { getAdminAccess } from "@/lib/admin/access";
import type { SeoKnowledgePageDetail } from "@/lib/repositories/seo-knowledge-repository";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

function resolveLinkHref(link: { linkType: string; target: string }): string {
  const target = link.target.trim();
  if (target.startsWith("/") || target.startsWith("http")) return target;
  if (link.linkType === "wissen") return `/wissen/${target}`;
  if (link.linkType === "analyse" || link.linkType === "landing") {
    return target.startsWith("/") ? target : `/${target}`;
  }
  return target.startsWith("/") ? target : `/${target}`;
}

function sectionClass(type: string) {
  switch (type) {
    case "infobox":
      return "rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/[0.05] p-5";
    case "hint":
      return "rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-5";
    case "code":
      return "rounded-xl border border-white/10 bg-black/40 p-5 font-mono text-sm text-cyber-cyan/80 whitespace-pre-wrap";
    case "table":
    case "list":
      return "rounded-xl border border-white/[0.07] bg-white/[0.02] p-5";
    default:
      return "space-y-3";
  }
}

async function loadPage(
  slug: string,
  preview: boolean
): Promise<SeoKnowledgePageDetail | null> {
  if (preview) {
    const access = await getAdminAccess();
    if (!access.granted) return null;
    return getSeoKnowledgeRepository().getPageBySlug(slug, "de", {
      includeDeleted: false,
    });
  }
  return getPublishedSeoKnowledgePage(slug, "de");
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const page = await loadPage(slug, preview === "1");
  if (!page) return {};
  return buildPageMetadata({
    title: page.seoTitle || page.title,
    description: page.metaDescription || page.intro || page.title,
    path: `/wissen/${page.slug}`,
    keywords: page.metaKeywords
      ? page.metaKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [page.category, page.title],
    noIndex: !page.robotsIndex || page.status !== "published",
  });
}

export default async function WissenPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";
  const page = await loadPage(slug, isPreview);
  if (!page) notFound();
  if (!isPreview && page.status !== "published") notFound();

  const faqs = page.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
  }));
  const path = `/wissen/${page.slug}`;

  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Wissen", path: "/wissen" },
            { name: page.title, path },
          ]),
          organizationSchema(),
          ...(faqs.length ? [faqSchema(faqs)] : []),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Wissen", href: "/wissen" },
          { name: page.title, href: path },
        ]}
      />

      {isPreview ? (
        <p className="mb-6 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-4 py-2 text-sm text-amber-100/80">
          Vorschau — Status: {page.status}. Nur für Admins sichtbar.
        </p>
      ) : null}

      <header className="mb-12 border-b border-white/[0.07] pb-10">
        <span className="hud-label">{page.category}</span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
          {page.heroTitle || page.title}
        </h1>
        {page.heroSubtitle ? (
          <p className="mt-4 max-w-3xl text-lg text-white/55">
            {page.heroSubtitle}
          </p>
        ) : null}
        {page.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.heroImageUrl}
            alt=""
            className="mt-8 max-h-80 w-full rounded-xl object-cover"
          />
        ) : null}
        {page.intro ? (
          <div className="prose-wissen mt-8 max-w-3xl text-base leading-relaxed text-white/60 whitespace-pre-wrap">
            {page.intro}
          </div>
        ) : null}
        <div className="mt-8">
          <Link
            href={page.ctaHref}
            className="inline-flex rounded-lg border border-cyber-blue/35 bg-cyber-blue/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyber-blue/20"
          >
            {page.ctaLabel}
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        {page.sections.map((section) => (
          <section
            key={section.id}
            className={sectionClass(section.sectionType)}
            aria-labelledby={
              section.heading ? `section-${section.id}` : undefined
            }
          >
            {section.heading ? (
              <h2
                id={`section-${section.id}`}
                className="text-2xl font-semibold text-white"
              >
                {section.heading}
              </h2>
            ) : null}
            {section.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={section.imageUrl}
                alt=""
                className="mt-4 max-h-72 w-full rounded-lg object-cover"
              />
            ) : null}
            {section.body ? (
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {section.body}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {faqs.length > 0 ? (
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="mb-5 text-2xl font-semibold text-white"
          >
            Häufige Fragen
          </h2>
          <FaqAccordion faqs={faqs} />
        </section>
      ) : null}

      {page.links.length > 0 ? (
        <section className="mt-14" aria-labelledby="links-heading">
          <h2
            id="links-heading"
            className="mb-5 text-2xl font-semibold text-white"
          >
            Weiterführende Seiten
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {page.links.map((link) => (
              <li key={link.id}>
                <Link
                  href={resolveLinkHref(link)}
                  className="block rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-cyber-cyan/80 transition hover:border-cyber-cyan/30"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PublicShell>
  );
}
