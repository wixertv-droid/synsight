import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, organizationSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Impressum",
  description:
    "Impressum und Anbieterkennzeichnung von SynSight — Kontakt, Transparenz und rechtliche Hinweise.",
  path: "/impressum",
  keywords: ["SynSight Impressum", "Anbieterkennzeichnung"],
});

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" label="Rechtliche Angaben">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Impressum", path: "/impressum" },
          ]),
          organizationSchema(),
        ]}
      />
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Anbieter</h2>
        <p>
          SynSight ist derzeit ein Produktprojekt in Vorbereitung. Die
          vollständigen Anbieter- und Registerangaben werden vor dem
          öffentlichen Produktstart ergänzt (NAP für Local SEO /
          Unternehmensprofil).
        </p>
        <p className="mt-3">
          Marke: <strong>{SITE.name}</strong>
          <br />
          Domain: synsight.de
          <br />
          Land: Deutschland ({SITE.nap.addressCountry})
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Kontakt</h2>
        <p>
          E-Mail:{" "}
          <a className="text-cyber-blue" href={`mailto:${SITE.email.contact}`}>
            {SITE.email.contact}
          </a>
        </p>
        <p className="mt-2">
          Datenschutz:{" "}
          <a className="text-cyber-blue" href={`mailto:${SITE.email.privacy}`}>
            {SITE.email.privacy}
          </a>
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Verwendete Technologien (Transparenz)
        </h2>
        <p>
          SynSight nutzt moderne Web-Technologien (u. a. Next.js), optionale
          OSINT-Module und KI-Zusammenfassungen. Es werden keine privaten
          Postfächer ausgelesen. Details zu Datenquellen finden sich in der{" "}
          <a className="text-cyber-blue" href="/datenschutz">
            Datenschutzerklärung
          </a>{" "}
          und auf den{" "}
          <a className="text-cyber-blue" href="/analysen">
            Analyse-Seiten
          </a>
          .
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Hinweis: Diese vorläufige Projektseite ersetzt kein vollständiges
        Impressum. Vor einer öffentlichen geschäftlichen Nutzung müssen die
        gesetzlich erforderlichen Angaben ergänzt werden.
      </p>
    </LegalPage>
  );
}
