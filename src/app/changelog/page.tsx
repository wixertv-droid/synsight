import type { Metadata } from "next";
import LegalDocument, { LegalPanel } from "@/components/layout/LegalDocument";
import ChangelogTimeline from "@/components/changelog/ChangelogTimeline";
import { getChangelogCatalog } from "@/lib/content/changelog";

export const metadata: Metadata = {
  title: "Release Notes — SynSight",
  description:
    "SynSight Release Notes — die Entwicklung unserer KI-Sicherheitsplattform transparent dokumentiert.",
};

export default function ChangelogPage() {
  const catalog = getChangelogCatalog();

  return (
    <LegalDocument
      label="Product / Changelog"
      title="SynSight Release Notes"
      subtitle="Die Entwicklung unserer KI-Sicherheitsplattform transparent dokumentiert."
      updatedAt="17. Juli 2026"
      nav={[
        { id: "releases", label: "Versionen" },
        { id: "roadmap", label: "Ausblick" },
      ]}
    >
      <LegalPanel
        id="releases"
        title="Veröffentlichte und geplante Versionen"
        info="Changelog-Einträge kommen aktuell aus einer zentralen Konfiguration. Später können Admins Releases direkt pflegen."
      >
        <ChangelogTimeline releases={catalog.releases} />
      </LegalPanel>

      <LegalPanel
        id="roadmap"
        title="Transparente Weiterentwicklung"
        info="Geplante Versionen zeigen die Richtung — ohne verbindliche Termingarantie."
      >
        <p>
          SynSight wird iterativ ausgebaut. Veröffentliche Releases
          dokumentieren fertige Fähigkeiten; geplante Versionen beschreiben die
          nächste Stufe — von tieferen Analysen bis zur KI Analyse Engine.
        </p>
        <p>
          Feedback und Supportanfragen:{" "}
          <a
            href="mailto:support@synsight.de"
            className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
          >
            support@synsight.de
          </a>
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
