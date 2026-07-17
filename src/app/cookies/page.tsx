import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalMeta,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Cookie-Richtlinie — SynSight",
  description:
    "Cookie-Richtlinie von SynSight: derzeit nur technisch notwendige Session-Cookies, keine Tracking-Cookies.",
};

const UPDATED = "17. Juli 2026";

export default function CookiesPage() {
  return (
    <LegalDocument
      label="Recht / Cookies"
      title="Cookie-Richtlinie"
      subtitle="Welche Cookies SynSight setzt — und welche bewusst nicht."
      updatedAt={UPDATED}
      nav={[
        { id: "aktuell", label: "Aktuell" },
        { id: "notwendig", label: "Notwendig" },
        { id: "zukünftig", label: "Architektur" },
        { id: "kontrolle", label: "Kontrolle" },
      ]}
    >
      <LegalPanel
        id="aktuell"
        title="Aktueller Stand"
        info="Cookies speichern kleine Informationen im Browser. Bei SynSight dienen sie der Anmeldung — nicht der Werbung."
      >
        <p>
          SynSight verwendet derzeit ausschließlich technisch notwendige
          Cookies. Es werden keine Marketing-Cookies, keine Analyse-Cookies und
          keine Tracking-Cookies gesetzt.
        </p>
        <LegalMeta
          rows={[
            { label: "Marketing-Cookies", value: "Nein" },
            { label: "Analyse-Cookies", value: "Nein" },
            { label: "Tracking-Cookies", value: "Nein" },
            {
              label: "Session-Cookies",
              value: "Ja — für Login und Sicherheit",
            },
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="notwendig"
        title="Technisch notwendige Cookies"
        info="Ohne diese Cookies können wir Sie nicht sicher angemeldet halten und geschützte Bereiche nicht absichern."
      >
        <p>Typische Zwecke:</p>
        <LegalList
          items={[
            "Aufrechterhaltung Ihrer Sitzung nach dem Login",
            "Schutz vor unbefugtem Zugriff auf Dashboard, Profil und Admin-Bereiche",
            "Sicherstellung technischer Funktionen der Plattform",
          ]}
        />
        <p>
          Diese Cookies sind für den Betrieb erforderlich und werden nicht für
          Werbeprofile oder Reichweitenmessung eingesetzt.
        </p>
      </LegalPanel>

      <LegalPanel
        id="zukünftig"
        title="Vorbereitete Architektur für spätere Kategorien"
        info="Falls später optionale Cookies hinzukommen, sollen Sie diese einzeln freigeben können — nicht als undurchsichtiger Sammelzustimmung."
      >
        <p>
          Die Plattform ist so vorbereitet, dass künftig klar getrennte
          Kategorien möglich sind, zum Beispiel:
        </p>
        <LegalList
          items={[
            "Notwendig (immer aktiv)",
            "Funktional (optionale Komfortfunktionen)",
            "Analyse (nur nach Einwilligung)",
            "Marketing (nur nach Einwilligung)",
          ]}
        />
        <p>
          Solange solche optionalen Kategorien nicht aktiviert sind, erscheint
          kein Cookie-Banner für Marketing- oder Analysezwecke. Bei Einführung
          optionaler Cookies wird diese Richtlinie aktualisiert und — soweit
          erforderlich — eine Einwilligung eingeholt.
        </p>
      </LegalPanel>

      <LegalPanel
        id="kontrolle"
        title="Ihre Kontrolle"
        info="In den Browser-Einstellungen können Sie Cookies löschen oder blockieren. Dann kann der Login ggf. nicht mehr funktionieren."
      >
        <p>
          Sie können Cookies in Ihrem Browser jederzeit löschen oder
          einschränken. Beachten Sie: Ohne technisch notwendige Cookies ist eine
          Anmeldung bei SynSight möglicherweise nicht möglich.
        </p>
        <p>
          Weitere Informationen zur Datenverarbeitung finden Sie in der{" "}
          <a
            href="/datenschutz"
            className="text-cyber-cyan/80 hover:text-cyber-cyan"
          >
            Datenschutzerklärung
          </a>
          .
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
