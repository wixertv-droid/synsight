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
    question: "Gibt es ein Abo oder Monatsmodell?",
    answer:
      "Nein. SynSight arbeitet ausschließlich mit SynCredits-Paketen und Einzelpreisen pro Analyse — konfiguriert unter Admin → Marketing → Preise. Keine monatlichen Abos.",
  },
  {
    question: "Wo kommen die Preise her?",
    answer:
      "Alle sichtbaren Paket- und Analysepreise stammen aus dem Admin (Marketing → Preise / Analysemodule). Die Startseite und Unterseiten lesen denselben Katalog über /api/pricing — nichts wird fest im Frontend verdrahtet.",
  },
  {
    question: "Warum sehe ich nicht alle Analyse-Module?",
    answer:
      "Öffentlich sichtbar sind nur Module, die im Admin aktiv geschaltet sind (isActive). Deaktivierte Module erscheinen weder auf der Startseite, noch unter /analysen, Tool-Landings, Sitemap oder im Demo-Scanner.",
  },
  {
    question: "Wie funktionieren SynCredits?",
    answer:
      "Sie laden Credits über Pakete auf. Jede Analyse kostet die im Admin hinterlegte Credit-Anzahl. Volle Kostenkontrolle, jederzeit nachladbar — ohne Vertragsbindung.",
  },
  {
    question: "Was ist der Unterschied zwischen Demo-Scan und voller Analyse?",
    answer:
      "Der Risiko-Check auf der Startseite liefert eine öffentliche Voranalyse zur Orientierung. Vollständige Berichte, Deep-Module und gespeicherte Ergebnisse laufen nach Anmeldung über SynCredits.",
  },
  {
    question: "Warum sind Dashboard und Profil nicht in der Suche?",
    answer:
      "App-interne Bereiche (Login, Dashboard, Profil, Ergebnisse) sind bewusst noindex, um Privatsphäre und Sicherheit zu schützen.",
  },
  {
    question: "Wie starte ich eine Analyse?",
    answer:
      "Über den Demo-Scanner auf der Startseite (#demo-scanner), die aktiven Analyse-Seiten unter /analysen oder nach Login im Dashboard.",
  },
  {
    question: "Was kostet der Demo-Scan?",
    answer:
      "Die öffentliche Voranalyse auf der Startseite dient der Orientierung. Vollständige Berichte und Deep-Module laufen über SynCredits nach Anmeldung.",
  },
  {
    question: "Kann ich einzelne Module kaufen statt eines Pakets?",
    answer:
      "Sie laden SynCredits-Pakete und starten danach einzelne Analysen. Jede Analyse zieht nur die dafür hinterlegten Credits — kein Abo, keine Sammelverpflichtung.",
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
  keywords: [
    "SynSight Hilfe",
    "SynSight FAQ",
    "OSINT Hilfe",
    "Cybersecurity FAQ",
  ],
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
