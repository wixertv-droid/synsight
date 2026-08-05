import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getActiveToolLandings } from "@/lib/seo/active-modules";
import {
  breadcrumbSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";
import { KEYWORD_PILLARS } from "@/lib/seo/keywords";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Analysen & OSINT-Module",
  description:
    "Aktive SynSight Analysen im Überblick — nur Module, die im Admin freigeschaltet sind. SynCredits-Preise wie konfiguriert.",
  path: "/analysen",
  keywords: [
    "SynSight Analysen",
    "OSINT Module",
    "Cybersecurity Tools",
    "digitale Identität Tools",
  ],
});

export default async function AnalysenHubPage() {
  let tools: Awaited<ReturnType<typeof getActiveToolLandings>> = [];
  try {
    tools = await getActiveToolLandings();
  } catch {
    tools = [];
  }

  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Analysen", path: "/analysen" },
          ]),
          organizationSchema(),
          websiteSchema(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Analysen", href: "/analysen" },
        ]}
      />
      <header className="mb-12 border-b border-white/[0.07] pb-10">
        <span className="hud-label">Werkzeugkasten</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
          SynSight Analysen
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/55">
          Sichtbar sind ausschließlich Module, die unter Admin → Marketing →
          Preise / Analysemodule aktiv geschaltet sind. Preise kommen aus den
          hinterlegten SynCredits-Paketen — ohne Abo-Modell.
        </p>
      </header>

      <section className="mb-14" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">
          Aktive Analyse-Module
        </h2>
        {tools.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
            Derzeit sind keine Analyse-Module öffentlich freigeschaltet. Bitte
            im Admin die gewünschten Module aktivieren.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/${tool.slug}`}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition hover:border-cyber-blue/35"
              >
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-cyber-cyan/60">
                  {tool.shortName}
                </div>
                <h3 className="mt-2 text-lg font-medium text-white">
                  {tool.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {tool.metaDescription}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="pillars-heading">
        <h2
          id="pillars-heading"
          className="mb-5 text-xl font-semibold text-white"
        >
          Keyword-Säulen
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {KEYWORD_PILLARS.map((pillar) => (
            <div
              key={pillar.pillar}
              className="rounded-xl border border-white/[0.06] p-5"
            >
              <h3 className="text-sm font-medium text-white">
                {pillar.pillar}
              </h3>
              <p className="mt-2 text-xs text-white/40">Primary</p>
              <p className="text-sm text-white/55">
                {pillar.primary.join(" · ")}
              </p>
              <p className="mt-2 text-xs text-white/40">Secondary</p>
              <p className="text-sm text-white/55">
                {pillar.secondary.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
