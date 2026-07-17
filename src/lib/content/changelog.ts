/**
 * Public changelog / release notes — static source for /changelog.
 * Later: admin CRUD can persist entries; keep this shape as the DTO contract.
 */

export type ReleaseStatus = "published" | "planned" | "withdrawn";
export type ReleaseCategory = "major" | "minor" | "patch" | "future";

export interface ChangelogRelease {
  id: string;
  version: string;
  dateLabel: string;
  category: ReleaseCategory;
  status: ReleaseStatus;
  title: string;
  description: string;
  features: string[];
}

export interface ChangelogCatalog {
  releases: ChangelogRelease[];
}

const categoryLabel: Record<ReleaseCategory, string> = {
  major: "Major Release",
  minor: "Minor Release",
  patch: "Patch",
  future: "Zukunft",
};

const statusLabel: Record<ReleaseStatus, string> = {
  published: "Veröffentlicht",
  planned: "Geplant",
  withdrawn: "Zurückgezogen",
};

export function getReleaseCategoryLabel(category: ReleaseCategory): string {
  return categoryLabel[category];
}

export function getReleaseStatusLabel(status: ReleaseStatus): string {
  return statusLabel[status];
}

/** Static catalog — replace with repository/admin feed later. */
export function getChangelogCatalog(): ChangelogCatalog {
  return {
    releases: [
      {
        id: "v1.0.0",
        version: "v1.0.0",
        dateLabel: "17. Juli 2026",
        category: "major",
        status: "published",
        title: "Grundplattform SynSight",
        description:
          "Grundplattform von SynSight mit Benutzerverwaltung, Sicherheitsprofilen, Dashboard und SynCredits-System.",
        features: [
          "Benutzerkonten",
          "Sichere Anmeldung",
          "Digitale Identitätsprofile",
          "Sicherheitsdashboard",
          "SynCredits Verwaltung",
        ],
      },
      {
        id: "v1.1.0",
        version: "v1.1.0",
        dateLabel: "Geplant",
        category: "minor",
        status: "planned",
        title: "Analyse- und Profil-Erweiterungen",
        description:
          "Geplante Erweiterungen für tiefere Analysen und eine komfortablere Profilverwaltung.",
        features: [
          "Verbesserte Analysefunktionen",
          "Erweiterte Profilverwaltung",
          "Optimierungen an Performance und UX",
        ],
      },
      {
        id: "v2.0.0",
        version: "v2.0.0",
        dateLabel: "Zukünftig",
        category: "future",
        status: "planned",
        title: "KI-Sicherheitsplattform der nächsten Stufe",
        description:
          "Langfristige Ausbaustufe mit automatisierter Spurensuche und erweiterten Sicherheitsberichten.",
        features: [
          "KI Analyse Engine",
          "Automatische digitale Spurensuche",
          "Erweiterte Sicherheitsberichte",
        ],
      },
    ],
  };
}
