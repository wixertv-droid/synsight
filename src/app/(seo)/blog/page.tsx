import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { BLOG_POSTS } from "@/lib/seo/blog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog — Digitale Identität & OSINT",
  description:
    "SynSight Blog: Beiträge zu digitaler Identität, OSINT, Datenlecks und Online-Reputation. Struktur vorbereitet für laufende Inhalte.",
  path: "/blog",
  keywords: ["SynSight Blog", "OSINT Blog", "digitale Identität Artikel"],
});

export default function BlogIndexPage() {
  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          ...BLOG_POSTS.map((post) =>
            articleSchema({
              title: post.title,
              description: post.description,
              path: `/blog/${post.slug}`,
              datePublished: post.date,
            })
          ),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Blog", href: "/blog" },
        ]}
      />
      <header className="mb-10 border-b border-white/[0.07] pb-10">
        <span className="hud-label">Wissen</span>
        <h1 className="mt-5 text-4xl font-semibold text-white md:text-5xl">
          SynSight Blog
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-white/55">
          Redaktionelle Struktur für E-E-A-T und thematische Vertiefung.
          Beiträge werden fortlaufend ergänzt; Platzhalter sind bereits crawlbar
          verlinkt.
        </p>
      </header>
      <ul className="space-y-4">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-cyber-blue/30"
            >
              <time className="font-mono text-[10px] text-white/35">
                {post.date}
              </time>
              <h2 className="mt-2 text-lg font-medium text-white">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-white/50">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  );
}
