import type { RiskLevel } from "@/types/platform";

export interface DemoFinding {
  id: string;
  label: string;
  detail: string;
  severity: RiskLevel;
}

export interface DemoAnalysisResult {
  id: string;
  title: string;
  status: "completed" | "partial" | "queued";
  statusLabel: string;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: DemoFinding[];
  recommendations: string[];
}

/** Static demo payload for Ergebnisse — replace with API later. */
export const demoAnalysisResults: DemoAnalysisResult[] = [
  {
    id: "google",
    title: "Google Analyse",
    status: "completed",
    statusLabel: "Demo-Ergebnis bereit",
    riskScore: 62,
    riskLevel: "medium",
    summary:
      "Öffentliche Suchtreffer zeigen konsistente Identitätsmerkmale. Einige Kontaktdaten sind ohne Login sichtbar.",
    findings: [
      {
        id: "g-name",
        label: "Name gefunden",
        detail: "Vollständiger Name erscheint in mehreren Suchergebnissen.",
        severity: "low",
      },
      {
        id: "g-email",
        label: "E-Mail sichtbar",
        detail: "Geschäftliche Adresse auf einer öffentlichen Kontaktseite.",
        severity: "medium",
      },
      {
        id: "g-phone",
        label: "Telefonnummer sichtbar",
        detail: "Festnetznummer in einem Branchenverzeichnis gelistet.",
        severity: "medium",
      },
      {
        id: "g-web",
        label: "Webseiten gefunden",
        detail: "Zwei Domains und ein Impressum mit übereinstimmenden Daten.",
        severity: "low",
      },
    ],
    recommendations: [
      "Prüfen Sie öffentliche Kontaktseiten auf unnötige Privatdaten.",
      "Entfernen oder anonymisieren Sie veraltete Branchen-Einträge.",
      "Nutzen Sie getrennte Adressen für privat und beruflich.",
    ],
  },
  {
    id: "social",
    title: "Social Media Analyse",
    status: "partial",
    statusLabel: "Teilweise (Demo)",
    riskScore: 48,
    riskLevel: "medium",
    summary:
      "Öffentliche Profile korrelieren mit Ihrem Identitätsprofil. Sensible Meta-Daten sind eingeschränkt sichtbar.",
    findings: [
      {
        id: "s-profile",
        label: "Öffentliche Profile",
        detail: "Zwei aktive und ein inaktives Profil erkannt (Demo).",
        severity: "low",
      },
      {
        id: "s-links",
        label: "Profil-Verknüpfungen",
        detail: "Öffentliche Bio-Links führen auf dieselbe Domain.",
        severity: "medium",
      },
    ],
    recommendations: [
      "Privatsphäre-Einstellungen für ältere Konten prüfen.",
      "Inaktive Profile schließen oder auf privat stellen.",
    ],
  },
  {
    id: "image",
    title: "Bildanalyse",
    status: "partial",
    statusLabel: "Wartet auf Referenzbilder (Demo)",
    riskScore: 35,
    riskLevel: "low",
    summary:
      "Sobald Referenzbilder vorliegen, werden öffentliche Bildtreffer korreliert. Aktuell nur Struktur-Demo.",
    findings: [
      {
        id: "i-pending",
        label: "Keine Live-Treffer",
        detail: "Pipeline vorbereitet — Bildabgleich noch nicht angebunden.",
        severity: "low",
      },
    ],
    recommendations: [
      "Vier Referenzansichten im Identitätsprofil hinterlegen.",
      "Nach Freigabe der Bildpipeline erneut starten.",
    ],
  },
  {
    id: "leak",
    title: "Datenleck Analyse",
    status: "queued",
    statusLabel: "Warteschlange (Demo)",
    riskScore: 78,
    riskLevel: "high",
    summary:
      "Ein Demo-Treffer deutet auf eine E-Mail in einem historischen Leak-Datensatz hin.",
    findings: [
      {
        id: "l-email",
        label: "E-Mail in Leak-Datensatz",
        detail:
          "Adresse taucht in einem bekannten Kompromittierungsbericht auf.",
        severity: "high",
      },
    ],
    recommendations: [
      "Passwort des betroffenen Kontos ändern und 2FA aktivieren.",
      "Wiederverwendete Passwörter auf anderen Diensten austauschen.",
    ],
  },
];

export const resultsOverview = {
  analysesRun: 4,
  findingsTotal: 8,
  openRecommendations: 7,
  lastUpdatedLabel: "Demo-Stand · keine Live-Pipeline",
};
