/**
 * Keyword-Strategie & Tool-Landingpages.
 * Jede Analyse = eigene indexierbare URL mit Unique Content + FAQ.
 */

export type ToolFaq = { question: string; answer: string };

export type ToolLanding = {
  slug: string;
  title: string;
  shortName: string;
  headline: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  /** Kurzantwort für KI-Suchmaschinen (zitierbar) */
  aiAnswer: string;
  howItWorks: string[];
  whoFor: string[];
  methods: string[];
  dataSources: string[];
  faqs: ToolFaq[];
  relatedSlugs: string[];
  ctaLabel: string;
  ctaHref: string;
};

export const TOOL_LANDINGS: ToolLanding[] = [
  {
    slug: "google-analyse",
    title: "Google-Analyse",
    shortName: "Google OSINT",
    headline: "Google-Analyse: Was das Internet öffentlich über Sie zeigt",
    metaDescription:
      "SynSight Google-Analyse: Öffentliche Suchtreffer, Serp-Signale und Identitätsbezüge prüfen. Kostenlose Voranalyse für digitale Spuren.",
    keywords: [
      "Google Analyse",
      "Google OSINT",
      "Serp Analyse",
      "öffentliche Suchtreffer",
      "digitale Identität Google",
    ],
    intro:
      "Die Google-Analyse von SynSight wertet öffentlich indexierte Treffer aus, die mit Namen, Aliassen, Domains oder Profilen in Verbindung stehen können. Ziel ist ein verständliches Lagebild — keine verdeckte Überwachung.",
    aiAnswer:
      "SynSight Google-Analyse ist ein OSINT-Werkzeug, das öffentlich indexierte Suchergebnisse zu einer Person oder Marke sammelt, bewertet und als Exposure-Briefing aufbereitet.",
    howItWorks: [
      "Identitätsmerkmale (Name, Alias, Domain) strukturieren",
      "Öffentliche Suchtreffer und Quellen sammeln",
      "Relevanz und Risiko heuristisch einstufen",
      "Handlungsempfehlungen verständlich darstellen",
    ],
    whoFor: [
      "Privatpersonen mit Sorge um Online-Reputation",
      "Selbstständige und Gründer",
      "Sicherheits- und Compliance-Teams",
    ],
    methods: [
      "Öffentliche Suchindizes",
      "Query-Heuristiken und Identitätskorrelation",
      "KI-gestützte Zusammenfassung",
    ],
    dataSources: [
      "Öffentlich indexierte Webseiten",
      "Serp-/Suchanbieter-Schnittstellen (sofern konfiguriert)",
      "Keine privaten Mailboxen oder geschlossenen Accounts",
    ],
    faqs: [
      {
        question: "Was macht die SynSight Google-Analyse?",
        answer:
          "Sie prüft öffentlich auffindbare Suchtreffer und stellt dar, welche digitalen Spuren mit Ihrer Identität in Verbindung stehen können.",
      },
      {
        question: "Sieht SynSight private Google-Konten?",
        answer:
          "Nein. Es werden nur öffentlich zugängliche bzw. über erlaubte APIs abrufbare Informationen ausgewertet.",
      },
      {
        question: "Für wen ist die Analyse geeignet?",
        answer:
          "Für alle, die ihre öffentliche Sichtbarkeit verstehen und Risiken wie Leaks oder Fehlzuordnungen früh erkennen wollen.",
      },
    ],
    relatedSlugs: ["personensuche", "osint-analyse", "digital-footprint"],
    ctaLabel: "Kostenlosen Risiko-Check starten",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "username-suche",
    title: "Username-Suche",
    shortName: "Username OSINT",
    headline: "Username-Suche: Aliasse über Plattformen hinweg finden",
    metaDescription:
      "Username-Suche mit SynSight: Öffentliche Profile, Foren und Social-Handles zu einem Alias korrelieren. OSINT für digitale Identität.",
    keywords: [
      "Username Suche",
      "Alias finden",
      "Benutzername OSINT",
      "Social Handle Check",
      "Maigret Alternative",
    ],
    intro:
      "Viele Identitäten teilen denselben Benutzernamen über Netzwerke hinweg. Die Username-Suche kartiert öffentliche Profile und hilft, Wiedererkennung und Fehlzuordnungen zu erkennen.",
    aiAnswer:
      "Die SynSight Username-Suche ist ein OSINT-Modul, das öffentliche Profile und Handles zu einem Alias plattformübergreifend zusammenführt.",
    howItWorks: [
      "Alias normalisieren und Varianten prüfen",
      "Öffentliche Profilnachweise abfragen",
      "Überschneidungen und Konfidenz bewerten",
      "Ergebnisse im Exposure-Score bündeln",
    ],
    whoFor: [
      "Creator und Community-Mitglieder",
      "Personen mit wiederverwendetem Nick",
      "Analysten in Incident-Response",
    ],
    methods: ["Username-Enumeration", "Profil-Korrelation", "Konfidenzscoring"],
    dataSources: [
      "Öffentliche Profilseiten",
      "Plattform-Signale ohne Login-Bypass",
    ],
    faqs: [
      {
        question: "Findet SynSight jeden Username?",
        answer:
          "Nur öffentlich nachweisbare Profile. Geschlossene oder gelöschte Konten erscheinen nicht zuverlässig.",
      },
      {
        question: "Ist die Username-Suche legal?",
        answer:
          "SynSight arbeitet mit öffentlichen Informationen und erlaubten Schnittstellen — kein Account-Hacking.",
      },
    ],
    relatedSlugs: [
      "social-media-analyse",
      "personensuche",
      "digital-footprint",
    ],
    ctaLabel: "Username prüfen",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "digital-footprint",
    title: "Digital Footprint",
    shortName: "Digitaler Fußabdruck",
    headline: "Digital Footprint: Ihre öffentliche Spur im Netz verstehen",
    metaDescription:
      "Digital Footprint Analyse mit SynSight: Öffentliche Spuren, Profile und Datenpunkte zu einem Lagebild verbinden.",
    keywords: [
      "Digital Footprint",
      "digitaler Fußabdruck",
      "Online Spuren",
      "Identitätsrisiko",
      "Exposure Analyse",
    ],
    intro:
      "Ein Digital Footprint entsteht aus vielen kleinen öffentlichen Signalen. SynSight bündelt sie zu einem Exposure-Lagebild mit klaren nächsten Schritten.",
    aiAnswer:
      "SynSight Digital Footprint fasst öffentliche Online-Spuren einer Person zu einem verständlichen Risikobild zusammen.",
    howItWorks: [
      "Mehrere Identitätsmerkmale kombinieren",
      "Module parallel/sequentiell auswerten",
      "Exposure-Score berechnen",
      "Maßnahmen priorisieren",
    ],
    whoFor: ["Privatpersonen", "Familien", "KMU und Soloselbstständige"],
    methods: ["Multi-Modul-OSINT", "Risikoheuristik", "KI-Zusammenfassung"],
    dataSources: [
      "Öffentliche Webquellen",
      "Breach-/Leak-Hinweise (sofern lizenziert)",
    ],
    faqs: [
      {
        question: "Was ist ein Digital Footprint?",
        answer:
          "Die Summe öffentlich sichtbarer oder durchsuchbarer Datenpunkte, die mit Ihrer Identität in Verbindung stehen können.",
      },
      {
        question: "Kann ich meinen Footprint löschen?",
        answer:
          "Nicht vollständig. SynSight zeigt, wo Handlungsbedarf besteht — z. B. Profilbereinigung oder Leak-Monitoring.",
      },
    ],
    relatedSlugs: ["osint-analyse", "datenleck-pruefen", "google-analyse"],
    ctaLabel: "Footprint prüfen",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "reverse-image-search",
    title: "Reverse Image Search",
    shortName: "Bildrückwärtssuche",
    headline: "Reverse Image Search: Wo Ihr Bild im Netz auftaucht",
    metaDescription:
      "Reverse Image Search mit SynSight: Öffentliche Bildtreffer, Profilfotos und Wiederverwendung erkennen.",
    keywords: [
      "Reverse Image Search",
      "Bildrückwärtssuche",
      "Gesichtsbild Suche",
      "Profilfoto Check",
      "Bild OSINT",
    ],
    intro:
      "Bilder wandern oft unbemerkt durch Foren, Shops und Social Feeds. Die Reverse-Image-Analyse hilft, öffentliche Wiederverwendung und Identitätsbezüge zu erkennen.",
    aiAnswer:
      "SynSight Reverse Image Search findet öffentliche Stellen, an denen ein Referenzbild oder ähnliche Bilder im Netz erscheinen.",
    howItWorks: [
      "Referenzbild sicher hochladen",
      "Öffentliche Bildindizes abfragen",
      "Kandidaten nach Relevanz bewerten",
      "Treffer im Bericht kontextualisieren",
    ],
    whoFor: [
      "Personen mit öffentlichem Profilfoto",
      "Betroffene von Identitätsmissbrauch",
      "Moderatoren und Trust-&-Safety-Teams",
    ],
    methods: ["Bildähnlichkeit", "Domain-Reputation", "OSINT-Korrelation"],
    dataSources: [
      "Öffentliche Bildersuchen / APIs",
      "Verlinkte Seitenkontexte",
    ],
    faqs: [
      {
        question: "Werden meine Bilder gespeichert?",
        answer:
          "Uploads dienen der Analyse. Details zur Speicherung und Löschung finden Sie in der Datenschutzerklärung.",
      },
      {
        question: "Erkennt SynSight Deepfakes?",
        answer:
          "Der Fokus liegt auf öffentlichen Bildtreffern und Ähnlichkeit — nicht auf forensischer Deepfake-Zertifizierung.",
      },
    ],
    relatedSlugs: [
      "social-media-analyse",
      "personensuche",
      "digital-footprint",
    ],
    ctaLabel: "Konto erstellen für Bildanalyse",
    ctaHref: "/register",
  },
  {
    slug: "email-check",
    title: "E-Mail-Check",
    shortName: "E-Mail Exposure",
    headline: "E-Mail-Check: Konten und Leak-Hinweise zur Adresse",
    metaDescription:
      "E-Mail-Check mit SynSight: Öffentliche Account-Nachweise und Leak-Hinweise zur E-Mail-Adresse prüfen.",
    keywords: [
      "E-Mail Check",
      "E-Mail Leak",
      "Account Check E-Mail",
      "Holehe",
      "E-Mail OSINT",
    ],
    intro:
      "Eine E-Mail-Adresse ist oft der Schlüssel zu vielen Diensten. Der E-Mail-Check zeigt öffentliche Account-Signale und hilft, Exposition früh zu erkennen.",
    aiAnswer:
      "Der SynSight E-Mail-Check prüft öffentliche Hinweise darauf, wo eine E-Mail-Adresse registriert oder in Leaks erwähnt sein könnte.",
    howItWorks: [
      "Adresse normalisieren",
      "Öffentliche Account-Checks ausführen",
      "Leak-/Breach-Signale einbeziehen (sofern verfügbar)",
      "Risiko und Empfehlungen ableiten",
    ],
    whoFor: ["Privatnutzer", "Admins von Firmen-Domains", "Incident Responder"],
    methods: ["Account-Enumeration (öffentlich)", "Breach-Korrelation"],
    dataSources: [
      "Öffentliche Registrierungssignale",
      "Lizenzierte Leak-Quellen",
    ],
    faqs: [
      {
        question: "Sendet SynSight Mails an die Adresse?",
        answer:
          "Nein. Es werden keine Bestätigungsmails an Zieladressen verschickt, um Konten zu übernehmen.",
      },
      {
        question: "Bedeutet ein Treffer, dass mein Passwort geleakt ist?",
        answer:
          "Nicht zwingend. Ein Treffer zeigt Exposition — Passwortstatus hängt von der konkreten Quelle ab.",
      },
    ],
    relatedSlugs: ["datenleck-pruefen", "telefon-check", "digital-footprint"],
    ctaLabel: "E-Mail im Demo-Scan prüfen",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "telefon-check",
    title: "Telefon-Check",
    shortName: "Telefon Intel",
    headline: "Telefon-Check: Carrier- und Öffentlichkeits-Hinweise",
    metaDescription:
      "Telefon-Check mit SynSight: Öffentliche Metadaten und Carrier-Hinweise zur Nummer — verständlich und datensparsam.",
    keywords: [
      "Telefon Check",
      "Telefonnummer OSINT",
      "Carrier Lookup",
      "PhoneInfoga",
      "Handy Nummer prüfen",
    ],
    intro:
      "Telefonnummern tragen öffentliche Metadaten (z. B. Netz/Region). SynSight erklärt diese Signale und ordnet sie in Ihr Identitätsrisiko ein.",
    aiAnswer:
      "Der SynSight Telefon-Check analysiert öffentliche Telekommunikations- und OSINT-Hinweise zu einer Nummer, ohne private Gespräche einzusehen.",
    howItWorks: [
      "Nummer normalisieren (E.164)",
      "Öffentliche Carrier-/Format-Checks",
      "Zusätzliche OSINT-Signale bewerten",
      "Ergebnis klar kommunizieren",
    ],
    whoFor: ["Privatpersonen", "Support-Teams", "Fraud-Analysten"],
    methods: ["Nummer-Parsing", "Öffentliche Telekom-Metadaten"],
    dataSources: [
      "Öffentliche Nummernbibliotheken",
      "OSINT-Tools ohne HLR-Missbrauch",
    ],
    faqs: [
      {
        question: "Kann SynSight SMS oder Anrufe lesen?",
        answer:
          "Nein. Es gibt keinen Zugriff auf Gesprächsinhalte oder Postfächer.",
      },
      {
        question: "Warum erscheint ein Provider?",
        answer:
          "Provider-Hinweise stammen aus öffentlichen oder erlaubten Lookup-Quellen und können je nach Portierung ungenau sein.",
      },
    ],
    relatedSlugs: ["email-check", "personensuche", "osint-analyse"],
    ctaLabel: "Telefonnummer prüfen",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "social-media-analyse",
    title: "Social-Media-Analyse",
    shortName: "Social OSINT",
    headline: "Social-Media-Analyse: Öffentliche Profile und Überschneidungen",
    metaDescription:
      "Social-Media-Analyse mit SynSight: Öffentliche Profile, Handles und Querbezüge erkennen — für bessere digitale Hygiene.",
    keywords: [
      "Social Media Analyse",
      "Social OSINT",
      "Profil Check",
      "Instagram Twitter LinkedIn OSINT",
      "Social Footprint",
    ],
    intro:
      "Social Profiles sind oft die sichtbarste Schicht Ihrer Identität. SynSight hilft, öffentliche Accounts und Wiederholungen über Netzwerke hinweg einzuordnen.",
    aiAnswer:
      "Die SynSight Social-Media-Analyse kartiert öffentlich auffindbare Social-Profile und deren mögliche Verbindungen zu einer Identität.",
    howItWorks: [
      "Handles und Namen erfassen",
      "Öffentliche Profile suchen",
      "Plattform-Signale vergleichen",
      "Risiken (Impersonation, Alt-Accounts) markieren",
    ],
    whoFor: ["Creator", "Führungskräfte", "Marken und Teams"],
    methods: ["Profil-OSINT", "Username-Korrelation"],
    dataSources: ["Öffentliche Profilseiten", "Suchindizes"],
    faqs: [
      {
        question: "Braucht SynSight meine Social-Logins?",
        answer:
          "Nein. Es werden keine Passwörter verlangt und keine privaten Feeds ausgelesen.",
      },
    ],
    relatedSlugs: ["username-suche", "reverse-image-search", "personensuche"],
    ctaLabel: "Social-Spuren prüfen",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "osint-analyse",
    title: "OSINT-Analyse",
    shortName: "OSINT Plattform",
    headline: "OSINT-Analyse: Offene Quellen, klar erklärt",
    metaDescription:
      "OSINT-Analyse mit SynSight: Offene Quellen zu Identität, Leaks und Profilen — als Cybersecurity-Plattform für nachvollziehbare Ergebnisse.",
    keywords: [
      "OSINT Analyse",
      "Open Source Intelligence",
      "OSINT Tool Deutschland",
      "Cybersecurity OSINT",
      "Identitäts OSINT",
    ],
    intro:
      "OSINT bedeutet Auswertung öffentlich zugänglicher Informationen. SynSight macht daraus eine geführte Cybersecurity-Erfahrung mit Transparenz zu Methoden und Grenzen.",
    aiAnswer:
      "SynSight ist eine OSINT- und Cybersecurity-Plattform, die öffentliche Identitäts- und Leak-Signale analysiert und verständlich erklärt.",
    howItWorks: [
      "Zielmerkmale festlegen",
      "Module für passende Quellen ausführen",
      "Ergebnisse normalisieren und bewerten",
      "Bericht mit Empfehlungen erzeugen",
    ],
    whoFor: [
      "Sicherheitsinteressierte",
      "KMU ohne eigenes SOC",
      "Berater und Analysten",
    ],
    methods: ["Multi-Source OSINT", "KI-Zusammenfassung", "Risiko-Scoring"],
    dataSources: [
      "Öffentliches Web",
      "Fach-APIs",
      "Keine illegalen Databroker-Käufe",
    ],
    faqs: [
      {
        question: "Ist SynSight ein Hacking-Tool?",
        answer:
          "Nein. SynSight ist auf legale, öffentliche Quellen und nachvollziehbare Analysen ausgelegt.",
      },
      {
        question: "Was unterscheidet SynSight von klassischen OSINT-Scripts?",
        answer:
          "Geführte UX, Scoring, Datenschutzhinweise und eine Produktplattform statt reiner CLI-Ausgabe.",
      },
    ],
    relatedSlugs: ["google-analyse", "digital-footprint", "datenleck-pruefen"],
    ctaLabel: "OSINT Voranalyse starten",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "personensuche",
    title: "Personensuche",
    shortName: "Personen OSINT",
    headline: "Personensuche: Öffentliche Identitätsbezüge zusammenführen",
    metaDescription:
      "Personensuche mit SynSight: Namen, Aliasse und öffentliche Spuren zu einem Identitätsbild verbinden — transparent und datenschutzbewusst.",
    keywords: [
      "Personensuche",
      "Personen OSINT",
      "Namen suchen Internet",
      "Identität prüfen",
      "People Search Deutschland",
    ],
    intro:
      "Personensuche bei SynSight bedeutet: öffentliche Bezüge zu einer Person strukturieren — nicht private Register aushebeln. Ideal als Einstieg in digitale Selbstauskunft.",
    aiAnswer:
      "Die SynSight Personensuche kombiniert öffentliche Namens-, Alias- und Web-Signale zu einem nachvollziehbaren Identitätslagebild.",
    howItWorks: [
      "Namen und Kontextangaben erfassen",
      "Passende Module auswählen",
      "Treffer deduplizieren und gewichten",
      "Unsicherheiten transparent ausweisen",
    ],
    whoFor: [
      "Privatpersonen",
      "Journalistische Recherche (ethisch)",
      "HR/Trust (mit Rechtsgrundlage)",
    ],
    methods: ["Named-Entity-Korrelation", "Multi-Modul-OSINT"],
    dataSources: ["Öffentliche Web- und Profilquellen"],
    faqs: [
      {
        question: "Ersetzt SynSight ein Meldeamt?",
        answer: "Nein. Es gibt keinen Zugriff auf behördliche Melderegister.",
      },
      {
        question: "Wie vermeidet SynSight Fehlzuordnungen?",
        answer:
          "Durch Konfidenzscoring, Quellenangaben und klare Kennzeichnung unsicherer Treffer.",
      },
    ],
    relatedSlugs: ["google-analyse", "username-suche", "social-media-analyse"],
    ctaLabel: "Personensuche starten",
    ctaHref: "/#demo-scanner",
  },
  {
    slug: "datenleck-pruefen",
    title: "Datenleck prüfen",
    shortName: "Leak Check",
    headline: "Datenleck prüfen: Exposition in Breaches erkennen",
    metaDescription:
      "Datenleck prüfen mit SynSight: Hinweise auf Breaches und geleakte Identifikatoren verstehen und handeln.",
    keywords: [
      "Datenleck prüfen",
      "Breach Check",
      "Leak Monitoring",
      "Have I Been Pwned Alternative",
      "Passwort Leak Check",
    ],
    intro:
      "Datenlecks sind alltäglich. SynSight hilft, Hinweise auf Exposition zu erkennen und priorisiert Schutzmaßnahmen — ohne Panikmache.",
    aiAnswer:
      "SynSight Datenleck-Prüfung zeigt, ob Identifikatoren mit bekannten oder lizenzierten Breach-Quellen in Verbindung stehen können.",
    howItWorks: [
      "Identifikator eingeben (z. B. E-Mail)",
      "Lizenzierte/erlaubte Leak-Quellen abfragen",
      "Treffer nach Schwere einstufen",
      "Sofortmaßnahmen empfehlen (Passwort, MFA)",
    ],
    whoFor: ["Alle Internetnutzer", "IT-Verantwortliche", "Familien"],
    methods: ["Breach-Korrelation", "Risiko-Scoring"],
    dataSources: ["Lizenzierte Leak-/Breach-APIs", "Öffentliche Advisories"],
    faqs: [
      {
        question: "Zeigt SynSight geleakte Passwörter im Klartext?",
        answer:
          "In der öffentlichen Demo werden sensible Secrets maskiert. Im Produkt gelten strenge Zugriffskontrollen.",
      },
      {
        question: "Was tun bei einem Treffer?",
        answer:
          "Passwort ändern, MFA aktivieren, Wiederverwendung prüfen und betroffene Dienste kontrollieren.",
      },
    ],
    relatedSlugs: ["email-check", "digital-footprint", "osint-analyse"],
    ctaLabel: "Auf Datenlecks prüfen",
    ctaHref: "/#demo-scanner",
  },
];

export const TOOL_SLUGS = TOOL_LANDINGS.map((t) => t.slug);

export function getToolBySlug(slug: string): ToolLanding | undefined {
  return TOOL_LANDINGS.find((t) => t.slug === slug);
}

export function getRelatedTools(slug: string): ToolLanding[] {
  const tool = getToolBySlug(slug);
  if (!tool) return [];
  return tool.relatedSlugs
    .map((s) => getToolBySlug(s))
    .filter((t): t is ToolLanding => Boolean(t));
}
