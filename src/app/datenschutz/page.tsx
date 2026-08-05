import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Datenschutz",
  description:
    "Datenschutzinformation von SynSight: Umgang mit Demo-Eingaben, Kontakt und Transparenz zu öffentlichen OSINT-Analysen.",
  path: "/datenschutz",
  keywords: ["SynSight Datenschutz", "Privacy SynSight", "OSINT Datenschutz"],
});

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutz" label="Datenschutzinformation">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Start", path: "/" },
          { name: "Datenschutz", path: "/datenschutz" },
        ])}
      />
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Stand dieser Website
        </h2>
        <p>
          Die aktuelle SynSight-Website ist eine Produktpräsentation. Die
          dargestellte Analyse ist eine Simulation und fragt keine echten
          Identitäts- oder Leak-Daten ab.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Eingaben in der Demo
        </h2>
        <p>
          Eingaben in den Demo-Scanner werden ausschließlich lokal im Browser
          für die beispielhafte Darstellung verwendet und nicht an einen
          Analyse-Dienst übertragen.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Grundsätze (E-E-A-T / Transparenz)
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Öffentliche Quellen und erlaubte APIs statt Account-Hacking</li>
          <li>Klare Trennung zwischen Demo und produktiven Analysen</li>
          <li>App-Bereiche (Dashboard, Profil) sind nicht für Suchmaschinen indexiert</li>
          <li>HTTPS und Security-Header schützen die Übertragung</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Kontakt</h2>
        <p>
          Datenschutzanfragen richten Sie bitte an{" "}
          <a
            className="text-cyber-blue"
            href={`mailto:${SITE.email.privacy}`}
          >
            {SITE.email.privacy}
          </a>
          .
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Vor dem produktiven Betrieb wird eine vollständige Datenschutzerklärung
        nach DSGVO ergänzt.
      </p>
    </LegalPage>
  );
}
