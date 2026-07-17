import type { Metadata } from "next";
import LegalDocument, {
  LegalList,
  LegalPanel,
} from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen — SynSight",
  description:
    "Nutzungsbedingungen von SynSight: Verantwortung, Grenzen der Analyse und faire Plattformnutzung.",
};

const UPDATED = "17. Juli 2026";

export default function NutzungsbedingungenPage() {
  return (
    <LegalDocument
      label="Recht / Nutzung"
      title="Nutzungsbedingungen"
      subtitle="Wie SynSight genutzt werden darf — und welche Verantwortung bei Nutzerinnen, Nutzern und SynSight liegt."
      updatedAt={UPDATED}
      nav={[
        { id: "zweck", label: "Zweck" },
        { id: "nutzer", label: "Ihre Verantwortung" },
        { id: "synsight", label: "Unsere Verantwortung" },
        { id: "ergebnisse", label: "Ergebnisse" },
        { id: "verhalten", label: "Verhalten" },
      ]}
    >
      <LegalPanel
        id="zweck"
        title="Zweck der Plattform"
        info="SynSight hilft, öffentliche digitale Spuren und Risiken verständlich zu machen — als Entscheidungshilfe, nicht als Urteil."
      >
        <p>
          SynSight stellt Werkzeuge bereit, um öffentliche digitale Signale zu
          analysieren, Risiken einzuordnen und Schutzmaßnahmen abzuleiten. Die
          Plattform richtet sich an volljährige Nutzerinnen und Nutzer.
        </p>
        <p>
          Ergänzend gelten die{" "}
          <a href="/agb" className="text-cyber-cyan/80 hover:text-cyber-cyan">
            AGB
          </a>{" "}
          und die{" "}
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
        id="nutzer"
        title="Ihre Verantwortung"
        info="Sie entscheiden, welche Daten Sie eingeben und welche Analysen Sie starten — und tragen die Verantwortung für die Rechtmäßigkeit."
      >
        <LegalList
          items={[
            "Sie nutzen SynSight nur mit eigenen oder ausdrücklich freigegebenen Daten.",
            "Sie prüfen vor Analysen zu Dritten, ob Sie dazu berechtigt sind.",
            "Sie schützen Ihre Zugangsdaten und melden verdächtige Zugriffe.",
            "Sie verwenden Ergebnisse nicht zur Belästigung, Diskriminierung oder rechtswidrigen Überwachung.",
            "Sie halten geltendes Recht ein — einschließlich Datenschutz-, Persönlichkeits- und Urheberrecht.",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="synsight"
        title="Verantwortung von SynSight"
        info="Wir stellen die Plattform bereit, sichern sie technisch und erklären Ergebnisse nachvollziehbar — ohne Garantie auf Vollständigkeit des Internets."
      >
        <LegalList
          items={[
            "Bereitstellung der Plattformfunktionen nach dem aktuellen Stand der Technik",
            "Transparente Anzeige von SynCredits-Kosten vor kostenpflichtigen Analysen",
            "Technische und organisatorische Maßnahmen zum Schutz gespeicherter Daten",
            "Klare Kommunikation, wenn Funktionen Demo-, Preview- oder Entwurfsstatus haben",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="ergebnisse"
        title="Analyseergebnisse und Grenzen"
        info="OSINT bedeutet: Es werden öffentlich zugängliche Quellen ausgewertet — nicht geheime Behörden- oder Bankdaten."
      >
        <p>
          Analyseergebnisse dienen ausschließlich der Information. Sie stellen
          keine Rechtsberatung, keine forensische Expertise und keine Garantie
          auf Vollständigkeit externer Datenquellen dar.
        </p>
        <LegalList
          items={[
            "Öffentliche Quellen können fehlerhaft, veraltet oder unvollständig sein.",
            "Fehlende Treffer bedeuten nicht automatisch, dass keine digitalen Spuren existieren.",
            "Risikoeinschätzungen sind modell- und regelbasiert und ersetzen keine individuelle Fachberatung.",
          ]}
        />
      </LegalPanel>

      <LegalPanel
        id="verhalten"
        title="Fair Use und Sperrung"
        info="Fair Use heißt: Die Plattform soll für echte Identitäts- und Sicherheitstransparenz genutzt werden — nicht als Werkzeug für Massenscans."
      >
        <p>
          SynSight behält sich vor, bei Verstößen gegen diese
          Nutzungsbedingungen, die AGB oder geltendes Recht Zugänge
          einzuschränken oder zu sperren. Details zum Missbrauchsschutz finden
          Sie in den AGB.
        </p>
      </LegalPanel>
    </LegalDocument>
  );
}
