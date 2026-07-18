import {
  DEFAULT_ANALYSIS_PRICES,
  type AnalysisKey,
} from "@/lib/credits/pricing";

export type AnalysisTier = "quick" | "advanced" | "premium";

export interface AnalysisModule {
  id: AnalysisKey;
  title: string;
  /** One-line pitch for busy scanning */
  tagline: string;
  /** Plain-language explanation for first-time users */
  description: string;
  /** Concrete outcomes the user can expect */
  whatYouGet: string[];
  duration: string;
  tier: AnalysisTier;
  badge?: string;
  help: string;
  icon: string;
  accent: string;
}

const CREDIT_BY_KEY = Object.fromEntries(
  DEFAULT_ANALYSIS_PRICES.map((entry) => [entry.key, entry.credits])
) as Record<AnalysisKey, number>;

export function defaultCreditsFor(key: AnalysisKey): number {
  return CREDIT_BY_KEY[key];
}

/**
 * Full SynSight analysis catalogue (UI + architecture prep).
 * Keys match `DEFAULT_ANALYSIS_PRICES` / admin pricing.
 */
export const analysisModules: AnalysisModule[] = [
  {
    id: "google_search",
    title: "Google Suche",
    tagline: "Was findet Google über Sie?",
    description:
      "Wir prüfen, welche öffentlichen Informationen zu Ihrem Namen und Ihren Angaben in Suchmaschinen auftauchen. Ideal als erster, verständlicher Überblick — auch wenn Sie noch nie eine solche Prüfung gemacht haben.",
    whatYouGet: [
      "Liste öffentlicher Suchtreffer",
      "Hinweise zu sichtbaren Kontaktdaten",
      "Einfache Risikoeinschätzung",
    ],
    duration: "ca. 2–4 Min.",
    tier: "quick",
    badge: "Einstieg",
    help: "Gute erste Analyse, wenn Sie wissen möchten, was Fremde über Sie googeln können. Keine Installation nötig — nur Ihre Profilangaben.",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 3v6l4 2",
    accent: "from-cyber-blue/20 to-transparent",
  },
  {
    id: "phone_analysis",
    title: "Telefonnummer",
    tagline: "Ist Ihre Nummer öffentlich auffindbar?",
    description:
      "Wir prüfen, ob Ihre Telefonnummer in öffentlichen Verzeichnissen, Branchenlisten oder alten Einträgen sichtbar ist. So erkennen Sie, wer Sie unerwünscht kontaktieren könnte.",
    whatYouGet: [
      "Öffentliche Nummern-Treffer",
      "Hinweis auf Branchen-/Verzeichnis-Einträge",
      "Empfehlungen zur Reduktion der Sichtbarkeit",
    ],
    duration: "ca. 2–5 Min.",
    tier: "quick",
    help: "Besonders sinnvoll, wenn Sie Spam-Anrufe erhalten oder eine Nummer lange online stand.",
    icon: "M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2a1 1 0 011-.24c1.1.37 2.3.57 3.5.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.2.2 2.4.57 3.5a1 1 0 01-.25 1L6.6 10.8z",
    accent: "from-sky-400/15 to-transparent",
  },
  {
    id: "email_analysis",
    title: "Email Analyse",
    tagline: "Wo taucht Ihre E-Mail öffentlich auf?",
    description:
      "Wir prüfen, ob Ihre E-Mail-Adresse öffentlich sichtbar ist oder in bekannten Datenleck-Hinweisen vorkommt. Wichtig, weil E-Mails oft der Schlüssel zu anderen Konten sind.",
    whatYouGet: [
      "Öffentliche E-Mail-Treffer",
      "Hinweise auf mögliche Leak-Signale",
      "Tipps zu Passwort & 2FA",
    ],
    duration: "ca. 2–5 Min.",
    tier: "quick",
    badge: "Wichtig",
    help: "Empfohlen für jede Adresse, die Sie beruflich oder privat häufig nutzen.",
    icon: "M4 6h16v12H4V6zm0 0 8 7 8-7",
    accent: "from-cyan-300/15 to-transparent",
  },
  {
    id: "website_analysis",
    title: "Website Analyse",
    tagline: "Welche Webseiten nennen Ihre Daten?",
    description:
      "Wir schauen nach öffentlichen Webseiten, Impressen, Team-Seiten oder Blog-Beiträgen, die mit Ihrer Identität verbunden sein könnten.",
    whatYouGet: [
      "Gefundene Webseiten & Impressen",
      "Sichtbare Kontaktangaben",
      "Priorisierte Prüfpunkte",
    ],
    duration: "ca. 3–6 Min.",
    tier: "quick",
    help: "Hilfreich, wenn Sie ein Unternehmen, ein Impressum oder alte Projektseiten haben.",
    icon: "M4 5h16v14H4V5zm2 4h12M6 13h8",
    accent: "from-blue-400/15 to-transparent",
  },
  {
    id: "domain_analysis",
    title: "Domain Analyse",
    tagline: "Was verraten Ihre Domains?",
    description:
      "Domains (z. B. meinefirma.de) können Eigentümer, Kontakte oder technische Spuren offenlegen. Wir prüfen öffentlich erkennbare Risiken rund um Ihre Domains.",
    whatYouGet: [
      "Domain-Exposition im Überblick",
      "Öffentliche Zuordnungshinweise",
      "Schutzempfehlungen",
    ],
    duration: "ca. 3–6 Min.",
    tier: "quick",
    help: "Sinnvoll, wenn Sie Domains besitzen oder früher Domains registriert haben.",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm-7 9h14M12 3c2.5 2.8 4 5.8 4 9s-1.5 6.2-4 9c-2.5-2.8-4-5.8-4-9s1.5-6.2 4-9z",
    accent: "from-indigo-300/12 to-transparent",
  },
  {
    id: "alias_analysis",
    title: "Alias Analyse",
    tagline: "Welche Benutzernamen gehören zu Ihnen?",
    description:
      "Viele Menschen nutzen Spitznamen oder alte Usernames. Wir prüfen, welche Aliase öffentlich mit Ihrer Identität in Verbindung stehen könnten.",
    whatYouGet: [
      "Erkannte Aliase / Usernames",
      "Mögliche Profil-Verknüpfungen",
      "Hinweise zu alten Konten",
    ],
    duration: "ca. 4–7 Min.",
    tier: "advanced",
    help: "Besonders nützlich, wenn Sie mehrere Nicknames oder Gaming-/Forum-Namen genutzt haben.",
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0M16 3l2 2-2 2M18 5h-4",
    accent: "from-violet-300/12 to-transparent",
  },
  {
    id: "social_media",
    title: "Social Media Analyse",
    tagline: "Welche Profile sind öffentlich mit Ihnen verknüpft?",
    description:
      "Wir prüfen öffentliche Social-Media-Profile und Verbindungen. So sehen Sie, welche Fotos, Bios oder Kontaktdaten ohne Login sichtbar sind.",
    whatYouGet: [
      "Öffentliche Profile (Demo-Struktur)",
      "Sichtbare Bio-/Link-Hinweise",
      "Empfehlungen zur Privatsphäre",
    ],
    duration: "ca. 4–8 Min.",
    tier: "advanced",
    badge: "Beliebt",
    help: "Starten Sie hier, wenn Sie Facebook, Instagram, LinkedIn, X oder ähnliche Netzwerke nutzen.",
    icon: "M16 8a4 4 0 11-8 0 4 4 0 018 0zM4 20a8 8 0 0116 0",
    accent: "from-cyan-400/18 to-transparent",
  },
  {
    id: "person_search",
    title: "Personensuche",
    tagline: "Breite Spurensuche zu Ihrer Person",
    description:
      "Eine umfassendere Suche nach öffentlichen Spuren Ihrer digitalen Identität — über mehrere Quellen hinweg. Gut, wenn Sie mehr als nur eine einzelne Prüfung wollen.",
    whatYouGet: [
      "Zusammengeführte Personen-Signale",
      "Priorisierte Fundliste",
      "Risikohinweise in Klartext",
    ],
    duration: "ca. 6–12 Min.",
    tier: "advanced",
    badge: "Empfohlen",
    help: "Die Personensuche ist der „Rundumblick“, bevor Sie in tiefere Pakete einsteigen.",
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0M17 8l4-1v2l-4 1M3 9l4-1v2L3 11",
    accent: "from-cyber-blue/22 to-transparent",
  },
  {
    id: "reverse_image_search",
    title: "Reverse Image Search",
    tagline: "Wo im Netz tauchen Ihre Bilder auf?",
    description:
      "Mit Ihren Referenzbildern prüfen wir, ob ähnliche Fotos öffentlich im Internet vorkommen — z. B. auf Profilen, Webseiten oder alten Beiträgen.",
    whatYouGet: [
      "Mögliche Bildtreffer",
      "Kontext, wo Bilder auftauchen",
      "Handlungsempfehlungen",
    ],
    duration: "ca. 5–10 Min.",
    tier: "advanced",
    help: "Benötigt später Ihre vier Referenzbilder im Identitätsprofil. Ohne Bilder ist die Analyse eingeschränkt.",
    icon: "M4 6h16v12H4V6zm3 3 3 3 2-2 4 5H7V9zM15 8h3v3",
    accent: "from-fuchsia-300/12 to-transparent",
  },
  {
    id: "ai_summary",
    title: "KI-Zusammenfassung",
    tagline: "Alles Wichtige in verständlicher Sprache",
    description:
      "Statt vieler Einzelmeldungen erhalten Sie eine klare KI-Zusammenfassung: Was wurde gefunden, wie riskant ist es, und was sollten Sie als Nächstes tun?",
    whatYouGet: [
      "Kurzbericht in Alltagssprache",
      "Top-Risiken priorisiert",
      "Konkrete nächste Schritte",
    ],
    duration: "ca. 3–6 Min.",
    tier: "advanced",
    help: "Ideal, wenn Sie bereits Analysen laufen hatten und eine verständliche Gesamtbewertung wollen.",
    icon: "M12 3l2.2 4.5L19 9l-3.5 3.4L16.4 18 12 15.6 7.6 18l.9-5.6L5 9l4.8-1.5L12 3z",
    accent: "from-amber-300/12 to-transparent",
  },
  {
    id: "pdf_report",
    title: "PDF Report",
    tagline: "Ergebnisse zum Speichern & Teilen",
    description:
      "Erzeugt einen übersichtlichen PDF-Bericht Ihrer Analyseergebnisse — z. B. für Ihre Unterlagen, Beratung oder interne Dokumentation.",
    whatYouGet: [
      "Exportierbarer PDF-Bericht",
      "Zusammenfassung der Funde",
      "Empfehlungen zum Mitnehmen",
    ],
    duration: "ca. 1–3 Min.",
    tier: "advanced",
    help: "Kein eigener Scan, sondern der Export Ihrer vorhandenen Ergebnisse in ein Dokument.",
    icon: "M6 3h9l3 3v15H6V3zm3 6h6m-6 4h6m-6 4h4",
    accent: "from-slate-300/12 to-transparent",
  },
  {
    id: "deep_intelligence",
    title: "Deep Intelligence Analyse",
    tagline: "Tiefe Korrelation über viele Quellen",
    description:
      "Unser intensives Paket: Mehrere Quellen werden miteinander verknüpft, um versteckte Zusammenhänge Ihrer digitalen Identität aufzudecken. Für alle, die gründlich absichern wollen.",
    whatYouGet: [
      "Multi-Quellen-Korrelation",
      "Tiefe Risikobewertung",
      "Priorisierte Schutzmaßnahmen",
    ],
    duration: "ca. 15–30 Min.",
    tier: "premium",
    badge: "Premium",
    help: "Deutlich umfassender als Einzelanalysen. Empfohlen bei hohem Schutzbedarf oder nach auffälligen Einzelfunden.",
    icon: "M12 2l3 6 6 1-4.5 4.2L18 20l-6-3.2L6 20l1.5-6.8L3 9l6-1 3-6z",
    accent: "from-cyber-cyan/25 to-transparent",
  },
  {
    id: "full_identity_analysis",
    title: "Komplette Digitale Identitätsanalyse",
    tagline: "Das Rundum-Paket für Ihre digitale Sicherheit",
    description:
      "Die vollständigste Prüfung: Suche, Kontakte, Social, Bilder und Risikobewertung in einem durchgängigen Überblick. Für Einsteiger die klarste Wahl, wenn Sie „alles Wichtige auf einmal“ wollen.",
    whatYouGet: [
      "Gesamtbild Ihrer digitalen Sichtbarkeit",
      "Alle Kern-Module in einer Auswertung",
      "Klarer Maßnahmenplan",
    ],
    duration: "ca. 20–40 Min.",
    tier: "premium",
    badge: "Komplettpaket",
    help: "Beste Einstiegsempfehlung, wenn Sie unsicher sind, welche Einzelanalyse Sie wählen sollen.",
    icon: "M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4zm-3 9 2 2 4-5",
    accent: "from-cyber-blue/30 to-transparent",
  },
];

export const analysisTierMeta: Record<
  AnalysisTier,
  { label: string; headline: string; blurb: string }
> = {
  quick: {
    label: "Schnelle Checks",
    headline: "Schnell starten — einzelne Fragen klären",
    blurb:
      "Kurze, günstige Analysen. Perfekt, wenn Sie zum ersten Mal prüfen möchten, was öffentlich über Sie sichtbar ist.",
  },
  advanced: {
    label: "Erweiterte Prüfungen",
    headline: "Mehr Tiefe — Profile, Bilder & Personen",
    blurb:
      "Für alle, die Zusammenhänge sehen wollen: Social Media, Aliase, Personensuche, Bilder und Zusammenfassungen.",
  },
  premium: {
    label: "Premium-Pakete",
    headline: "Maximaler Überblick — ein klarer Gesamtbefund",
    blurb:
      "Bündel mit dem höchsten Mehrwert. Weniger Einzelentscheidungen, mehr Ergebnis auf einmal.",
  },
};

export const analysisTiers: AnalysisTier[] = ["quick", "advanced", "premium"];
