export type AdminSectionId = "benutzer" | "marketing" | "website" | "support";

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

/** Vier Admin-Bereiche — schlank sortiert, nur funktionale Module */
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
        description: "Analysepreise und SynCredits-Pakete.",
        help: "analysis_pricing und credit_packages — keine Hardcoded-Preise.",
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
    id: "support",
    title: "Support",
    sidebarCode: "A4",
    description: "Nachrichten, Benutzersuche und Aktivitäten.",
    href: "/admin/support",
    defaultSlug: "nachrichten",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z",
    items: [
      {
        slug: "nachrichten",
        label: "Nachrichten",
        description: "Kontakt, Presse und Partnerschaft — Inbox.",
        help: "AdminCommunicationsControl — Weiterleitung, Status, Löschen.",
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
