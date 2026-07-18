import type { RiskLevel } from "@/types/platform";

export interface DemoThreat {
  id: string;
  level: RiskLevel;
  title: string;
  found: string;
  whyItMatters: string;
  userAction: string;
  source: string;
}

export const threatLevelMeta: Record<
  RiskLevel,
  { label: string; short: string; description: string }
> = {
  low: {
    label: "Niedrig",
    short: "LOW",
    description: "Auffälligkeiten mit geringem Handlungsdruck.",
  },
  medium: {
    label: "Mittel",
    short: "MED",
    description: "Sichtbare Risiken — zeitnah prüfen empfohlen.",
  },
  high: {
    label: "Hoch",
    short: "HIGH",
    description: "Kritische Funde — priorisierte Schutzmaßnahmen.",
  },
};

/** Static threats catalogue for UI architecture prep. */
export const demoThreats: DemoThreat[] = [
  {
    id: "threat-leak-email",
    level: "high",
    title: "Kompromittierte E-Mail-Adresse",
    found: "Ihre Demo-E-Mail erscheint in einem bekannten Datenleck-Bericht.",
    whyItMatters:
      "Angreifer können Passwort-Recycling und Phishing gezielt gegen Sie einsetzen.",
    userAction:
      "Passwort ändern, 2FA aktivieren und prüfen, wo dieselbe Adresse verwendet wird.",
    source: "Leak Intelligence · Demo",
  },
  {
    id: "threat-public-phone",
    level: "medium",
    title: "Öffentliche Telefonnummer",
    found: "Festnetznummer ist in einem Branchenverzeichnis ohne Login lesbar.",
    whyItMatters:
      "Erleichtert Social Engineering und unerwünschte Kontaktversuche.",
    userAction:
      "Eintrag aktualisieren oder entfernen lassen; ggf. Weiterleitung auf eine Firmenzentrale nutzen.",
    source: "Search Presence · Demo",
  },
  {
    id: "threat-old-account",
    level: "medium",
    title: "Verwaistes Social-Konto",
    found: "Ein seit Jahren inaktives Profil ist weiterhin öffentlich indexiert.",
    whyItMatters:
      "Alte Fotos und Bio-Daten können Identitätsdiebstahl oder Fake-Profile erleichtern.",
    userAction:
      "Konto löschen oder auf privat stellen und verknüpfte E-Mail absichern.",
    source: "Social Graph · Demo",
  },
  {
    id: "threat-name-index",
    level: "low",
    title: "Konsistente Namenssichtbarkeit",
    found: "Vollständiger Name erscheint in unkritischen öffentlichen Quellen.",
    whyItMatters:
      "Allein meist harmlos, erhöht aber die Auffindbarkeit in Kombination mit anderen Daten.",
    userAction:
      "Optional: öffentliche Profile auf benötigte Sichtbarkeit reduzieren.",
    source: "OSINT Correlate · Demo",
  },
];
