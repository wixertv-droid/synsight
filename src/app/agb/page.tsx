import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "AGB — SynSight",
  description:
    "Allgemeine Geschäftsbedingungen von SynSight für SynCredits, Analysen und Plattformnutzung.",
};

const UPDATED = "17. Juli 2026";

export default function AgbPage() {
  return (
    <LegalDocument
      label="Recht / Vertrag"
      title="Allgemeine Geschäftsbedingungen"
      subtitle="Regeln für die Nutzung der SynSight-Plattform, SynCredits und kostenpflichtige Analysen."
      updatedAt={UPDATED}
      nav={[
        { id: "geltung", label: "Geltung" },
        { id: "leistung", label: "Leistung" },
        { id: "syncredits", label: "SynCredits" },
        { id: "rueckerstattung", label: "Erstattung" },
        { id: "missbrauch", label: "Missbrauch" },
        { id: "schluss", label: "Schluss" },
      ]}
    >
      <LegalPanel
        id="geltung"
        title="Geltungsbereich"
        info="AGB sind die Vertragsregeln zwischen Ihnen und SynSight, sobald Sie die Plattform geschäftlich bzw. mit Konto nutzen."
      >
        <p>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung
          der SynSight-Plattform durch registrierte Nutzerinnen und Nutzer sowie
          für den Erwerb und Verbrauch von SynCredits.
        </p>
        <p>
          Anbieter ist René Eule, SynSight, Katharinenstraße 4, 07546 Gera,
          Deutschland (siehe{" "}
          <a
            href="/impressum"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            Impressum
          </a>
          ).
        </p>
        <p>
          Die Nutzung setzt ein Mindestalter von 18 Jahren voraus. Mit der
          Registrierung bestätigen Sie, volljährig zu sein.
        </p>
      </LegalPanel>

      <LegalPanel
        id="leistung"
        title="Leistungsbeschreibung"
        info="SynSight liefert Analyse- und Transparenzfunktionen — keine Rechtsberatung und keine Garantie auf vollständige externe Quellen."
      >
        <p>SynSight bietet insbesondere:</p>
        <LegalList
          items={[
            "digitale Identitätsanalyse",
            "OSINT-Recherchen (Open-Source-Intelligence auf öffentlich zugänglichen Quellen)",
            "Sicherheits- und Risikoanalysen",
            "Monitoring digitaler Sichtbarkeit",
            "KI-gestützte Auswertungen und Aufbereitung von Ergebnissen",
          ]}
        />
        <p>
          Analyseergebnisse dienen der Information und Orientierung. Sie
          ersetzen keine Rechts-, Sicherheits- oder Unternehmensberatung.
          Externe Quellen können unvollständig, veraltet oder fehlerhaft sein.
        </p>
      </LegalPanel>

      <LegalPanel
        id="syncredits"
        title="SynCredits und Abrechnung"
        info="SynCredits sind die interne Nutzungseinheit von SynSight — vergleichbar mit Guthabenpunkten für einzelne Analysen."
      >
        <p>
          Die Abrechnung erfolgt über SynCredits. Es gibt derzeit keine
          Abonnements und keine automatische Vertragsverlängerung.
        </p>
        <LegalList
          items={[
            "Vor jeder kostenpflichtigen Analyse werden die benötigten SynCredits transparent angezeigt.",
            "Im Dashboard sind jederzeit Guthaben, Preisübersicht und Verbrauch einsehbar.",
            "SynCredits sind digitale Nutzungseinheiten, nicht übertragbar und nicht gegen Bargeld auszahlbar.",
            "Ein Verbrauch erfolgt ausschließlich nach Ihrer Bestätigung im jeweiligen Analysevorgang.",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="rueckerstattung"
        title="Rückerstattung"
        info="Nicht verbrauchtes Guthaben kann unter bestimmten Voraussetzungen erstattet werden; bereits genutzte Analysen nicht."
      >
        <p>
          Nicht verbrauchte SynCredits können im gesetzlichen Rahmen erstattet
          werden. Bereits verbrauchte SynCredits — also SynCredits, die für eine
          bestätigte Analyse eingesetzt wurden — sind nicht erstattungsfähig.
        </p>
        <p>
          Gesetzliche Widerrufsrechte für Verbraucherinnen und Verbraucher
          bleiben unberührt, soweit sie anwendbar sind.
        </p>
      </LegalPanel>

      <LegalPanel
        id="pflichten"
        title="Pflichten der Nutzerinnen und Nutzer"
        info="Sie sind dafür verantwortlich, dass die von Ihnen eingegebenen Daten und ausgelösten Suchen rechtmäßig sind."
      >
        <p>Sie verpflichten sich insbesondere:</p>
        <LegalList
          items={[
            "Zugangsdaten geheim zu halten und nur eigene, berechtigte Profile zu analysieren",
            "keine rechtswidrigen Inhalte hochzuladen oder zu verarbeiten",
            "keine Personen ohne erkennbare Berechtigung systematisch zu recherchieren",
            "Sicherheitsmechanismen der Plattform nicht zu umgehen",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="missbrauch"
        title="Missbrauch und Sperrung"
        info="Bei klaren Verstößen darf SynSight Konten sperren, um die Plattform und Dritte zu schützen."
      >
        <p>Untersagt sind insbesondere:</p>
        <LegalList
          items={[
            "Spam und missbräuchliche Massenaktionen",
            "automatisierte Massensuchen ohne Freigabe",
            "rechtswidrige Nutzung der Plattform",
            "Suche nach fremden Personen ohne erkennbare Berechtigung",
            "Umgehung von Rate-Limits, Authentifizierung oder Sicherheitskontrollen",
          ]}
        />
        <p>
          Bei Verstößen behält sich SynSight vor, Konten vorübergehend oder
          dauerhaft zu sperren und erforderliche Maßnahmen zum Schutz der
          Plattform zu ergreifen.
        </p>
      </LegalPanel>

      <LegalPanel
        id="schluss"
        title="Haftung, Recht, Gerichtsstand"
        info="Gerichtsstand Deutschland bedeutet: Streitigkeiten werden nach deutschem Recht und vor deutschen Gerichten behandelt, soweit gesetzlich zulässig."
      >
        <p>
          SynSight haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit
          sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leichter
          Fahrlässigkeit haftet SynSight nur bei Verletzung wesentlicher
          Vertragspflichten und begrenzt auf den vorhersehbaren,
          vertragstypischen Schaden — soweit gesetzlich zulässig.
        </p>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist —
          soweit gesetzlich zulässig — Deutschland am Sitz des Anbieters.
        </p>
        <p>
          Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit
          der übrigen Bestimmungen unberührt.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
