import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalMeta,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Datenschutz — SynSight",
  description:
    "Datenschutzerklärung von SynSight: Welche Daten wir verarbeiten, wo sie gespeichert werden und welche Rechte Sie haben.",
};

const UPDATED = "17. Juli 2026";

export default function DatenschutzPage() {
  return (
    <LegalDocument
      label="Recht / Datenschutz"
      title="Datenschutzerklärung"
      subtitle="Transparente Information darüber, welche personenbezogenen Daten SynSight verarbeitet — und warum."
      updatedAt={UPDATED}
      nav={[
        { id: "verantwortlicher", label: "Verantwortlicher" },
        { id: "daten", label: "Datenarten" },
        { id: "zwecke", label: "Zwecke" },
        { id: "technik", label: "Technik" },
        { id: "ki", label: "KI" },
        { id: "rechte", label: "Ihre Rechte" },
      ]}
    >
      <LegalPanel
        id="verantwortlicher"
        title="Verantwortlicher"
        info="Der Verantwortliche entscheidet, zu welchem Zweck und mit welchen Mitteln personenbezogene Daten verarbeitet werden."
      >
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
        </p>
        <p>
          René Eule · SynSight
          <br />
          Katharinenstraße 4 · 07546 Gera · Deutschland
          <br />
          E-Mail:{" "}
          <a
            href="mailto:datenschutz@synsight.de"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            datenschutz@synsight.de
          </a>{" "}
          bzw.{" "}
          <a
            href="mailto:contact@synsight.de"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            contact@synsight.de
          </a>
        </p>
      </LegalPanel>

      <LegalPanel
        id="daten"
        title="Welche Daten wir verarbeiten"
        info="Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare Person beziehen."
      >
        <p>
          Je nach Nutzung der Plattform können insbesondere folgende Daten
          verarbeitet werden:
        </p>
        <LegalList
          items={[
            "Vorname und Nachname",
            "Alias / Anzeigename",
            "E-Mail-Adresse",
            "Telefonnummer (optional)",
            "Angaben zu Social-Media-Konten, Webseiten und Domains",
            "Hochgeladene Bilder für Identitäts- und Bildanalysen",
            "Logindaten (Passwort nur als sicherer Hash, nie im Klartext)",
            "Sitzungsinformationen (Session-Cookies)",
            "Audit- und Sicherheitsprotokolle (z. B. Anmeldeversuche, Admin-Aktionen)",
            "Kontakt-, Presse- und Partnerschaftsanfragen über Formulare",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="zwecke"
        title="Zwecke und Rechtsgrundlagen"
        info="Jede Verarbeitung braucht einen klaren Zweck und eine gesetzliche Grundlage — zum Beispiel Vertragserfüllung oder Einwilligung."
      >
        <p>Wir verarbeiten Daten, um:</p>
        <LegalList
          items={[
            "Ihr Benutzerkonto anzulegen, zu verifizieren und zu sichern",
            "digitale Identitäts- und Risikoanalysen durchzuführen, die Sie anstoßen",
            "SynCredits-Guthaben, Verbräuche und Preisangaben nachvollziehbar zu führen",
            "Anfragen über Kontakt-, Presse- und Partnerschaftsformulare zu beantworten",
            "Missbrauch zu erkennen und die Plattform technisch zu betreiben",
            "gesetzliche Aufbewahrungs- und Nachweispflichten zu erfüllen",
          ]}
        />
        <p>
          Typische Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung), lit. f (berechtigtes Interesse an Sicherheit und
          Missbrauchsabwehr) sowie lit. a (Einwilligung — insbesondere vor dem
          Einsatz externer KI-Analysen).
        </p>
      </LegalPanel>

      <LegalPanel
        id="technik"
        title="Hosting, Speicherung und Sicherheit"
        info="Technische Maßnahmen sollen verhindern, dass Unbefugte auf Ihre Daten zugreifen können."
      >
        <LegalMeta
          rows={[
            { label: "Hosting", value: "netcup" },
            { label: "Serverstandort", value: "Nürnberg, Deutschland" },
            { label: "Datenbank", value: "MariaDB" },
            {
              label: "Passwörter",
              value: "Argon2id (Einweg-Hash, kein Klartext)",
            },
            {
              label: "Transport",
              value: "HTTPS / TLS für sämtliche Kommunikation",
            },
            {
              label: "Bilder",
              value:
                "Komprimiert und verschlüsselt abgelegt; Nutzung nur für von Ihnen gewünschte Such-/Analysefunktionen",
            },
          ]}
        />
        <p>
          SynSight setzt derzeit kein Google Analytics, keinen Facebook Pixel
          und keinen Newsletter-Tracking-Dienst ein. Es werden keine Marketing-
          oder Analyse-Cookies gesetzt.
        </p>
      </LegalPanel>

      <LegalPanel
        id="cookies"
        title="Cookies"
        info="Cookies sind kleine Textdateien, die Ihr Browser speichert. Bei SynSight dienen sie vor allem der Anmeldung."
      >
        <p>
          Derzeit werden ausschließlich technisch notwendige Session-Cookies
          verwendet, damit Sie angemeldet bleiben und geschützte Bereiche der
          Plattform nutzen können. Details finden Sie in der{" "}
          <a
            href="/cookies"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            Cookie-Richtlinie
          </a>
          .
        </p>
      </LegalPanel>

      <LegalPanel
        id="ki"
        title="KI-gestützte Analyse"
        info="KI meint maschinelle Auswertung — bei SynSight zur Strukturierung und Einschätzung digitaler Signale, nicht zur heimlichen Profilbildung für Werbung."
      >
        <p>
          SynSight verwendet und plant KI-Komponenten (u. a. Anbindung an
          Anbieter wie Gemini API und ChatGPT API), ausschließlich zur Analyse
          und Aufbereitung von Ergebnissen, die Sie in der Plattform anstoßen.
        </p>
        <p>
          Vor der ersten KI-Analyse, die personenbezogene Daten an einen
          externen Anbieter übermittelt, holen wir Ihre ausdrückliche Zustimmung
          ein. Ohne diese Zustimmung findet keine entsprechende Übermittlung
          statt.
        </p>
      </LegalPanel>

      <LegalPanel
        id="speicher"
        title="Speicherdauer und Löschung"
        info="Daten sollen nur so lange gespeichert werden, wie es für den Zweck nötig ist — oder wie Sie es in Ihrem Konto steuern."
      >
        <p>
          Speicherdauer und Sichtbarkeit Ihrer Profildaten richten sich nach
          Ihrer Nutzung der Plattform. Sie können Daten in Ihrem Konto jederzeit
          aktualisieren oder löschen, soweit keine gesetzlichen
          Aufbewahrungspflichten entgegenstehen.
        </p>
        <p>
          Ein strukturierter Datenexport nach DSGVO (Auskunft / Portabilität)
          wird vorbereitet und schrittweise in der Plattform freigeschaltet.
        </p>
      </LegalPanel>

      <LegalPanel
        id="rechte"
        title="Ihre Rechte"
        info="Die DSGVO gibt Ihnen Kontrollrechte über Ihre Daten — unter anderem Auskunft, Berichtigung und Löschung."
      >
        <LegalList
          items={[
            "Auskunft über gespeicherte Daten",
            "Berichtigung unrichtiger Daten",
            "Löschung („Recht auf Vergessenwerden“), soweit rechtlich zulässig",
            "Einschränkung der Verarbeitung",
            "Datenübertragbarkeit",
            "Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen",
            "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft",
          ]}
        />
        <p>
          Anfragen richten Sie bitte an{" "}
          <a
            href="mailto:datenschutz@synsight.de"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            datenschutz@synsight.de
          </a>
          . Zusätzlich besteht ein Beschwerderecht bei einer zuständigen
          Datenschutzaufsichtsbehörde.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
