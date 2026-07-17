import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalMeta,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Security & Compliance — SynSight",
  description:
    "Sicherheitsarchitektur von SynSight: Argon2id, HTTPS, Sessions, DSGVO, Serverstandort Deutschland und geplante Hardening-Features.",
};

const UPDATED = "17. Juli 2026";

export default function SecurityPage() {
  return (
    <LegalDocument
      label="Trust / Security"
      title="Security & Compliance"
      subtitle="Wie SynSight technische und organisatorische Sicherheit umsetzt — und welche Schutzmaßnahmen als Nächstes folgen."
      updatedAt={UPDATED}
      nav={[
        { id: "grundlagen", label: "Grundlagen" },
        { id: "auth", label: "Authentifizierung" },
        { id: "daten", label: "Daten" },
        { id: "betrieb", label: "Betrieb" },
        { id: "roadmap", label: "Roadmap" },
        { id: "disclosure", label: "Disclosure" },
      ]}
    >
      <LegalPanel
        id="grundlagen"
        title="Sicherheitsprinzipien"
        info="Datensparsamkeit bedeutet: Wir speichern nur, was für die Funktion wirklich nötig ist."
      >
        <LegalList
          items={[
            "Datensparsamkeit bei Profil- und Analysedaten",
            "Verschlüsselte Übertragung (HTTPS/TLS)",
            "Getrennte Verantwortlichkeiten zwischen App-, Datenbank- und Speicherebenen",
            "Nachvollziehbare Admin- und Audit-Ereignisse",
            "Klare Einwilligung vor KI-Übermittlungen an externe Anbieter",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="auth"
        title="Authentifizierung und Sitzungen"
        info="Argon2id ist ein modernes Verfahren, um Passwörter so zu speichern, dass sie selbst bei einem Datenbankzugriff nicht im Klartext lesbar sind."
      >
        <LegalMeta
          rows={[
            {
              label: "Passwörter",
              value: "Argon2id-Hashing — kein Klartextspeicher",
            },
            {
              label: "E-Mail-Verifikation",
              value: "Aktivierung neuer Konten über zeitlich begrenzte Tokens",
            },
            {
              label: "Sessions",
              value:
                "Signierte, HttpOnly-Session-Cookies mit serverseitiger Session-Verwaltung",
            },
            {
              label: "Rate Limiting",
              value:
                "Begrenzung von Login-, Registrierungs- und Formularversuchen",
            },
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="daten"
        title="Daten, Speicher und Standort"
        info="Ein Serverstandort in Deutschland erleichtert die Einhaltung europäischer Datenschutzanforderungen."
      >
        <LegalMeta
          rows={[
            { label: "Hosting", value: "netcup" },
            { label: "Standort", value: "Nürnberg, Deutschland" },
            { label: "Datenbank", value: "MariaDB" },
            {
              label: "Bilder",
              value: "Komprimiert und verschlüsselt abgelegt",
            },
            {
              label: "DSGVO",
              value:
                "Verarbeitung nach Zweckbindung, mit Rechten auf Auskunft und Löschung",
            },
          ]}
        />
        <p>
          Details zur Datenverarbeitung finden Sie in der{" "}
          <a
            href="/datenschutz"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            Datenschutzerklärung
          </a>
          .
        </p>
      </LegalPanel>

      <LegalPanel
        id="betrieb"
        title="Betrieb und KI-Sicherheit"
        info="KI-Sicherheit heißt hier: Analysen nur mit Kontext und Zustimmung — keine ungefragten Massenübertragungen."
      >
        <LegalList
          items={[
            "Regelmäßige Abhängigkeits- und Plattform-Updates",
            "Audit-Logs für sicherheitsrelevante Ereignisse",
            "Absicherung von Admin-Funktionen über Rollenprüfung",
            "KI-Analysen nur für vom Nutzer angestoßene Vorgänge",
            "Einwilligung vor der ersten Übermittlung an externe KI-APIs",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="roadmap"
        title="Geplante Sicherheitsfeatures"
        info="Diese Punkte sind Teil der Security-Roadmap und werden schrittweise ausgerollt."
      >
        <LegalList
          items={[
            "Zwei-Faktor-Authentifizierung (2FA)",
            "Passkeys",
            "WebAuthn",
            "Erweiterte Security Headers",
            "Ausbau von Rate Limiting und Anomalie-Erkennung",
            "Vertiefte Audit-Log-Auswertung im Adminbereich",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="disclosure"
        title="Responsible Disclosure"
        info="Responsible Disclosure bedeutet: Sicherheitslücken werden vertraulich gemeldet, damit sie behoben werden können, bevor sie öffentlich ausgenutzt werden."
      >
        <p>
          Wenn Sie eine potenzielle Sicherheitslücke in SynSight entdecken,
          melden Sie diese bitte vertraulich an{" "}
          <a
            href="mailto:contact@synsight.de?subject=Security%20Disclosure"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            contact@synsight.de
          </a>{" "}
          mit dem Betreff „Security Disclosure“.
        </p>
        <p>
          Bitte verzichten Sie auf öffentliche Disclosure, bis wir die Meldung
          prüfen und — soweit erforderlich — einen Fix bereitstellen konnten.
          Wir behandeln gutgläubige Hinweise ernst und zeitnah.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
