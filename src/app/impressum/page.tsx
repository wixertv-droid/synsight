import type { Metadata } from "next";
import LegalDocument, {
  LegalMeta,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Impressum — SynSight",
  description:
    "Impressum und Anbieterkennzeichnung von SynSight — Betreiber René Eule, Gera.",
};

const UPDATED = "17. Juli 2026";

export default function ImpressumPage() {
  return (
    <LegalDocument
      label="Recht / Anbieterkennzeichnung"
      title="Impressum"
      subtitle="Gesetzliche Angaben zum Betreiber der SynSight-Plattform gemäß § 5 TMG und § 18 MStV."
      updatedAt={UPDATED}
      nav={[
        { id: "betreiber", label: "Betreiber" },
        { id: "kontakt", label: "Kontakt" },
        { id: "steuern", label: "Steuern" },
        { id: "verantwortlich", label: "Verantwortlich" },
      ]}
    >
      <LegalPanel
        id="betreiber"
        title="Betreiber"
        info="Das Impressum zeigt, wer rechtlich für diese Website und die Plattform verantwortlich ist."
      >
        <LegalMeta
          rows={[
            { label: "Name", value: "René Eule" },
            { label: "Unternehmen", value: "SynSight" },
            { label: "Rechtsform", value: "Einzelunternehmen" },
            {
              label: "Anschrift",
              value: (
                <>
                  Katharinenstraße 4
                  <br />
                  07546 Gera
                  <br />
                  Deutschland
                </>
              ),
            },
            { label: "Handelsregister", value: "Nicht vorhanden" },
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="kontakt"
        title="Kontakt"
        info="Für Anfragen zu Produkt, Partnerschaften oder rechtlichen Themen nutzen Sie bitte die angegebenen Kanäle."
      >
        <LegalMeta
          rows={[
            {
              label: "E-Mail",
              value: (
                <a
                  href="mailto:contact@synsight.de"
                  className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
                >
                  contact@synsight.de
                </a>
              ),
            },
            {
              label: "Kontaktformular",
              value: (
                <a
                  href="/contact"
                  className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
                >
                  synsight.de/contact
                </a>
              ),
            },
            {
              label: "Telefon",
              value: "Wird derzeit nicht veröffentlicht.",
            },
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="steuern"
        title="Umsatzsteuer"
        info="Die Kleinunternehmerregelung bedeutet, dass in Rechnungen keine Umsatzsteuer ausgewiesen wird."
      >
        <p>
          Es liegt derzeit keine Umsatzsteuer-Identifikationsnummer vor.
          SynSight wird als Einzelunternehmen betrieben und unterliegt der
          Kleinunternehmerregelung nach § 19 UStG.
        </p>
        <p>
          Sobald sich die steuerliche Situation ändert, werden die Angaben in
          diesem Impressum aktualisiert.
        </p>
      </LegalPanel>

      <LegalPanel
        id="verantwortlich"
        title="Verantwortlich gemäß § 18 MStV"
        info="Diese Angabe benennt die Person, die für journalistisch-redaktionelle Inhalte verantwortlich ist, soweit solche veröffentlicht werden."
      >
        <p>
          René Eule
          <br />
          Katharinenstraße 4
          <br />
          07546 Gera
          <br />
          Deutschland
        </p>
      </LegalPanel>

      <LegalPanel
        title="Streitbeilegung"
        info="Für Verbraucherinnen und Verbraucher gibt es in der EU eine Online-Streitbeilegungsplattform der Europäischen Kommission."
      >
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          .
        </p>
        <p>
          SynSight ist derzeit nicht verpflichtet und nicht bereit, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
