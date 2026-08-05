import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import FaqAccordion from "@/components/seo/FaqAccordion";
import JsonLd from "@/components/seo/JsonLd";
import { getRelatedTools, type ToolLanding } from "@/lib/seo/tool-landings";
import { getActiveAnalysisKeys, isToolVisible } from "@/lib/seo/active-modules";
import {
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
  softwareApplicationSchema,
} from "@/lib/seo/schema";
import { AI_CITABLE_FACTS } from "@/lib/seo/keywords";

export default async function ToolLandingView({ tool }: { tool: ToolLanding }) {
  let related = getRelatedTools(tool.slug);
  try {
    const active = await getActiveAnalysisKeys();
    related = related.filter((item) => isToolVisible(item.slug, active));
  } catch {
    related = [];
  }
  const path = `/${tool.slug}`;

  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Analysen", path: "/analysen" },
            { name: tool.title, path },
          ]),
          faqSchema(tool.faqs),
          serviceSchema({
            name: `${tool.title} — SynSight`,
            description: tool.metaDescription,
            path,
            serviceType: tool.shortName,
          }),
          softwareApplicationSchema(),
        ]}
      />

      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Analysen", href: "/analysen" },
          { name: tool.title, href: path },
        ]}
      />

      <header className="mb-12 border-b border-white/[0.07] pb-10">
        <span className="hud-label">Analyse-Modul · OSINT</span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
          {tool.headline}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/55">
          {tool.intro}
        </p>
        <p className="mt-6 max-w-3xl rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-relaxed text-cyber-cyan/80">
          <strong className="font-medium text-white/80">Kurzantwort: </strong>
          {tool.aiAnswer}
        </p>
        <div className="mt-8">
          <Link
            href={tool.ctaHref}
            className="inline-flex rounded-lg border border-cyber-blue/35 bg-cyber-blue/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyber-blue/20"
          >
            {tool.ctaLabel}
          </Link>
        </div>
      </header>

      <section className="mb-12" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-semibold text-white">
          So funktioniert die Analyse
        </h2>
        <ol className="mt-5 space-y-3">
          {tool.howItWorks.map((step, i) => (
            <li
              key={step}
              className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-sm text-white/60"
            >
              <span className="font-mono text-cyber-cyan/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="mb-12 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="who-heading">
          <h2 id="who-heading" className="text-xl font-semibold text-white">
            Für wen geeignet
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/55">
            {tool.whoFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="methods-heading">
          <h2 id="methods-heading" className="text-xl font-semibold text-white">
            Methoden & Quellen
          </h2>
          <p className="mt-3 text-sm text-white/45">Methoden</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/55">
            {tool.methods.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-white/45">Datenquellen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/55">
            {tool.dataSources.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mb-12" aria-labelledby="eeat-heading">
        <h2 id="eeat-heading" className="text-xl font-semibold text-white">
          Transparenz & Vertrauen
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/55">
          {AI_CITABLE_FACTS.slice(0, 4).map((fact) => (
            <li
              key={fact}
              className="rounded-lg border border-white/[0.05] px-4 py-3"
            >
              {fact}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-white/45">
          Mehr zu Datenschutz und Anbieter:{" "}
          <Link href="/datenschutz" className="text-cyber-blue hover:underline">
            Datenschutzerklärung
          </Link>
          {" · "}
          <Link href="/impressum" className="text-cyber-blue hover:underline">
            Impressum
          </Link>
          {" · "}
          <Link href="/hilfe" className="text-cyber-blue hover:underline">
            Hilfe
          </Link>
        </p>
      </section>

      <section className="mb-12" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-5 text-2xl font-semibold text-white">
          Häufige Fragen
        </h2>
        <FaqAccordion faqs={tool.faqs} />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="mb-5 text-xl font-semibold text-white"
          >
            Verwandte Analysen
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.slug}`}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-cyber-blue/30"
              >
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-cyber-cyan/60">
                  {r.shortName}
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {r.title}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/45">
                  {r.metaDescription}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
