export type AnalysisModuleId =
  "google_presence" | "social_media" | "image_analysis" | "data_leak";

export interface AnalysisModule {
  id: AnalysisModuleId;
  title: string;
  description: string;
  duration: string;
  creditsLabel: string;
  help: string;
  icon: string;
  accent: string;
}

/** UI-only catalogue — no API wiring yet. */
export const analysisModules: AnalysisModule[] = [
  {
    id: "google_presence",
    title: "Google Präsenz Analyse",
    description:
      "Prüfen Sie, welche Informationen über Ihre digitale Identität öffentlich über Suchmaschinen sichtbar sind.",
    duration: "ca. 2–4 Min.",
    creditsLabel: "— SynCredits",
    help: "Sucht später nach öffentlichen Treffern zu Namen, E-Mails und Domains. Aktuell nur UI-Vorbereitung — noch keine echte Suche.",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 3v6l4 2",
    accent: "from-cyber-blue/20 to-transparent",
  },
  {
    id: "social_media",
    title: "Social Media Analyse",
    description:
      "Überprüfen Sie öffentliche Profile und Verbindungen zu Ihrer digitalen Identität.",
    duration: "ca. 3–6 Min.",
    creditsLabel: "— SynCredits",
    help: "Prüft später öffentliche Social-Profile auf Übereinstimmungen. Noch keine Netzwerk-Anbindung aktiv.",
    icon: "M16 8a4 4 0 11-8 0 4 4 0 018 0zM4 20a8 8 0 0116 0",
    accent: "from-cyan-400/15 to-transparent",
  },
  {
    id: "image_analysis",
    title: "Bildanalyse",
    description: "Erkennen Sie öffentliche Verwendung Ihrer Bilder.",
    duration: "ca. 4–8 Min.",
    creditsLabel: "— SynCredits",
    help: "Vergleicht später Ihre Referenzbilder mit öffentlichen Quellen. Benötigt ausgefülltes Identitätsprofil mit Bildern.",
    icon: "M4 6h16v12H4V6zm3 3 3 3 2-2 4 5H7l0-6z",
    accent: "from-sky-300/15 to-transparent",
  },
  {
    id: "data_leak",
    title: "Datenleck Analyse",
    description: "Prüfen Sie bekannte Sicherheitsrisiken und Datenlecks.",
    duration: "ca. 1–3 Min.",
    creditsLabel: "— SynCredits",
    help: "Abgleich mit bekannten Leak-Quellen. Noch Demo — keine Live-Datenbankabfrage.",
    icon: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4zm-1 10 4-4-1.5-1.5L11 10l-1.5-1.5L8 10l3 3z",
    accent: "from-rose-400/15 to-transparent",
  },
];
