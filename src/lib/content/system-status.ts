/**
 * Public system status — static source of truth for /status.
 * Later: replace `getPublicSystemStatus()` with live health probes
 * (API, DB, auth, KI services) without changing the page contract.
 */

export type ComponentHealth =
  "online" | "degraded" | "offline" | "in_development" | "preparing";

export type OverallHealth = "online" | "degraded" | "maintenance" | "offline";

export interface StatusComponent {
  id: string;
  name: string;
  description: string;
  status: ComponentHealth;
  /** Reserved for future monitoring source ids */
  probeKey?: string;
}

export interface StatusIncident {
  id: string;
  date: string;
  title: string;
  summary: string;
  severity: "none" | "info" | "minor" | "major";
}

export interface StatusMaintenance {
  id: string;
  windowLabel: string;
  summary: string;
  planned: boolean;
}

export interface PublicSystemStatus {
  overall: OverallHealth;
  headline: string;
  updatedAtIso: string;
  components: StatusComponent[];
  maintenance: StatusMaintenance[];
  history: StatusIncident[];
}

const componentLabel: Record<ComponentHealth, string> = {
  online: "Online",
  degraded: "Eingeschränkt",
  offline: "Offline",
  in_development: "In Entwicklung",
  preparing: "Vorbereitung",
};

const overallLabel: Record<OverallHealth, string> = {
  online: "SYSTEM ONLINE",
  degraded: "SYSTEM EINGESCHRÄNKT",
  maintenance: "WARTUNG",
  offline: "SYSTEM OFFLINE",
};

export function getComponentStatusLabel(status: ComponentHealth): string {
  return componentLabel[status];
}

export function getOverallStatusLabel(status: OverallHealth): string {
  return overallLabel[status];
}

/** Static configuration — swap for monitoring adapter later. */
export function getPublicSystemStatus(): PublicSystemStatus {
  return {
    overall: "online",
    headline: "Alle Kernsysteme sind erreichbar.",
    updatedAtIso: new Date().toISOString(),
    components: [
      {
        id: "platform",
        name: "SynSight Plattform",
        description: "Öffentliche Website und Kernanwendung",
        status: "online",
        probeKey: "app",
      },
      {
        id: "auth",
        name: "Authentifizierung",
        description: "Login, Registrierung und Session-Sicherheit",
        status: "online",
        probeKey: "auth",
      },
      {
        id: "accounts",
        name: "Benutzerkonto-System",
        description: "Profile, Verifikation und Kontoverwaltung",
        status: "online",
        probeKey: "accounts",
      },
      {
        id: "dashboard",
        name: "Dashboard",
        description: "Command Center und Sicherheitsübersicht",
        status: "online",
        probeKey: "dashboard",
      },
      {
        id: "syncredits",
        name: "SynCredits System",
        description: "Guthaben, Preise und Verbrauchsübersicht",
        status: "online",
        probeKey: "credits",
      },
      {
        id: "database",
        name: "Datenbank",
        description: "MariaDB Persistenzschicht",
        status: "online",
        probeKey: "database",
      },
      {
        id: "ai-engine",
        name: "KI Analyse Engine",
        description: "Externe KI-Analysen und Auswertungspipeline",
        status: "in_development",
        probeKey: "ai",
      },
      {
        id: "image-analysis",
        name: "Bildanalyse",
        description: "Reverse-Image und visuelle Spurensuche",
        status: "preparing",
        probeKey: "images",
      },
    ],
    maintenance: [],
    history: [
      {
        id: "hist-2026-08-12",
        date: "12.08.2026",
        title: "Keine Störungen",
        summary:
          "Für diesen Zeitraum wurden keine plattformweiten Störungen gemeldet.",
        severity: "none",
      },
      {
        id: "hist-2026-07-17",
        date: "17.07.2026",
        title: "Release v1.0.0",
        summary:
          "Grundplattform mit Konten, Dashboard und SynCredits öffentlich dokumentiert.",
        severity: "info",
      },
    ],
  };
}

export function formatStatusTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
