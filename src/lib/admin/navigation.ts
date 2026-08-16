export type AdminSectionId =
  | "benutzer"
  | "analysen"
  | "website"
  | "integrationen"
  | "geschaeft"
  | "support"
  | "system"
  | "newsletter";

export interface AdminNavItem {
  slug: string;
  label: string;
  description: string;
  help: string;
  view: string;
  group?: string;
}

export interface AdminSectionConfig {
  id: AdminSectionId;
  title: string;
  description: string;
  href: string;
  icon: string;
  defaultSlug: string;
  sidebarCode: string;
  items: AdminNavItem[];
}

export const ADMIN_SECTIONS: AdminSectionConfig[] = [
  {
    id: "benutzer",
    title: "Benutzer & Konten",
    sidebarCode: "A1",
    description:
      "Benutzerkonten, Profile, SynCredits und Kontostatus zentral verwalten.",
    href: "/admin/benutzer",
    defaultSlug: "uebersicht",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    items: [
      {
        group: "Konten",
        slug: "uebersicht",
        label: "Benutzerübersicht",
        description:
          "Registrierungen, Verifizierung, Sitzungen und SynCredits auf einen Blick.",
        help: "Startpunkt für alle benutzerbezogenen Kennzahlen. Hier werden keine Website- oder Systemeinstellungen verändert.",
        view: "user-overview",
      },
      {
        group: "Konten",
        slug: "verwaltung",
        label: "Benutzerverwaltung",
        description:
          "Konten suchen, sortieren und vollständige Benutzerprofile öffnen.",
        help: "Verwaltung einzelner Kundenkonten und Profile. Für technische Systemeinstellungen ist dieser Bereich nicht zuständig.",
        view: "user-management",
      },
      {
        group: "Zugriff",
        slug: "rollen",
        label: "Rollen & Berechtigungen",
        description:
          "Benutzer-, Support-, Worker- und Administratorrollen verwalten.",
        help: "Rollen steuern den Zugriff auf interne Bereiche. Rollenänderungen beenden bestehende Sitzungen automatisch.",
        view: "user-access",
      },
      {
        group: "Zugriff",
        slug: "verifizierung",
        label: "E-Mail-Verifizierung",
        description:
          "Offene Verifizierungen prüfen, erneut senden oder manuell bestätigen.",
        help: "Nur für Konten, deren E-Mail noch nicht bestätigt wurde. Manuelle Verifizierung sollte nur nach eindeutiger Prüfung verwendet werden.",
        view: "user-verification",
      },
      {
        group: "Sicherheit",
        slug: "gesperrt",
        label: "Gesperrte Konten",
        description: "Konten anzeigen, die aktuell als gesperrt markiert sind.",
        help: "Zeigt derzeit Benutzer mit Status suspended. Gelöschte Datensätze werden nicht fälschlich als gesperrte Konten bezeichnet.",
        view: "user-blocked",
      },
      {
        group: "Guthaben",
        slug: "gutschriften",
        label: "SynCredits & Gutschriften",
        description:
          "SynCredits manuell gutschreiben oder abbuchen und Änderungen nachvollziehen.",
        help: "Für manuelle Guthabenänderungen einzelner Benutzer. Preise der Analysen werden unter Geschäft & Finanzen verwaltet.",
        view: "user-credits-adjust",
      },
    ],
  },

  {
    id: "analysen",
    title: "Analysen & Module",
    sidebarCode: "A2",
    description:
      "Analysefunktionen aktivieren und ihre technischen Laufzeitparameter konfigurieren.",
    href: "/admin/analysen",
    defaultSlug: "uebersicht",
    icon: "M4 6h16M4 12h16M4 18h16",
    items: [
      {
        group: "Module",
        slug: "uebersicht",
        label: "Modulübersicht",
        description:
          "Alle Analysefunktionen zentral aktivieren oder deaktivieren.",
        help: "Hier wird ausschließlich gesteuert, welche Analyseprodukte verfügbar sind. Preise befinden sich unter Geschäft & Finanzen.",
        view: "analysis-overview",
      },
      {
        group: "Einstellungen",
        slug: "username",
        label: "Username Intelligence",
        description:
          "Suchumfang, Länder, Sprache, Ergebnislimit und Confidence konfigurieren.",
        help: "Technische Einstellungen des Username Intelligence Scan. SynCredits und Wirtschaftlichkeit werden unter Geschäft & Finanzen verwaltet.",
        view: "analysis-username",
      },
      {
        group: "Einstellungen",
        slug: "digital-leak",
        label: "Digital Leak & Exposure",
        description:
          "Aufbewahrung und technische Einstellungen des Leak-Moduls verwalten.",
        help: "Hier werden ausschließlich technische und datenschutzbezogene Laufzeitparameter des Digital Leak & Exposure Scan verwaltet.",
        view: "analysis-digital-leak",
      },
      {
        group: "Einstellungen",
        slug: "reverse-image",
        label: "Reverse Image & Face",
        description:
          "Bildersuche, Relevanzfilter, Face-Vergleich und Serverparameter konfigurieren.",
        help: "Technische Einstellungen für Public Image Exposure und Face Identity. Preise und API-Kosten befinden sich unter Geschäft & Finanzen.",
        view: "analysis-reverse-image",
      },
    ],
  },

  {
    id: "website",
    title: "Website & Inhalte",
    sidebarCode: "A3",
    description:
      "Öffentliche Inhalte, SEO-Wissensseiten und Medien der SynSight-Website verwalten.",
    href: "/admin/website",
    defaultSlug: "wissen",
    icon: "M3 5h18v14H3V5zm4 4h10M7 13h7",
    items: [
      {
        group: "Inhalte",
        slug: "wissen",
        label: "SEO & Wissensseiten",
        description:
          "Wissensartikel erstellen, mit Gemini vorbereiten und veröffentlichen.",
        help: "SEO Content Center für öffentliche /wissen/-Seiten. Hier gehören redaktionelle Inhalte hin, nicht Server- oder API-Einstellungen.",
        view: "seo-knowledge-list",
      },
      {
        group: "Inhalte",
        slug: "papierkorb",
        label: "Papierkorb",
        description:
          "Gelöschte Wissensseiten wiederherstellen oder endgültig entfernen.",
        help: "Soft-gelöschte SEO-/Wissensseiten. Inhalte können vor der endgültigen Löschung wiederhergestellt werden.",
        view: "seo-knowledge-trash",
      },
      {
        group: "Medien",
        slug: "medien",
        label: "Bilder & Uploads",
        description:
          "Upload-Limits, Bildqualität, WebP, Thumbnails und Originaldateien.",
        help: "Technische Bild-Pipeline für Website und Analysen. API-Server-Adressen und externe Dienste gehören nicht hierher.",
        view: "website-images",
      },
      {
        group: "Website",
        slug: "kontakt-email",
        label: "Kontakt & E-Mail",
        description:
          "Öffentliche Kontaktadressen und Zielpostfächer der Website-Formulare verwalten.",
        help: "Hier werden Kontakt-, Support-, Presse-, Partnerschafts- und Datenschutzadressen zentral gepflegt. Eingegangene Nachrichten werden unter Support & Kommunikation bearbeitet.",
        view: "website-contact-settings",
      },
    ],
  },

  {
    id: "integrationen",
    title: "APIs & Integrationen",
    sidebarCode: "A4",
    description:
      "Externe Dienste, API-Schlüssel, Suchanbieter und Verbindungstests verwalten.",
    href: "/admin/integrationen",
    defaultSlug: "api",
    icon: "M8 12h8M12 8v8M5 5l14 14M19 5L5 19",
    items: [
      {
        group: "Anbieter",
        slug: "api",
        label: "API-Zugänge & Verbindungstests",
        description:
          "SerpAPI, Gemini, DeHashed, DemoScanner und weitere externe Dienste.",
        help: "Hier werden Zugangsdaten und Verbindungen gepflegt und getestet. Kosten dieser Anbieter werden getrennt unter Geschäft & Finanzen erfasst.",
        view: "website-api",
      },
    ],
  },

  {
    id: "geschaeft",
    title: "Geschäft & Finanzen",
    sidebarCode: "A5",
    description:
      "Einnahmen, Preise, SynCredits, API-Kosten, Werbung, Zahlungsanbieter und Promotionen.",
    href: "/admin/geschaeft",
    defaultSlug: "uebersicht",
    icon: "M12 1v22M5 8h14M5 16h14",
    items: [
      {
        group: "Überblick",
        slug: "uebersicht",
        label: "Einnahmen & Ausgaben",
        description:
          "Finanzentwicklung, Zahlungen und API-Ausgaben im Überblick.",
        help: "Finanz-Dashboard. Zeiträume werden eindeutig gekennzeichnet, damit 14-Tage-Werte nicht mit Gesamtwerten verwechselt werden.",
        view: "finance-overview",
      },
      {
        group: "Preise",
        slug: "preise",
        label: "Preise & SynCredits",
        description:
          "Analysepreise, Auftragspreise und SynCredit-Pakete verwalten.",
        help: "Hier wird festgelegt, was Kunden bezahlen. Technische API-Kosten werden getrennt unter API-Kosten & Wirtschaftlichkeit gepflegt.",
        view: "marketing-pricing",
      },
      {
        group: "Kosten",
        slug: "api-kosten",
        label: "API-Kosten & Wirtschaftlichkeit",
        description:
          "SerpAPI-, Gemini- und andere API-Kosten sowie Modul-Wirtschaftlichkeit prüfen.",
        help: "Token- und Request-Kosten, Einzelereignisse und Kalkulation. Username Intelligence wird hier integriert angezeigt und nicht mehr als doppelte Menüseite geführt.",
        view: "finance-api-costs",
      },
      {
        group: "Marketing",
        slug: "werbung",
        label: "Werbung & Kampagnen",
        description:
          "Google-, Social-Media- und sonstige Werbekampagnen, Budgets, Kosten und Performance verwalten.",
        help: "Zentrales Ads Command Center für Kampagnen, Tageskosten, Klicks, Conversions, CPA und ROAS. Werbeausgaben fließen automatisch in die Finanzübersicht ein.",
        view: "finance-advertising",
      },
      {
        group: "Zahlungen",
        slug: "zahlungsanbieter",
        label: "Zahlungsanbieter",
        description:
          "Zahlungsanbieter, Test-/Live-Modus und verschlüsselte Zugangsdaten.",
        help: "Konfiguration von Stripe, PayPal und zukünftigen Zahlungsdiensten.",
        view: "finance-providers",
      },
      {
        group: "Aktionen",
        slug: "promotionen",
        label: "Promotionen & Aktionen",
        description:
          "Gutscheincodes, Bonus-SynCredits, Laufzeiten und Teilnehmer verwalten.",
        help: "Zeitlich begrenzte Verkaufs- und Registrierungsaktionen. Dauerhafte Produktpreise gehören unter Preise & SynCredits.",
        view: "marketing-promotions",
      },
    ],
  },

  {
    id: "support",
    title: "Support & Kommunikation",
    sidebarCode: "A6",
    description:
      "Kundenanfragen bearbeiten und Benutzer im Supportfall schnell finden.",
    href: "/admin/support",
    defaultSlug: "nachrichten",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z",
    items: [
      {
        group: "Kommunikation",
        slug: "nachrichten",
        label: "Nachrichten & Anfragen",
        description:
          "Kontakt-, Support-, Presse- und Partnerschaftsanfragen bearbeiten.",
        help: "Zentrale Inbox für eingehende Kommunikation inklusive Status und Weiterleitung.",
        view: "support-messages",
      },
      {
        group: "Support",
        slug: "benutzersuche",
        label: "Benutzer-Supportakte",
        description:
          "Benutzer suchen und vollständige Supportakte mit Analysen, Ergebnissen und Verlauf prüfen.",
        help: "Read-only Supportansicht für Profil, gespeicherte Analysen, Originalergebnisse, Fehler, technische Logs und Kommunikation. Kontoverwaltung bleibt unter Benutzer & Konten.",
        view: "support-user-search",
      },
    ],
  },

  {
    id: "system",
    title: "System & Sicherheit",
    sidebarCode: "A7",
    description:
      "Betriebszustand, KI-Infrastruktur, Systemdiagnose und sicherheitsrelevante Audit-Ereignisse.",
    href: "/admin/system",
    defaultSlug: "status",
    icon: "M12 3l8 4v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V7l8-4z",
    items: [
      {
        group: "Betrieb",
        slug: "status",
        label: "Systemstatus",
        description:
          "SynSight-Anwendung, Datenbank und zentrale Laufzeitkomponenten überwachen und diagnostizieren.",
        help: "Technischer Zustand der SynSight-Plattform. Diese Seite verändert keine Benutzer- oder Website-Inhalte.",
        view: "website-system",
      },
      {
        group: "Betrieb",
        slug: "ki-server",
        label: "KI-Server Monitor",
        description:
          "Erreichbarkeit, Engine-Zustand, Laufzeit und aktuelle Last der Face-/KI-Infrastruktur beobachten.",
        help: "Live-Monitor für die externe KI-/InsightFace-Infrastruktur.",
        view: "website-ki-server",
      },
      {
        group: "Sicherheit",
        slug: "audit",
        label: "Audit & Loginhistorie",
        description:
          "Administrative Änderungen, Zugriffsereignisse und sicherheitsrelevante Aktivitäten durchsuchen und nachvollziehen.",
        help: "Zentraler Audit-Bereich. Der bisherige doppelte Aktivitäten-Eintrag unter Support entfällt.",
        view: "user-audit",
      },
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter & Kampagnen",
    sidebarCode: "A8",
    description:
      "Newsletter erstellen, gestalten, planen, Empfänger verwalten und Versandkampagnen überwachen.",
    href: "/admin/newsletter",
    defaultSlug: "uebersicht",
    icon: "M3 5h18v14H3V5zm1 1l8 7 8-7",
    items: [
      {
        group: "Newsletter",
        slug: "uebersicht",
        label: "Newsletter Command Center",
        description:
          "Kampagnen, Kalender, Templates, Empfänger und Newsletter-Einstellungen zentral verwalten.",
        help: "Eigenständiges Newsletter-System mit visuellem Editor, Vorlagen, Einwilligungsverwaltung, Kalenderplanung und Versandüberwachung. SMTP-Zugangsdaten werden unter Website & Inhalte → Kontakt & E-Mail verwaltet.",
        view: "newsletter-center",
      },
    ],
  },
];

export const ADMIN_SIDEBAR_LINKS = [
  {
    code: "A0",
    label: "Übersicht",
    href: "/admin",
    match: (pathname: string) => pathname === "/admin",
  },
  ...ADMIN_SECTIONS.map((section) => ({
    code: section.sidebarCode,
    label: section.title,
    href: `${section.href}/${section.defaultSlug}`,
    match: (pathname: string) =>
      pathname === section.href || pathname.startsWith(`${section.href}/`),
  })),
];

export function getAdminSection(sectionId: string): AdminSectionConfig | null {
  return ADMIN_SECTIONS.find((section) => section.id === sectionId) ?? null;
}

export function getAdminNavItem(
  sectionId: string,
  pageSlug: string
):
  | (AdminNavItem & {
      section: AdminSectionConfig;
    })
  | null {
  const section = getAdminSection(sectionId);
  if (!section) return null;

  const item = section.items.find((entry) => entry.slug === pageSlug);

  if (!item) return null;

  return {
    ...item,
    section,
  };
}

export function adminPageHref(sectionId: AdminSectionId, slug: string): string {
  return `/admin/${sectionId}/${slug}`;
}

export const ADMIN_ROUTE_REDIRECTS: Record<string, string> = {
  "/admin/benutzer/audit": "/admin/system/audit",

  "/admin/marketing/preise": "/admin/geschaeft/preise",
  "/admin/marketing/promotionen": "/admin/geschaeft/promotionen",

  "/admin/website/systemstatus": "/admin/system/status",
  "/admin/website/ki-server": "/admin/system/ki-server",
  "/admin/website/analysemodule": "/admin/analysen/module",
  "/admin/website/api": "/admin/integrationen/api",
  "/admin/website/bilder": "/admin/website/medien",

  "/admin/finanzen/uebersicht": "/admin/geschaeft/uebersicht",
  "/admin/finanzen/zahlungsanbieter": "/admin/geschaeft/zahlungsanbieter",
  "/admin/finanzen/api-kosten": "/admin/geschaeft/api-kosten",
  "/admin/finanzen/username-intelligence": "/admin/geschaeft/api-kosten",

  "/admin/support/aktivitaeten": "/admin/system/audit",

  "/admin/seo/uebersicht": "/admin/website/wissen",
  "/admin/seo/papierkorb": "/admin/website/papierkorb",
};

export const ADMIN_LEGACY_HASH_REDIRECTS: Record<string, string> = {
  "pricing-management": "/admin/geschaeft/preise",
  "promotions-management": "/admin/geschaeft/promotionen",
  "admin-communications": "/admin/support/nachrichten",
};
