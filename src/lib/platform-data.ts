import type {
  AnalysisSource,
  DashboardMetric,
  Recommendation,
  RiskSignal,
  UserProfile,
} from "@/types/platform";

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Digitale Spuren",
    value: "247",
    detail: "Signale zugeordnet",
    trend: "+12 seit letzter Analyse",
    tone: "cyan",
  },
  {
    label: "Datenleck-Risiko",
    value: "3",
    detail: "Warnungen prüfen",
    trend: "1 hohe Priorität",
    tone: "red",
  },
  {
    label: "Online-Sichtbarkeit",
    value: "68%",
    detail: "Öffentlich auffindbar",
    trend: "−4% in 30 Tagen",
    tone: "amber",
  },
  {
    label: "Schutzstatus",
    value: "Gut",
    detail: "Monitoring aktiv",
    trend: "3 Maßnahmen offen",
    tone: "green",
  },
];

export const riskSignals: RiskSignal[] = [
  {
    id: "risk-profile",
    level: "low",
    title: "Öffentliche Profile erkannt",
    description: "Zwei Profile enthalten konsistente, unkritische Basisdaten.",
    source: "Profil-Korrelation",
  },
  {
    id: "risk-account",
    level: "medium",
    title: "Altes Benutzerkonto gefunden",
    description: "Ein seit 2019 inaktives Konto ist weiterhin öffentlich sichtbar.",
    source: "Account Discovery",
  },
  {
    id: "risk-leak",
    level: "high",
    title: "Datenleck erkannt",
    description: "Eine E-Mail-Adresse erscheint in einem bekannten Leak-Datensatz.",
    source: "Leak Intelligence",
  },
];

export const analysisSources: AnalysisSource[] = [
  { label: "Datenquellen", value: 92, status: "ready" },
  { label: "Profile", value: 74, status: "ready" },
  { label: "Webseiten", value: 58, status: "scanning" },
  { label: "Erwähnungen", value: 81, status: "ready" },
  { label: "Leaks", value: 46, status: "ready" },
];

export const recommendations: Recommendation[] = [
  {
    id: "recommendation-password",
    title: "Passwort aktualisieren",
    description: "Ändern Sie das Passwort des betroffenen Kontos und aktivieren Sie 2FA.",
    priority: "Jetzt",
    completed: false,
  },
  {
    id: "recommendation-profile",
    title: "Altes Profil entfernen",
    description: "Schließen Sie das nicht mehr verwendete Profil oder reduzieren Sie dessen Sichtbarkeit.",
    priority: "Diese Woche",
    completed: false,
  },
  {
    id: "recommendation-privacy",
    title: "Privatsphäre erhöhen",
    description: "Passen Sie die Sichtbarkeit Ihrer öffentlichen Social-Profile an.",
    priority: "Empfohlen",
    completed: false,
  },
];

export const demoUser: UserProfile = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@beispiel.de",
  plan: "SynSight Protect",
};
