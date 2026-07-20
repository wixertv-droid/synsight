export type AdminSectionId = "benutzer" | "marketing" | "website" | "support";

export interface AdminNavItem {
  slug: string;
  label: string;
  description: string;
  help: string;
  /** registry key — see admin/page-registry.tsx */
  view: string;
  badge?: "live" | "beta" | "soon";
}

export interface AdminSectionConfig {
  id: AdminSectionId;
  title: string;
  description: string;
  href: string;
  icon: string;
  items: AdminNavItem[];
}

export const ADMIN_SECTIONS: AdminSectionConfig[] = [
  {
    id: "benutzer",
    title: "Benutzer",
    description:
      "Benutzerkonten, Identität, SynCredits, Sicherheit und Audit — zentral verwaltet.",
    href: "/admin/benutzer",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    items: [
      {
        slug: "uebersicht",
        label: "Benutzerübersicht",
        description:
          "Live-KPIs zu Registrierungen, Verifizierung und SynCredits.",
        help: "Aggregierte Kennzahlen aus users, credit_accounts und sessions — ohne personenbezogene Einzeldaten in der Übersicht.",
        view: "user-overview",
        badge: "live",
      },
      {
        slug: "verwaltung",
        label: "Benutzerverwaltung",
        description:
          "Tabelle aller Benutzer mit Suche, Filter und Profilzugriff.",
        help: "Vollständige Benutzerliste mit Sortierung. „Profil öffnen“ zeigt alle gespeicherten Daten des Kontos.",
        view: "user-management",
        badge: "live",
      },
      {
        slug: "suche",
        label: "Konten suchen",
        description: "Erweiterte Suche über Name, E-Mail, Alias, ID und mehr.",
        help: "Dieselbe Such-Engine wie die Benutzerverwaltung — optimiert für Support-Eskalationen.",
        view: "user-search",
        badge: "live",
      },
      {
        slug: "rollen",
        label: "Rollen & Berechtigungen",
        description: "Admin-Rollen und geplante Support-/Moderator-Rollen.",
        help: "Aktuell: admin und user. Erweiterte Rollen werden hier konfigurierbar — ohne bestehende Rechte zu entfernen.",
        view: "user-roles",
        badge: "beta",
      },
      {
        slug: "sicherheit",
        label: "Sicherheitsstatus",
        description: "Security-Scores und Monitoring-Einstellungen.",
        help: "Daten aus security_profiles — Risiko- und Überwachungsstatus pro Benutzer.",
        view: "user-security",
        badge: "live",
      },
      {
        slug: "verifizierungen",
        label: "Verifizierungen",
        description: "E-Mail-Verifizierung und Kontoaktivierung.",
        help: "Zeigt verified / pending basierend auf email_verified_at und users.status.",
        view: "user-verifications",
        badge: "live",
      },
      {
        slug: "identitaet",
        label: "Identitätsprofile",
        description: "Übersicht aller Identitätsprofile und Vollständigkeit.",
        help: "Verknüpft mit dem Identitätsmodul — Aliase, Kontakte, Social, Bilder.",
        view: "user-identity",
        badge: "live",
      },
      {
        slug: "syncredits",
        label: "SynCredits",
        description: "Kontostände und Verbrauch über alle Benutzer.",
        help: "Aggregierte SynCredits-KPIs aus credit_accounts.",
        view: "user-syncredits",
        badge: "live",
      },
      {
        slug: "gutschriften",
        label: "Manuelle Gutschriften",
        description: "SynCredits manuell gutschreiben oder entziehen.",
        help: "Revisionssichere Admin-Anpassung mit Pflichtbegründung und Audit-Eintrag.",
        view: "user-credits-adjust",
        badge: "live",
      },
      {
        slug: "transaktionen",
        label: "SynCredit-Transaktionen",
        description: "Letzte Buchungen und Admin-Eingriffe.",
        help: "credit_transactions inkl. performed_by und reason für Compliance.",
        view: "user-transactions",
        badge: "live",
      },
      {
        slug: "login-historie",
        label: "Loginhistorie",
        description: "Sitzungen, IP-Adressen und Geräte.",
        help: "sessions-Tabelle: IP, User-Agent, last_seen — keine Passwörter.",
        view: "user-login-history",
        badge: "live",
      },
      {
        slug: "audit",
        label: "Audit-Logs",
        description: "Revisionssichere Admin- und Sicherheitsereignisse.",
        help: "audit_events — filterbar nach Typ und Zeitraum.",
        view: "user-audit",
        badge: "live",
      },
      {
        slug: "gesperrt",
        label: "Gesperrte Benutzer",
        description: "Suspended und gelöschte Konten.",
        help: "users.status = suspended | deleted.",
        view: "user-blocked",
        badge: "live",
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Preise, SynCredits-Pakete, Promotionen und Umsatz-KPIs.",
    href: "/admin/marketing",
    icon: "M3 3h18v4H3V3zm0 6h18v12H3V9zm4 3h10v2H7v-2z",
    items: [
      {
        slug: "preise",
        label: "Preisverwaltung",
        description:
          "Analysepreise, API-Kosten, Marge — alles aus der Datenbank.",
        help: "analysis_pricing und credit_packages — keine Hardcoded-Preise im Frontend.",
        view: "marketing-pricing",
        badge: "live",
      },
      {
        slug: "syncredits",
        label: "SynCredits",
        description: "Pakete, Verkaufspreise und Bonus-Credits.",
        help: "SynCredits-Kommerzialisierung — direkt an Landing Page und Checkout gekoppelt.",
        view: "marketing-packages",
        badge: "live",
      },
      {
        slug: "promotionen",
        label: "Promotionen",
        description: "Aktive, geplante und abgelaufene Kampagnen.",
        help: "promotions-Tabelle inkl. Budget, Codes und Teilnehmerstatistik.",
        view: "marketing-promotions",
        badge: "live",
      },
      {
        slug: "rabatte",
        label: "Rabatte",
        description: "Rabattregeln und Sonderpreise.",
        help: "Erweiterung der Promotion-Engine — Vorbereitung für gestaffelte Rabatte.",
        view: "marketing-discounts",
        badge: "beta",
      },
      {
        slug: "bonusaktionen",
        label: "Bonusaktionen",
        description: "Zeitlich begrenzte Bonus-SynCredits.",
        help: "Nutzt promotion_rewards — Budget und Limits werden serverseitig enforced.",
        view: "marketing-bonus",
        badge: "live",
      },
      {
        slug: "willkommensbonus",
        label: "Willkommensbonus",
        description: "Automatische Boni für Neuregistrierungen.",
        help: "Neukunden-Promotions aus dem Promotions-Service.",
        view: "marketing-welcome",
        badge: "live",
      },
      {
        slug: "empfehlung",
        label: "Empfehlungsprogramm",
        description: "Referral-Codes und Belohnungen.",
        help: "Modul in Vorbereitung — Architektur bereits über promotions erweiterbar.",
        view: "marketing-referral",
        badge: "soon",
      },
      {
        slug: "statistiken",
        label: "Marketingstatistiken",
        description: "Umsatz, Promotion-ROI und Conversion.",
        help: "payments + promotion_logs — aggregierte KPIs.",
        view: "marketing-stats",
        badge: "beta",
      },
    ],
  },
  {
    id: "website",
    title: "Website",
    description: "System, APIs, Analysemodule, Medien und Plattform-Inhalte.",
    href: "/admin/website",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    items: [
      {
        slug: "systemstatus",
        label: "Systemstatus",
        description: "Server, Datenbank und Plattform-Gesundheit.",
        help: "Live-Health aus getAdminSystemStatus und DB-Ping.",
        view: "website-system",
        badge: "live",
      },
      {
        slug: "api",
        label: "API Verwaltung",
        description: "Verschlüsselte API-Keys für externe Dienste.",
        help: "AES-256-GCM verschlüsselt in api_credentials — Test und Fehlerprotokoll.",
        view: "website-api",
        badge: "live",
      },
      {
        slug: "analysemodule",
        label: "Analysemodule",
        description: "Ein/Aus-Schalter für alle Analysearten.",
        help: "analysis_pricing.is_active — synchron mit Analyse Center und Ergebnis Center.",
        view: "website-modules",
        badge: "live",
      },
      {
        slug: "uploads",
        label: "Uploadverwaltung",
        description: "Upload-Limits und Speicherpfade.",
        help: "platform_settings — globale Upload-Policy.",
        view: "website-uploads",
        badge: "beta",
      },
      {
        slug: "bilder",
        label: "Bildverwaltung",
        description: "Kompression, WebP, Thumbnails und Verschlüsselung.",
        help: "Bild-Pipeline-Parameter aus platform_settings.",
        view: "website-images",
        badge: "live",
      },
      {
        slug: "sicherheit",
        label: "Sicherheit",
        description: "Plattform-Sicherheitsrichtlinien.",
        help: "CSRF, Session, Rate-Limits — read-only Übersicht.",
        view: "website-security",
        badge: "beta",
      },
      {
        slug: "logs",
        label: "Logs",
        description: "System- und Anwendungslogs.",
        help: "Server-Logs — Vorbereitung für zentrale Log-Ansicht.",
        view: "website-logs",
        badge: "soon",
      },
      {
        slug: "landingpage",
        label: "Landingpage",
        description: "Öffentliche Startseite und Module.",
        help: "CMS-Anbindung in Vorbereitung.",
        view: "website-landing",
        badge: "soon",
      },
      {
        slug: "dashboard",
        label: "Dashboard",
        description: "Command-Center-Module und Sichtbarkeit.",
        help: "Steuert welche Dashboard-Widgets aktiv sind.",
        view: "website-dashboard",
        badge: "beta",
      },
      {
        slug: "rechtliches",
        label: "Rechtliches",
        description: "Datenschutz, Impressum, AGB.",
        help: "Verknüpft mit statischen Rechtstexten — CMS folgt.",
        view: "website-legal",
        badge: "soon",
      },
      {
        slug: "cms",
        label: "CMS Inhalte",
        description: "Redaktionelle Inhalte und Changelog.",
        help: "Ersetzt künftig changelog.ts im Code.",
        view: "website-cms",
        badge: "soon",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    description: "Tickets, Nachrichten, Kontaktformular und Benutzersuche.",
    href: "/admin/support",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z",
    items: [
      {
        slug: "tickets",
        label: "Tickets",
        description: "Support-Ticket-System mit Status und Priorität.",
        help: "Vorbereitet — contact_requests als Interims-Inbox.",
        view: "support-tickets",
        badge: "beta",
      },
      {
        slug: "kontakt",
        label: "Kontaktformular",
        description: "Eingehende Kontaktanfragen.",
        help: "contact_requests — gleiche Pipeline wie Nachrichten.",
        view: "support-contact",
        badge: "live",
      },
      {
        slug: "supportcenter",
        label: "Supportcenter",
        description: "Zentrale Support-Übersicht.",
        help: "Kombinierte KPIs für offene Anfragen.",
        view: "support-center",
        badge: "live",
      },
      {
        slug: "benutzersuche",
        label: "Benutzersuche",
        description: "Leistungsfähige Suche für Support-Fälle.",
        help: "Identisch zur Admin-Benutzersuche — alle Felder durchsuchbar.",
        view: "support-user-search",
        badge: "live",
      },
      {
        slug: "aktivitaeten",
        label: "Aktivitäten",
        description: "Letzte Benutzer- und Systemaktivitäten.",
        help: "audit_events + sessions — chronologischer Feed.",
        view: "support-activity",
        badge: "live",
      },
      {
        slug: "nachrichten",
        label: "Nachrichten",
        description: "Kontakt, Presse und Partnerschaft — Inbox.",
        help: "Bestehendes AdminCommunicationsControl — unveränderte API.",
        view: "support-messages",
        badge: "live",
      },
    ],
  },
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
