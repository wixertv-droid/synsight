import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { BLOG_POSTS } from "@/lib/seo/blog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return buildPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
          articleSchema({
            title: post.title,
            description: post.description,
            path: `/blog/${post.slug}`,
            datePublished: post.date,
          }),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Blog", href: "/blog" },
          { name: post.title, href: `/blog/${post.slug}` },
        ]}
      />
      <article>
        <header className="mb-8 border-b border-white/[0.07] pb-8">
          <time className="font-mono text-[10px] text-white/35">
            {post.date}
          </time>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-white/55">{post.description}</p>
        </header>
        <div className="space-y-4 text-sm leading-relaxed text-white/60">
          <p>
            Dieser Beitrag ist Teil der SynSight Blog-Struktur (Vorbereitung).
            Er dient der thematischen Abdeckung für Suchmaschinen und
            KI-Antwortsysteme und wird redaktionell ausgebaut.
          </p>
          <p>
            SynSight erklärt öffentliche Identitäts- und Leak-Signale
            nachvollziehbar. Weiterführende Werkzeuge finden Sie unter{" "}
            <Link href="/analysen" className="text-cyber-blue">
              Analysen
            </Link>{" "}
            und im{" "}
            <Link href="/#demo-scanner" className="text-cyber-blue">
              Demo-Scan
            </Link>
            .
          </p>
          <p>
            Rechtliches:{" "}
            <Link href="/datenschutz" className="text-cyber-blue">
              Datenschutz
            </Link>
            ,{" "}
            <Link href="/impressum" className="text-cyber-blue">
              Impressum
            </Link>
            .
          </p>
        </div>
      </article>
    </PublicShell>
  );
}
