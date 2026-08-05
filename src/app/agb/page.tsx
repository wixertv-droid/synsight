import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import JsonLd from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Nutzungsbedingungen",
  description:
    "Vorläufige Nutzungsbedingungen von SynSight für die Produktpräsentation und Demo-Funktionen.",
  path: "/agb",
  keywords: ["SynSight AGB", "Nutzungsbedingungen"],
});

export default function TermsPage() {
  return (
    <LegalPage title="Nutzungsbedingungen" label="Vorläufige Fassung">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Start", path: "/" },
          { name: "AGB", path: "/agb" },
        ])}
      />
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Demo-Status</h2>
        <p>
          Die aktuelle Website demonstriert das geplante Nutzungserlebnis von
          SynSight. Scanner-Ergebnisse und Risikowerte sind beispielhaft und
          stellen keine reale Sicherheitsanalyse oder verbindliche Beratung
          dar.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Produktanfragen
        </h2>
        <p>
          Anfragen zum Produkt richten Sie an{" "}
          <a className="text-cyber-blue" href={`mailto:${SITE.email.contact}`}>
            {SITE.email.contact}
          </a>
          .
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Verbindliche AGB folgen vor dem öffentlichen Produktstart.
      </p>
    </LegalPage>
  );
}
