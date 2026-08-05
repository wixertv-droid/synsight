export type AdminSectionId =
  "benutzer" | "marketing" | "website" | "finanzen" | "support" | "seo";

export interface AdminNavItem {
  slug: string;
  label: string;
  description: string;
  help: string;
  view: string;
}

export interface AdminSectionConfig {
  id: AdminSectionId;
  title: string;
  description: string;
  href: string;
  icon: string;
  /** Erste Seite beim Öffnen des Bereichs */
  defaultSlug: string;
  sidebarCode: string;
  items: AdminNavItem[];
}

/** Admin-Bereiche — schlank sortiert, nur funktionale Module */
export const ADMIN_SECTIONS: AdminSectionConfig[] = [
  {
    id: "benutzer",
    title: "Benutzer",
    sidebarCode: "A1",
    description:
      "Konten, SynCredits, Audit und gesperrte Benutzer — alles an einem Ort.",
    href: "/admin/benutzer",
    defaultSlug: "uebersicht",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    items: [
      {
        slug: "uebersicht",
        label: "Übersicht",
        description:
          "Kennzahlen zu Registrierungen, Verifizierung und SynCredits.",
        help: "Live-KPIs aus users, credit_accounts und sessions.",
        view: "user-overview",
      },
      {
        slug: "verwaltung",
        label: "Benutzerverwaltung",
        description: "Alle Benutzer mit Suche, Sortierung und Profilzugriff.",
        help: "Tabelle aller Konten — „Profil öffnen“ zeigt die vollständige 360°-Ansicht.",
        view: "user-management",
      },
      {
        slug: "gutschriften",
        label: "SynCredits & Gutschriften",
        description: "Manuelle Gutschriften und Abbuchungen mit Audit.",
        help: "Revisionssichere Anpassung — dieselbe Logik wie im bisherigen Admin.",
        view: "user-credits-adjust",
      },
      {
        slug: "audit",
        label: "Audit & Loginhistorie",
        description: "Revisionssichere Ereignisse und Sitzungen.",
        help: "audit_events und Login-Sitzungen — filterbar und chronologisch.",
        view: "user-audit",
      },
      {
        slug: "gesperrt",
        label: "Gesperrte Benutzer",
        description: "Suspended und gelöschte Konten.",
        help: "Filter auf users.status = suspended | deleted.",
        view: "user-blocked",
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    sidebarCode: "A2",
    description:
      "Preise, SynCredits-Pakete und Promotionen — aus der Datenbank.",
    href: "/admin/marketing",
    defaultSlug: "preise",
    icon: "M3 3h18v4H3V3zm0 6h18v12H3V9zm4 3h10v2H7v-2z",
    items: [
      {
        slug: "preise",
        label: "Preisverwaltung",
        description: "Analysepreise, Auftragspreise und SynCredits-Pakete.",
        help: "analysis_pricing, order_pricing und credit_packages — keine Hardcoded-Preise.",
        view: "marketing-pricing",
      },
      {
        slug: "promotionen",
        label: "Promotionen",
        description: "Kampagnen, Codes, Budget und Teilnehmer.",
        help: "Aktive, geplante und abgelaufene Promotionen — unveränderte Admin-Logik.",
        view: "marketing-promotions",
      },
    ],
  },
  {
    id: "website",
    title: "Website",
    sidebarCode: "A3",
    description: "System, Analysemodule, APIs und Bild-Pipeline.",
    href: "/admin/website",
    defaultSlug: "systemstatus",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    items: [
      {
        slug: "systemstatus",
        label: "Systemstatus",
        description: "Server, Datenbank und Laufzeit.",
        help: "Live-Health aus getAdminSystemStatus.",
        view: "website-system",
      },
      {
        slug: "ki-server",
        label: "KI-Server Monitor",
        description: "Live-Status und Last der Face-/KI-Engine.",
        help: "Pollt /status des InsightFace-Servers — EKG für active_tasks.",
        view: "website-ki-server",
      },
      {
        slug: "analysemodule",
        label: "Analysemodule",
        description: "Analysen ein- oder ausschalten.",
        help: "Steuert Sichtbarkeit im Analyse Center und Ergebnis Center.",
        view: "website-modules",
      },
      {
        slug: "api",
        label: "APIs & Integrationen",
        description: "Suchanbieter und externe Dienst-Keys.",
        help: "SerpAPI Search Provider sowie optionale KI-/OSINT-Keys.",
        view: "website-api",
      },
      {
        slug: "bilder",
        label: "Bildverwaltung",
        description: "Upload-Limits, WebP und Verschlüsselung.",
        help: "platform_settings — Bild-Pipeline-Parameter.",
        view: "website-images",
      },
    ],
  },
  {
    id: "finanzen",
    title: "Finanzen",
    sidebarCode: "A4",
    description:
      "Einnahmen, API-Ausgaben, Zahlungsanbieter und Kosten pro Abfrage.",
    href: "/admin/finanzen",
    defaultSlug: "uebersicht",
    icon: "M12 1v22M5 8h14M5 16h14",
    items: [
      {
        slug: "uebersicht",
        label: "Einnahmen & Ausgaben",
        description: "Cashflow, API-Kosten und Diagramme.",
        help: "Übersicht aus payments/invoices und api_usage_events.",
        view: "finance-overview",
      },
      {
        slug: "zahlungsanbieter",
        label: "Zahlungsanbieter",
        description: "Stripe, PayPal & Co. anlegen und API-Keys hinterlegen.",
        help: "payment_providers — Keys werden verschlüsselt gespeichert.",
        view: "finance-providers",
      },
      {
        slug: "api-kosten",
        label: "API-Ausgaben",
        description: "Preis pro Abfrage und detaillierte API-Kosten.",
        help: "api_cost_settings + api_usage_events — öffnen für Einzelkosten.",
        view: "finance-api-costs",
      },
      {
        slug: "username-intelligence",
        label: "Username Intelligence",
        description:
          "SynCredits, SerpAPI-/Gemini-Kosten und Gewinnkalkulation.",
        help: "username_module_settings — automatische Kosten-/Gewinnberechnung.",
        view: "finance-api-costs",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    sidebarCode: "A5",
    description: "Nachrichten, Benutzersuche und Aktivitäten.",
    href: "/admin/support",
    defaultSlug: "nachrichten",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z",
    items: [
      {
        slug: "nachrichten",
        label: "Nachrichten",
        description:
          "Kontakt, Support, Presse, Partnerschaft — Inbox und Support-Zeiten.",
        help: "AdminCommunicationsControl — Weiterleitung, Status, Löschen, Support-Ampel-Zeiten.",
        view: "support-messages",
      },
      {
        slug: "benutzersuche",
        label: "Benutzersuche",
        description: "Support-Suche über alle Profilfelder.",
        help: "Schnell Benutzer finden und Profil öffnen.",
        view: "support-user-search",
      },
      {
        slug: "aktivitaeten",
        label: "Aktivitäten",
        description: "Letzte System- und Admin-Ereignisse.",
        help: "Chronologischer Feed aus audit_events.",
        view: "support-activity",
      },
    ],
  },
  {
    id: "seo",
    title: "SEO & Wissensdatenbank",
    sidebarCode: "A6",
    description:
      "Öffentliche Wissensseiten und SEO-Landingpages zentral verwalten.",
    href: "/admin/seo",
    defaultSlug: "uebersicht",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    items: [
      {
        slug: "uebersicht",
        label: "Seitenübersicht",
        description: "Alle Wissensseiten mit Suche, Filter und Status.",
        help: "seo_knowledge_pages — Entwurf, veröffentlicht, archiviert.",
        view: "seo-knowledge-list",
      },
      {
        slug: "papierkorb",
        label: "Papierkorb",
        description:
          "Gelöschte Seiten wiederherstellen oder endgültig entfernen.",
        help: "Soft-Delete über deleted_at — Wiederherstellung möglich.",
        view: "seo-knowledge-trash",
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
): (AdminNavItem & { section: AdminSectionConfig }) | null {
  const section = getAdminSection(sectionId);
  if (!section) return null;
  const item = section.items.find((entry) => entry.slug === pageSlug);
  if (!item) return null;
  return { ...item, section };
}

export function adminPageHref(sectionId: AdminSectionId, slug: string): string {
  return `/admin/${sectionId}/${slug}`;
}

/** Legacy Hash → neue Route */
export const ADMIN_LEGACY_HASH_REDIRECTS: Record<string, string> = {
  "pricing-management": "/admin/marketing/preise",
  "promotions-management": "/admin/marketing/promotionen",
  "admin-communications": "/admin/support/nachrichten",
};
