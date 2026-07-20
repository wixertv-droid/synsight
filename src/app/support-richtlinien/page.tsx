import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Support-Richtlinien — SynSight",
  description:
    "Support-Richtlinien von SynSight: Erreichbarkeit, Ticketprozess und Reaktionszeiten.",
};

const UPDATED = "20. Juli 2026";

export default function SupportRichtlinienPage() {
  return (
    <LegalDocument
      label="Recht / Support"
      title="Support-Richtlinien"
      subtitle="Wie SynSight Support anbietet — Erreichbarkeit, Tickets und Reaktionszeiten."
      updatedAt={UPDATED}
      nav={[
        { id: "zweck", label: "Zweck" },
        { id: "erreichbarkeit", label: "Erreichbarkeit" },
        { id: "tickets", label: "Tickets" },
        { id: "daten", label: "Daten" },
        { id: "rollen", label: "Rollen" },
      ]}
    >
      <LegalPanel
        id="zweck"
        title="Zweck des Supports"
        info="SynSight Support hilft bei technischen Problemen, Konto-Fragen und der Nutzung der Plattform."
      >
        <p>
          Der SynSight Support unterstützt registrierte Nutzerinnen und Nutzer
          sowie Besucher der Startseite bei Fragen zur Plattform, zu SynCredits,
          Analysen und Kontofunktionen.
        </p>
      </LegalPanel>

      <LegalPanel
        id="erreichbarkeit"
        title="Erreichbarkeit und Statusanzeige"
        info="Die Live-Anzeige im Dashboard zeigt grün, orange oder rot — abhängig von Online-Status und konfigurierten Support-Zeiten."
      >
        <LegalList
          items={[
            "Grün: Ein Support-Mitarbeiter oder Administrator ist online und die Erreichbarkeitszeit ist aktiv.",
            "Orange: Innerhalb der konfigurierten Support-Zeiten (z. B. 9–18 Uhr, Werktage).",
            "Rot: Außerhalb der Support-Zeiten — auch wenn ein Mitarbeiter online ist.",
          ]}
        />
        <p>
          Die genauen Zeiten werden im Admin-Bereich unter Support →
          Support-Zeiten konfiguriert.
        </p>
      </LegalPanel>

      <LegalPanel
        id="tickets"
        title="Support-Tickets"
        info="Tickets können über die Startseite oder das Dashboard erstellt werden."
      >
        <p>
          Jedes Ticket erhält eine eindeutige Ticketnummer. Wir bearbeiten
          Anfragen nach Priorität und innerhalb der angegebenen Reaktionszeiten.
        </p>
      </LegalPanel>

      <LegalPanel
        id="daten"
        title="Datenverarbeitung im Support"
        info="Support-Anfragen werden zur Bearbeitung gespeichert."
      >
        <p>
          Name, E-Mail und Inhalt Ihrer Anfrage werden zur Bearbeitung
          gespeichert. Details finden Sie in unserer Datenschutzerklärung.
        </p>
      </LegalPanel>

      <LegalPanel
        id="rollen"
        title="Support-Rolle"
        info="Support-Mitarbeiter haben eingeschränkten Zugriff auf den Admin-Bereich."
      >
        <p>
          Benutzer mit der Rolle <strong>support</strong> sehen im Admin-Bereich
          ausschließlich den Support-Tab und können Tickets, Nachrichten und
          Benutzersuche bearbeiten — ohne Zugriff auf Marketing, Preise oder
          Systemeinstellungen.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
