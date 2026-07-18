import type { AnalysisKey } from "@/lib/credits/pricing";
import type { AnalysisTier } from "@/lib/dashboard/analysis-center-data";
import type { RiskLevel } from "@/types/platform";

export interface DemoFinding {
  id: string;
  label: string;
  detail: string;
  severity: RiskLevel;
  /** Plain-language why this matters for beginners */
  whyItMatters: string;
  /** Concrete example lines shown when expanded */
  evidence: string[];
  sourceHint: string;
}

export interface DemoRecommendation {
  title: string;
  detail: string;
  priority: "Jetzt" | "Diese Woche" | "Optional";
}

export interface DemoAnalysisResult {
  id: AnalysisKey;
  title: string;
  tier: AnalysisTier;
  status: "completed" | "partial" | "queued";
  statusLabel: string;
  riskScore: number;
  riskLevel: RiskLevel;
  /** Short headline under the title */
  tagline: string;
  /** Overall plain-language summary */
  summary: string;
  /** ⓘ help for the whole report card */
  help: string;
  /** What the score means in everyday words */
  whatThisMeans: string;
  findings: DemoFinding[];
  recommendations: DemoRecommendation[];
}

const severityHelp: Record<RiskLevel, string> = {
  low: "Niedrig: meist unkritisch, aber gut zu wissen.",
  medium: "Mittel: sichtbar und potenziell missbrauchbar — zeitnah prüfen.",
  high: "Hoch: klares Risiko — bitte priorisiert handeln.",
};

export { severityHelp };

/** Complete demo catalogue — one realistic sample report per analysis type. */
export const demoAnalysisResults: DemoAnalysisResult[] = [
  {
    id: "google_search",
    title: "Google Suche",
    tier: "quick",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 58,
    riskLevel: "medium",
    tagline: "Was Suchmaschinen öffentlich über Sie zeigen",
    summary:
      "Zu Ihrem Namen gibt es mehrere öffentliche Treffer. Darunter sind unkritische Erwähnungen, aber auch Stellen, an denen E-Mail und Telefonnummer ohne Login sichtbar sind.",
    help: "Die Google-Suche zeigt nur öffentlich indexierte Seiten — also Inhalte, die jeder im Browser finden kann. Keine privaten Posteingänge oder Passwörter.",
    whatThisMeans:
      "Je mehr persönliche Daten auf offenen Webseiten stehen, desto leichter können Fremde Sie zuordnen. Das ist oft legal, aber nicht immer gewollt.",
    findings: [
      {
        id: "g-name",
        label: "Vollständiger Name in Suchtreffern",
        detail:
          "Ihr Vor- und Nachname erscheint konsistent auf mehreren öffentlichen Seiten.",
        severity: "low",
        whyItMatters:
          "Allein der Name ist meist harmlos. Zusammen mit Adresse oder Telefon wird er zum Identitäts-Anker.",
        evidence: [
          "Treffer 1: Firmen-Teamseite „Über uns“",
          "Treffer 2: Veranstaltungsankündigung 2023",
          "Treffer 3: Öffentliches Forum-Profil (älter)",
        ],
        sourceHint: "Öffentliche Websuche",
      },
      {
        id: "g-email",
        label: "E-Mail-Adresse öffentlich sichtbar",
        detail:
          "Eine geschäftliche E-Mail steht im Klartext auf einer Kontaktseite.",
        severity: "medium",
        whyItMatters:
          "Sichtbare E-Mails werden für Spam, Phishing und gezielte Betrugsversuche genutzt.",
        evidence: [
          "Gefunden auf: beispiel-firma.de/kontakt",
          "Format: vorname.nachname@beispiel-firma.de",
          "Ohne Login lesbar",
        ],
        sourceHint: "Kontaktseite / Impressum",
      },
      {
        id: "g-phone",
        label: "Telefonnummer in Branchenverzeichnis",
        detail:
          "Eine Festnetznummer ist in einem öffentlichen Verzeichnis gelistet.",
        severity: "medium",
        whyItMatters:
          "Öffentliche Nummern erleichtern unerwünschte Anrufe und Social Engineering.",
        evidence: [
          "Verzeichnis: Branchen-Eintrag „Dienstleistungen“",
          "Nummer teilweise mit Ortsvorwahl sichtbar",
          "Eintrag zuletzt aktualisiert: 2022 (Demo)",
        ],
        sourceHint: "Branchenverzeichnis",
      },
      {
        id: "g-web",
        label: "Webseiten mit Identitätsbezug",
        detail:
          "Zwei Domains und ein Impressum enthalten übereinstimmende Angaben.",
        severity: "low",
        whyItMatters:
          "Webseiten verknüpfen oft Name, Firma und Kontakt — das erhöht die Auffindbarkeit.",
        evidence: [
          "beispiel-firma.de — Impressum mit Namen",
          "projekt-archiv.example — alte Projektseite",
        ],
        sourceHint: "Öffentliche Domains",
      },
    ],
    recommendations: [
      {
        title: "Kontaktseiten bereinigen",
        detail:
          "Prüfen Sie, ob Privatdaten auf öffentlichen Seiten wirklich nötig sind. Oft reicht ein Formular statt Klartext-E-Mail.",
        priority: "Jetzt",
      },
      {
        title: "Alte Branchen-Einträge aktualisieren",
        detail:
          "Veraltete Einträge löschen oder korrigieren lassen, wenn die Nummer nicht mehr aktuell ist.",
        priority: "Diese Woche",
      },
      {
        title: "Private und berufliche Kontakte trennen",
        detail:
          "Nutzen Sie getrennte E-Mails für privat und beruflich, damit Treffer weniger vermischen.",
        priority: "Optional",
      },
    ],
  },
  {
    id: "phone_analysis",
    title: "Telefonnummer",
    tier: "quick",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 64,
    riskLevel: "medium",
    tagline: "Wo Ihre Nummer öffentlich auftaucht",
    summary:
      "Ihre Nummer wurde in einem Verzeichnis und auf einer älteren Kontaktseite gefunden. Kein Hinweis auf ein aktuelles Datenleck der Nummer selbst.",
    help: "Diese Analyse prüft öffentliche Quellen — nicht, ob jemand Ihre Anrufe mithört. Sie zeigt, wo die Nummer für jeden sichtbar ist.",
    whatThisMeans:
      "Wenn Ihre Nummer leicht gefunden wird, steigen Spam-Anrufe und das Risiko, dass Betrüger Sie persönlich ansprechen.",
    findings: [
      {
        id: "p-dir",
        label: "Eintrag in öffentlichem Verzeichnis",
        detail: "Nummer ist mit Name und Ort verknüpft gelistet.",
        severity: "medium",
        whyItMatters:
          "Verzeichnisse sind eine typische Quelle für Werbeanrufe und Datenhändler.",
        evidence: [
          "Ort: Musterstadt (Demo)",
          "Zuordnung: Name + Festnetz",
          "Sichtbarkeit: ohne Login",
        ],
        sourceHint: "Telefonverzeichnis",
      },
      {
        id: "p-web",
        label: "Nummer auf Webseite",
        detail: "Alte Kontaktseite zeigt die Nummer im Footer.",
        severity: "low",
        whyItMatters:
          "Auch vergessene Seiten bleiben jahrelang in Suchmaschinen.",
        evidence: ["URL: archiv.beispiel-firma.de/kontakt", "Format: Klartext"],
        sourceHint: "Webseite",
      },
    ],
    recommendations: [
      {
        title: "Verzeichnis-Opt-out prüfen",
        detail:
          "Viele Verzeichnisse bieten eine Löschung oder Einschränkung der Anzeige.",
        priority: "Jetzt",
      },
      {
        title: "Alte Kontaktseiten entfernen",
        detail:
          "Bitten Sie den Seitenbetreiber, veraltete Nummern zu streichen.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "email_analysis",
    title: "Email Analyse",
    tier: "quick",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 76,
    riskLevel: "high",
    tagline: "Öffentliche Sichtbarkeit und Leak-Hinweise",
    summary:
      "Ihre E-Mail ist öffentlich auf einer Webseite sichtbar und taucht zusätzlich in einem historischen Leak-Datensatz auf. Das ist eines der häufigsten und wichtigsten Risiken.",
    help: "„Leak“ bedeutet: Bei einem gehackten Dienst wurden Daten irgendwann veröffentlicht oder verkauft. SynSight zeigt Hinweise — keine Garantie, dass Ihr aktuelles Passwort betroffen ist.",
    whatThisMeans:
      "Wenn E-Mail + altes Passwort irgendwo geleakt wurden, versuchen Angreifer oft dieselben Zugangsdaten bei anderen Diensten (Passwort-Recycling).",
    findings: [
      {
        id: "e-public",
        label: "E-Mail im Klartext online",
        detail: "Adresse steht auf einer öffentlichen Kontaktseite.",
        severity: "medium",
        whyItMatters: "Erleichtert Spam und gezielte Phishing-Mails.",
        evidence: [
          "Gefunden auf Kontaktseite",
          "Keine Captcha-/Form-Absicherung",
        ],
        sourceHint: "Web",
      },
      {
        id: "e-leak",
        label: "Treffer in bekanntem Leak-Datensatz",
        detail:
          "Die Adresse erscheint in einem älteren Kompromittierungsbericht (Demo-Daten).",
        severity: "high",
        whyItMatters:
          "Angreifer testen geleakte Passwörter systematisch bei Mail, Cloud und Banking.",
        evidence: [
          "Datensatz: historischer Dienst-Leak (Demo)",
          "Jahr des Vorfalls: 2019 (Beispiel)",
          "Enthaltene Felder typischerweise: E-Mail, Passwort-Hash",
        ],
        sourceHint: "Leak Intelligence",
      },
    ],
    recommendations: [
      {
        title: "Passwort sofort ändern",
        detail:
          "Ändern Sie das Passwort der betroffenen Adresse und aktivieren Sie 2FA (Zwei-Faktor-Anmeldung).",
        priority: "Jetzt",
      },
      {
        title: "Passwort-Recycling prüfen",
        detail:
          "Nutzen Sie nirgends dasselbe Passwort erneut — besonders nicht für Mail und Banking.",
        priority: "Jetzt",
      },
      {
        title: "Öffentliche Klartext-Adresse reduzieren",
        detail: "Kontaktformular statt sichtbarer E-Mail auf Webseiten.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "website_analysis",
    title: "Website Analyse",
    tier: "quick",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 42,
    riskLevel: "medium",
    tagline: "Webseiten, die Ihre Daten nennen",
    summary:
      "Es wurden öffentliche Seiten gefunden, die Name und Firma verknüpfen. Sensible Privatdaten waren auf den geprüften Seiten nicht im Klartext.",
    help: "Geprüft werden öffentlich erreichbare Seiten und Impressen — keine gehackten Server.",
    whatThisMeans:
      "Webseiten sind oft die „Visitenkarte“ Ihrer digitalen Identität. Veraltete Seiten können unnötige Spuren hinterlassen.",
    findings: [
      {
        id: "w-impressum",
        label: "Impressum mit Namensnennung",
        detail: "Gesetzliches Impressum nennt Vor- und Nachnamen.",
        severity: "low",
        whyItMatters:
          "Impressen sind oft Pflicht — dennoch sollten keine zusätzlichen Privatdaten dort stehen.",
        evidence: [
          "Seite: beispiel-firma.de/impressum",
          "Genannt: Name, Geschäftsadresse",
        ],
        sourceHint: "Impressum",
      },
      {
        id: "w-team",
        label: "Team-/About-Seite",
        detail: "Profiltext mit Rolle und Firmen-E-Mail.",
        severity: "medium",
        whyItMatters:
          "Teamseiten sind eine häufige Quelle für gezielte Bewerbungs- und Betrugsmails.",
        evidence: ["Rolle: Projektleitung (Demo)", "E-Mail im Profilblock"],
        sourceHint: "Unternehmenswebsite",
      },
    ],
    recommendations: [
      {
        title: "Nur notwendige Kontaktdaten zeigen",
        detail:
          "Auf Teamseiten oft Funktionsmailbox statt persönlicher Adresse verwenden.",
        priority: "Diese Woche",
      },
      {
        title: "Alte Projektseiten offline nehmen",
        detail: "Nicht mehr genutzte Auftritte archivieren oder löschen.",
        priority: "Optional",
      },
    ],
  },
  {
    id: "domain_analysis",
    title: "Domain Analyse",
    tier: "quick",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 39,
    riskLevel: "low",
    tagline: "Öffentliche Spuren Ihrer Domains",
    summary:
      "Für die geprüfte Domain sind öffentlich übliche Registrierungs- und Web-Signale sichtbar. Kein kritisches Missbrauchssignal im Demo-Stand.",
    help: "Domains können Eigentümer- oder Technik-Hinweise offenlegen (z. B. über Whois/Impressum). SynSight zeigt nur öffentlich erkennbare Punkte.",
    whatThisMeans:
      "Eine Domain gehört zu Ihrer digitalen Adresse im Netz. Öffentliche Zuordnungen helfen anderen, Firma und Person zu verbinden.",
    findings: [
      {
        id: "d-reg",
        label: "Domain öffentlich zuordenbar",
        detail: "Impressum und Domainname passen zur genannten Firma.",
        severity: "low",
        whyItMatters:
          "Das ist oft gewollt — prüfen Sie trotzdem, ob Privatadresse statt Firmensitz steht.",
        evidence: [
          "Domain: beispiel-firma.de",
          "Zuordnung über Impressum bestätigt",
        ],
        sourceHint: "Domain / Impressum",
      },
      {
        id: "d-mail",
        label: "Mail-Host sichtbar",
        detail: "Öffentliche MX-Hinweise zeigen einen gängigen Mailanbieter.",
        severity: "low",
        whyItMatters:
          "Technik-Details allein sind selten kritisch, helfen aber bei gezielten Angriffen auf die Infrastruktur.",
        evidence: ["Mailanbieter: gängiger Business-Host (Demo)"],
        sourceHint: "DNS öffentlich",
      },
    ],
    recommendations: [
      {
        title: "Whois-/Inhaberdaten prüfen",
        detail:
          "Wo möglich Privacy-Schutz beim Registrar nutzen, wenn Privatadresse sonst öffentlich wäre.",
        priority: "Optional",
      },
      {
        title: "Impressum auf Firmensitz halten",
        detail: "Keine private Wohnadresse in öffentlichen Domain-Angaben.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "alias_analysis",
    title: "Alias Analyse",
    tier: "advanced",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 51,
    riskLevel: "medium",
    tagline: "Benutzernamen, die zu Ihnen passen könnten",
    summary:
      "Zwei Aliase tauchen auf älteren Foren- und Profilseiten auf und lassen sich plausibel Ihrer Identität zuordnen.",
    help: "Aliase sind Spitznamen oder Usernames. Auch Jahre später können sie Profile und Beiträge miteinander verbinden.",
    whatThisMeans:
      "Alte Nicknames sind oft die Brücke zwischen „vergessenen“ Konten und Ihrem heutigen Namen.",
    findings: [
      {
        id: "a-forum",
        label: "Alias in Forum-Archiv",
        detail: "Username „alex.m.demo“ in einem öffentlichen Thread.",
        severity: "medium",
        whyItMatters:
          "Forenbeiträge können Meinungen, Standorte oder Arbeitgeber preisgeben.",
        evidence: [
          "Alias: alex.m.demo",
          "Kontext: Technik-Forum 2018 (Demo)",
          "Beitrag öffentlich indexiert",
        ],
        sourceHint: "Forum",
      },
      {
        id: "a-reuse",
        label: "Gleicher Alias auf zweiter Plattform",
        detail: "Derselbe Username auf einer Portfolio-Seite.",
        severity: "low",
        whyItMatters:
          "Wiederverwendete Aliase erleichtern die Verkettung von Profilen.",
        evidence: ["Portfolio-URL mit gleichem Handle"],
        sourceHint: "Webprofil",
      },
    ],
    recommendations: [
      {
        title: "Alte Forum-Konten schließen",
        detail: "Nicht genutzte Konten löschen oder Beiträge anonymisieren.",
        priority: "Diese Woche",
      },
      {
        title: "Einheitliche, aber getrennte Handles",
        detail:
          "Für sensible Themen andere Usernames als im Berufsnetzwerk nutzen.",
        priority: "Optional",
      },
    ],
  },
  {
    id: "social_media",
    title: "Social Media Analyse",
    tier: "advanced",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 55,
    riskLevel: "medium",
    tagline: "Öffentliche Profile und Verbindungen",
    summary:
      "Es wurden öffentliche Profile gefunden. Ein älteres Konto ist noch indexiert; Bio-Links führen auf dieselbe Firmen-Domain.",
    help: "Geprüft werden nur öffentlich sichtbare Profilinformationen — keine privaten Nachrichten und keine Freundeslisten hinter Login.",
    whatThisMeans:
      "Social Media ist oft die reichhaltigste öffentliche Quelle: Fotos, Arbeitgeber, Stadt, Interessen.",
    findings: [
      {
        id: "s-active",
        label: "Aktives öffentliches Profil",
        detail: "Berufliches Netzwerk-Profil mit Klarnamen.",
        severity: "low",
        whyItMatters:
          "Berufliche Sichtbarkeit ist oft gewollt — prüfen Sie trotzdem Kontakt- und Foto-Einstellungen.",
        evidence: [
          "Netzwerk: beruflich (Demo)",
          "Sichtbare Felder: Name, Rolle, Firma",
        ],
        sourceHint: "Social Profil",
      },
      {
        id: "s-old",
        label: "Inaktives, aber öffentliches Konto",
        detail: "Profil ohne Aktivität seit Jahren, weiterhin öffentlich.",
        severity: "medium",
        whyItMatters:
          "Verwaiste Konten werden gerne für Identitätsdiebstahl oder Fake-Profile missbraucht.",
        evidence: [
          "Letzte Aktivität: 2019 (Demo)",
          "Profilbild und Bio noch sichtbar",
        ],
        sourceHint: "Social Archiv",
      },
      {
        id: "s-link",
        label: "Bio-Link zur Firmendomain",
        detail: "Öffentlicher Link verbindet Social-Profil und Website.",
        severity: "low",
        whyItMatters: "Erleichtert die Zuordnung Person ↔ Unternehmen.",
        evidence: ["Linkziel: beispiel-firma.de"],
        sourceHint: "Profil-Bio",
      },
    ],
    recommendations: [
      {
        title: "Altes Konto löschen oder privatisieren",
        detail: "Nicht genutzte Profile schließen — besonders mit Fotos.",
        priority: "Jetzt",
      },
      {
        title: "Privatsphäre-Check im aktiven Profil",
        detail:
          "Geburtsdatum, Privatnummer und Wohnadresse nicht öffentlich lassen.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "person_search",
    title: "Personensuche",
    tier: "advanced",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 61,
    riskLevel: "medium",
    tagline: "Zusammengeführte Spuren zu Ihrer Person",
    summary:
      "Mehrere öffentliche Signale (Name, Firma, Alias) lassen sich zu einem konsistenten Personenbild verbinden. Kein Nachweis kritischer Straf- oder Finanzdaten im Demo.",
    help: "Die Personensuche bündelt Treffer aus mehreren öffentlichen Quellen. Sie ersetzt keine behördliche Auskunft und zeigt keine geheimen Register.",
    whatThisMeans:
      "Statt einzelner Puzzle-Teile sehen Sie, wie leicht sich aus öffentlichen Infos ein Gesamtbild zusammensetzen lässt.",
    findings: [
      {
        id: "ps-cluster",
        label: "Identitäts-Cluster erkannt",
        detail: "Name + Firma + Domain treten gemeinsam auf.",
        severity: "medium",
        whyItMatters:
          "Je mehr Merkmale zusammenpassen, desto sicherer ist die Zuordnung für Dritte.",
        evidence: [
          "Merkmale: Name, Arbeitgeber, Domain",
          "Konfidenz: hoch (Demo-Heuristik)",
        ],
        sourceHint: "Korrelation",
      },
      {
        id: "ps-mentions",
        label: "Öffentliche Erwähnungen",
        detail: "Zwei Event-/Presse-Erwähnungen mit Klarnamen.",
        severity: "low",
        whyItMatters: "Erwähnungen erhöhen die Auffindbarkeit über Jahre.",
        evidence: ["Event-Seite 2022", "Branchen-Newsletter-Archiv"],
        sourceHint: "Erwähnungen",
      },
    ],
    recommendations: [
      {
        title: "Gesamtbild einmal bewusst prüfen",
        detail:
          "Google Ihren eigenen Namen in einem privaten Browserfenster und vergleichen Sie mit diesem Report.",
        priority: "Diese Woche",
      },
      {
        title: "Widersprüchliche Altprofile bereinigen",
        detail: "Veraltete Angaben auf einen Stand bringen oder entfernen.",
        priority: "Optional",
      },
    ],
  },
  {
    id: "reverse_image_search",
    title: "Reverse Image Search",
    tier: "advanced",
    status: "partial",
    statusLabel: "Beispiel mit Referenzbildern",
    riskScore: 47,
    riskLevel: "medium",
    tagline: "Wo ähnliche Bilder öffentlich vorkommen",
    summary:
      "Zu den Referenzbildern gab es zwei ähnliche öffentliche Treffer: ein Firmenprofil und ein Event-Foto. Kein Treffer auf dubiosen Marktplätzen im Demo.",
    help: "Reverse Image Search sucht nach ähnlichen Bildern im öffentlichen Netz. Sie braucht Ihre Referenzfotos im Identitätsprofil.",
    whatThisMeans:
      "Fotos können ohne Ihr Wissen weiterverwendet werden — z. B. auf alten Profilen oder Event-Seiten.",
    findings: [
      {
        id: "ri-profile",
        label: "Ähnliches Bild auf Profilseite",
        detail: "Hohe Ähnlichkeit zu einem beruflichen Profilbild.",
        severity: "low",
        whyItMatters:
          "Meist legitim — prüfen Sie, ob das Profil noch Ihnen gehört und aktuell ist.",
        evidence: ["Ähnlichkeit: hoch (Demo)", "Kontext: Unternehmensprofil"],
        sourceHint: "Bildtreffer",
      },
      {
        id: "ri-event",
        label: "Event-Foto mit Gesicht",
        detail: "Öffentliche Veranstaltungsgalerie mit erkennbarem Gesicht.",
        severity: "medium",
        whyItMatters:
          "Event-Fotos sind oft schwer zu entfernen und lange online.",
        evidence: [
          "Galerie: Branchen-Event 2021 (Demo)",
          "Gesicht ohne Blur erkennbar",
        ],
        sourceHint: "Bildsuche",
      },
    ],
    recommendations: [
      {
        title: "Referenzbilder vollständig halten",
        detail:
          "Vier Ansichten im Identitätsprofil verbessern spätere Trefferqualität.",
        priority: "Jetzt",
      },
      {
        title: "Entfernung bei unerwünschten Fotos anfragen",
        detail:
          "Veranstalter oder Seitenbetreiber um Löschung oder Unkenntlichmachung bitten.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "ai_summary",
    title: "KI-Zusammenfassung",
    tier: "advanced",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 63,
    riskLevel: "medium",
    tagline: "Alles Wichtige in Alltagssprache",
    summary:
      "Gesamteinschätzung: mittlere Exposition. Die dringendsten Punkte sind die E-Mail in einem Leak-Hinweis und die öffentlich sichtbare Telefonnummer. Social- und Web-Spuren sind vorhanden, aber beherrschbar.",
    help: "Die KI-Zusammenfassung verdichtet andere Analyseergebnisse. Sie erfindet keine geheimen Daten — sie priorisiert, was bereits gefunden wurde.",
    whatThisMeans:
      "Statt zehn Einzelberichten bekommen Sie eine Rangliste: Was ist wichtig, was kann warten.",
    findings: [
      {
        id: "ai-top1",
        label: "Top-Risiko: E-Mail-Leak-Hinweis",
        detail: "Höchste Priorität laut Zusammenfassung.",
        severity: "high",
        whyItMatters:
          "Passwort- und Kontoübernahme sind das häufigste Folgeproblem.",
        evidence: [
          "Ableitung aus Email Analyse",
          "Empfohlene Aktion: Passwort + 2FA",
        ],
        sourceHint: "KI-Priorisierung",
      },
      {
        id: "ai-top2",
        label: "Zweites Risiko: öffentliche Telefonnummer",
        detail: "Mittlere Priorität, klarer Handlungshebel.",
        severity: "medium",
        whyItMatters: "Reduziert Spam und gezielte Anrufe spürbar.",
        evidence: ["Ableitung aus Telefonnummer-Analyse"],
        sourceHint: "KI-Priorisierung",
      },
      {
        id: "ai-ok",
        label: "Weniger kritisch: Domain-/Impressum-Spuren",
        detail: "Erwartbare Geschäftssichtbarkeit.",
        severity: "low",
        whyItMatters: "Oft unvermeidbar und rechtlich üblich.",
        evidence: ["Ableitung aus Website/Domain Analyse"],
        sourceHint: "KI-Priorisierung",
      },
    ],
    recommendations: [
      {
        title: "Zuerst Leak-Maßnahmen",
        detail: "Passwort wechseln, 2FA, Passwort-Manager.",
        priority: "Jetzt",
      },
      {
        title: "Dann Sichtbarkeit reduzieren",
        detail: "Telefon/E-Mail in Verzeichnissen und Altseiten bereinigen.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "pdf_report",
    title: "PDF Report",
    tier: "advanced",
    status: "completed",
    statusLabel: "Beispiel-Export bereit",
    riskScore: 40,
    riskLevel: "low",
    tagline: "Exportierbarer Bericht Ihrer Ergebnisse",
    summary:
      "Der Demo-PDF-Export fasst Status, Top-Funde und Empfehlungen auf übersichtlichen Seiten zusammen — geeignet für Unterlagen oder Beratung.",
    help: "Der PDF-Report ist kein eigener Scan, sondern ein Export. Er enthält nur Ergebnisse, die bereits vorliegen.",
    whatThisMeans:
      "Sie können den Bericht speichern, drucken oder mit einer vertrauenswürdigen Person teilen.",
    findings: [
      {
        id: "pdf-cover",
        label: "Deckblatt mit Risiko-Score",
        detail: "Gesamtscore und Datum der Auswertung.",
        severity: "low",
        whyItMatters: "Schneller Einstieg für Leser ohne Vorwissen.",
        evidence: [
          "Seite 1: Score + Kurzfazit",
          "Hinweis: Demo-Daten gekennzeichnet",
        ],
        sourceHint: "Export",
      },
      {
        id: "pdf-actions",
        label: "Maßnahmenliste enthalten",
        detail: "Priorisierte To-dos als Checkliste.",
        severity: "low",
        whyItMatters: "Macht den Bericht handlungsfähig statt nur informativ.",
        evidence: ["Seite 3–4: Empfehlungen mit Priorität"],
        sourceHint: "Export",
      },
    ],
    recommendations: [
      {
        title: "Report sicher ablegen",
        detail:
          "Nicht öffentlich teilen — der Bericht enthält persönliche Expositionshinweise.",
        priority: "Jetzt",
      },
      {
        title: "Nach echten Analysen erneut exportieren",
        detail: "Demo-PDFs später durch Live-Ergebnisse ersetzen.",
        priority: "Optional",
      },
    ],
  },
  {
    id: "deep_intelligence",
    title: "Deep Intelligence Analyse",
    tier: "premium",
    status: "completed",
    statusLabel: "Beispiel-Report bereit",
    riskScore: 72,
    riskLevel: "high",
    tagline: "Tiefe Korrelation über mehrere Quellen",
    summary:
      "Mehrere unabhängige Quellen stützen dieselbe Identitätszuordnung. Die Kombination aus Leak-Hinweis, öffentlicher Telefonnummer und Social-Altprofil ergibt ein erhöhtes Gesamtrisiko.",
    help: "Deep Intelligence verknüpft Ergebnisse. Ein einzelner Treffer kann harmlos sein — die Kombination macht das Risiko oft erst sichtbar.",
    whatThisMeans:
      "Angreifer denken in Zusammenhängen. Diese Analyse zeigt, wie Ihre öffentlichen Puzzleteile zusammengesetzt werden können.",
    findings: [
      {
        id: "di-link",
        label: "Querverbindung E-Mail ↔ Telefon ↔ Name",
        detail: "Drei Merkmale treten in getrennten Quellen gemeinsam auf.",
        severity: "high",
        whyItMatters:
          "Je mehr Merkmale verknüpft sind, desto glaubwürdiger wirken Phishing und Impersonation.",
        evidence: [
          "E-Mail aus Leak-Hinweis",
          "Telefon aus Verzeichnis",
          "Name aus Web/Social",
        ],
        sourceHint: "Multi-Source",
      },
      {
        id: "di-old",
        label: "Altprofil als Angriffsfläche",
        detail: "Inaktives Social-Konto mit erkennbarem Bild.",
        severity: "medium",
        whyItMatters: "Ideal für Fake-Profile unter Ihrem Namen.",
        evidence: ["Profil seit Jahren inaktiv", "Bild öffentlich"],
        sourceHint: "Social + Bild",
      },
    ],
    recommendations: [
      {
        title: "Kritische Konten absichern",
        detail: "Mail, Cloud, Banking: starke einzigartige Passwörter + 2FA.",
        priority: "Jetzt",
      },
      {
        title: "Altprofile und Verzeichnisse bereinigen",
        detail: "Öffentliche Angriffsfläche systematisch verkleinern.",
        priority: "Jetzt",
      },
      {
        title: "Monitoring aktiv lassen",
        detail: "Nach der Bereinigung erneut prüfen, ob Treffer verschwinden.",
        priority: "Diese Woche",
      },
    ],
  },
  {
    id: "full_identity_analysis",
    title: "Komplette Digitale Identitätsanalyse",
    tier: "premium",
    status: "completed",
    statusLabel: "Beispiel-Gesamtbericht",
    riskScore: 68,
    riskLevel: "medium",
    tagline: "Rundumblick über Ihre digitale Sichtbarkeit",
    summary:
      "Gesamtbild: Sie sind online klar zuordenbar. Die größten Hebel sind Leak-Hinweise zur E-Mail, öffentliche Telefonnummer und ein verwaistes Social-Konto. Geschäftliche Web-/Domain-Sichtbarkeit ist erwartbar.",
    help: "Das Komplettpaket fasst die wichtigsten Modul-Ergebnisse zusammen. Ideal, wenn Sie nicht wissen, womit Sie starten sollen.",
    whatThisMeans:
      "Sie erhalten eine Landkarte: wo Sie sichtbar sind, was riskant ist, und in welcher Reihenfolge Sie handeln sollten.",
    findings: [
      {
        id: "fi-overview",
        label: "Sichtbarkeit: klar zuordenbar",
        detail: "Name, Firma und Kontakte lassen sich öffentlich verbinden.",
        severity: "medium",
        whyItMatters:
          "Das ist der Ausgangspunkt für gezielte Angriffe und unerwünschte Kontaktaufnahme.",
        evidence: [
          "Module: Google, Website, Social, Personensuche",
          "Bewertung: mittlere bis hohe Exposition",
        ],
        sourceHint: "Gesamtbild",
      },
      {
        id: "fi-critical",
        label: "Kritischer Cluster: E-Mail + Telefon",
        detail:
          "Zwei direkt missbrauchbare Kontaktdaten sind öffentlich bzw. geleakt.",
        severity: "high",
        whyItMatters: "Das sind die häufigsten Einstiege für Betrug.",
        evidence: [
          "Email Analyse: Leak-Hinweis",
          "Telefonnummer: Verzeichnistreffer",
        ],
        sourceHint: "Gesamtbild",
      },
      {
        id: "fi-hygiene",
        label: "Hygiene-Thema: Altprofil",
        detail: "Inaktives Social-Konto weiterhin öffentlich.",
        severity: "medium",
        whyItMatters: "Schneller Win: Konto schließen reduziert Risiko sofort.",
        evidence: ["Social Media Analyse"],
        sourceHint: "Gesamtbild",
      },
    ],
    recommendations: [
      {
        title: "Sicherheits-Sprint (48 Stunden)",
        detail:
          "Passwörter kritischer Konten ändern, 2FA aktivieren, Altprofil schließen.",
        priority: "Jetzt",
      },
      {
        title: "Sichtbarkeits-Sprint (diese Woche)",
        detail:
          "Verzeichnis-Eintrag und Klartext-Kontakte auf Webseiten bereinigen.",
        priority: "Diese Woche",
      },
      {
        title: "Kontrolle in 30 Tagen",
        detail:
          "Personensuche oder Komplettpaket erneut laufen lassen und Fortschritt vergleichen.",
        priority: "Optional",
      },
    ],
  },
];

export function getResultsOverview(results: DemoAnalysisResult[]) {
  const findingsTotal = results.reduce(
    (sum, result) => sum + result.findings.length,
    0
  );
  const openRecommendations = results.reduce(
    (sum, result) => sum + result.recommendations.length,
    0
  );
  return {
    analysesRun: results.length,
    findingsTotal,
    openRecommendations,
    lastUpdatedLabel: "Beispielinhalte · keine Live-Pipeline",
  };
}

export function getDemoResultById(id: string): DemoAnalysisResult | undefined {
  return demoAnalysisResults.find((result) => result.id === id);
}
