import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, organizationSchema } from "@/lib/seo/schema";
import { listPublishedSeoKnowledgePages } from "@/lib/services/seo-knowledge-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Wissensdatenbank",
  description:
    "SynSight Wissensartikel und SEO-Guides zu digitaler Identität, OSINT und Datenschutz.",
  path: "/wissen",
  keywords: ["SynSight Wissen", "OSINT Guide", "digitale Identität"],
});

export default async function WissenIndexPage() {
  let items: Array<{
    id: number;
    slug: string;
    title: string;
    category: string;
    metaDescription: string | null;
    updatedAt: string;
  }> = [];
  try {
    const result = await listPublishedSeoKnowledgePages(200);
    items = result.items.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      metaDescription: row.metaDescription,
      updatedAt: row.updatedAt,
    }));
  } catch {
    items = [];
  }

  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Wissen", path: "/wissen" },
          ]),
          organizationSchema(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Wissen", href: "/wissen" },
        ]}
      />
      <header className="mb-12 border-b border-white/[0.07] pb-10">
        <span className="hud-label">Wissensdatenbank</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
          SynSight Wissen
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/55">
          Veröffentlichte Guides und SEO-Seiten — gepflegt im Admin unter SEO
          &amp; Wissensdatenbank.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
          Noch keine veröffentlichten Wissensseiten.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/wissen/${item.slug}`}
                className="block rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-cyber-cyan/30 hover:bg-cyber-cyan/[0.04]"
              >
                <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
                  {item.category.toUpperCase()}
                </p>
                <h2 className="mt-2 text-lg font-medium text-white/90">
                  {item.title}
                </h2>
                {item.metaDescription ? (
                  <p className="mt-2 line-clamp-2 text-sm text-white/45">
                    {item.metaDescription}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
