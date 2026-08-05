import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/seo/PublicShell";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import FaqAccordion from "@/components/seo/FaqAccordion";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";
import { AI_CITABLE_FACTS } from "@/lib/seo/keywords";

const HELP_FAQS = [
  {
    question: "Was ist SynSight?",
    answer:
      "SynSight ist eine Cybersecurity- und OSINT-Plattform, die öffentliche digitale Spuren analysiert und Risiken verständlich erklärt.",
  },
  {
    question: "Welche Daten werden ausgewertet?",
    answer:
      "Öffentlich zugängliche Quellen und erlaubte APIs. Keine privaten Postfächer, kein Account-Hacking.",
  },
  {
    question: "Warum sind Dashboard und Profil nicht in der Suche?",
    answer:
      "App-interne Bereiche (Login, Dashboard, Profil, Ergebnisse) sind bewusst noindex, um Privatsphäre und Sicherheit zu schützen.",
  },
  {
    question: "Wie starte ich eine Analyse?",
    answer:
      "Über den Demo-Scanner auf der Startseite oder die jeweiligen Analyse-Landingpages unter /analysen.",
  },
  {
    question: "Wen kontaktiere ich bei Datenschutzfragen?",
    answer: `Schreiben Sie an ${SITE.email.privacy}. Allgemeine Anfragen: ${SITE.email.contact}.`,
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "Hilfe & FAQ",
  description:
    "Hilfe zu SynSight: Was die Plattform kann, welche Datenquellen genutzt werden, wie Analysen starten und wie Datenschutz greift.",
  path: "/hilfe",
  keywords: ["SynSight Hilfe", "SynSight FAQ", "OSINT Hilfe", "Cybersecurity FAQ"],
});

export default function HilfePage() {
  return (
    <PublicShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Hilfe", path: "/hilfe" },
          ]),
          faqSchema(HELP_FAQS),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Start", href: "/" },
          { name: "Hilfe", href: "/hilfe" },
        ]}
      />
      <header className="mb-10 border-b border-white/[0.07] pb-10">
        <span className="hud-label">Support</span>
        <h1 className="mt-5 text-4xl font-semibold text-white md:text-5xl">
          Hilfe & Orientierung
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-white/55">
          Kurze, zitierfähige Antworten für Nutzer und KI-Suchmaschinen.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Faktenbox</h2>
        <ul className="space-y-2">
          {AI_CITABLE_FACTS.map((fact) => (
            <li
              key={fact}
              className="rounded-lg border border-white/[0.06] px-4 py-3 text-sm text-white/55"
            >
              {fact}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-5 text-xl font-semibold text-white">FAQ</h2>
        <FaqAccordion faqs={HELP_FAQS} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Weiterführend</h2>
        <ul className="space-y-2 text-sm text-cyber-blue">
          <li>
            <Link href="/analysen">Alle Analysen</Link>
          </li>
          <li>
            <Link href="/datenschutz">Datenschutz</Link>
          </li>
          <li>
            <Link href="/impressum">Impressum</Link>
          </li>
          <li>
            <Link href="/blog">Blog (Vorschau)</Link>
          </li>
          <li>
            <a href={`mailto:${SITE.email.contact}`}>{SITE.email.contact}</a>
          </li>
        </ul>
      </section>
    </PublicShell>
  );
}
