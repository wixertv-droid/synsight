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

const UPDATED = "25. Juli 2026";

export default function SupportRichtlinienPage() {
  return (
    <LegalDocument
      label="Recht / Support"
      title="Support-Richtlinien"
      subtitle="Wie SynSight Support anbietet — Erreichbarkeit, Tickets und Reaktionszeiten."
      updatedAt={UPDATED}
      nav={[
        { id: "zweck", label: "Zweck" },
        { id: "anwesend", label: "Anwesend" },
        { id: "erreichbarkeit", label: "Erreichbarkeit" },
        { id: "zeiten", label: "Außerhalb" },
        { id: "tickets", label: "Tickets" },
      ]}
    >
      <LegalPanel
        id="zweck"
        title="Zweck des Supports"
        info="SynSight Support hilft bei technischen Problemen, Konto-Fragen und der Nutzung der Plattform."
      >
        <p>
          Der SynSight Support unterstützt registrierte Nutzerinnen und Nutzer
          sowie Besucher der Support-Seite bei Fragen zur Plattform, zu
          SynCredits, Analysen und Kontofunktionen.
        </p>
      </LegalPanel>

      <LegalPanel
        id="anwesend"
        title="Support anwesend (grün)"
        info="Die Ampel zeigt grün, wenn ein Mitarbeiter mit Support- oder Admin-Rechten online ist."
      >
        <LegalList
          items={[
            "Grün „Support anwesend“: Mindestens ein Benutzer mit der Rolle Support oder Admin ist angemeldet und aktiv.",
            "Die Anzeige gilt unabhängig von den konfigurierten Support-Zeiten.",
            "Tickets können jederzeit über das Support-Formular gesendet werden.",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="erreichbarkeit"
        title="Support-Zeiten aktiv (grün)"
        info="Innerhalb der konfigurierten Werktagszeiten bleibt die Ampel grün — auch ohne online anwesenden Mitarbeiter."
      >
        <LegalList
          items={[
            "Standard: Montag–Freitag, z. B. 09:00–18:00 Uhr (Europe/Berlin).",
            "Zeiten und Antworttext werden unter Admin → Support → Nachrichten gepflegt.",
            "Antworten folgen in der Regel innerhalb der angegebenen Reaktionszeit.",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="zeiten"
        title="Außerhalb der Support-Zeiten (rot)"
        info="Wenn kein Support online ist und die konfigurierten Zeiten nicht aktiv sind, zeigt die Ampel rot."
      >
        <p>
          Tickets können weiterhin eingereicht werden. Die Bearbeitung erfolgt
          zu den nächsten Support-Zeiten. Bitte beschreiben Sie Ihr Anliegen
          möglichst vollständig (mindestens einige Sätze), damit wir schneller
          helfen können.
        </p>
      </LegalPanel>

      <LegalPanel
        id="tickets"
        title="Support-Tickets"
        info="Öffentliche Anfragen landen im Admin-Kanal „Support“ unter Nachrichten."
      >
        <LegalList
          items={[
            "Formular unter /support — Nachricht mindestens 10 Zeichen.",
            "Admin-Inbox: Support → Nachrichten → Kanal „Support“.",
            "Benachrichtigung geht an die konfigurierte Support-E-Mail.",
          ]}
        />
      </LegalPanel>
    </LegalDocument>
  );
}
