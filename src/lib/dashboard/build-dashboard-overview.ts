/**
 * Map existing Google + Digital Leak reports into current dashboard prop shapes.
 * No new analysis logic — display only.
 */
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { isLiveSerpSource } from "@/lib/analysis/types";
import type {
  AnalysisSource,
  DashboardMetric,
  Recommendation,
  RiskLevel,
  RiskSignal,
} from "@/types/platform";

export interface DashboardSecurityStatus {
  score: number;
  monitoringLabel: string;
  lastAnalysisLabel: string;
  openActionsLabel: string;
  summaryText: string;
}

export interface DashboardMonitoringTile {
  label: string;
  value: string;
  detail: string;
}

export interface DashboardOverviewData {
  metrics: DashboardMetric[];
  riskSignals: RiskSignal[];
  recommendations: Recommendation[];
  analysisSources: AnalysisSource[];
  security: DashboardSecurityStatus;
  monitoring: DashboardMonitoringTile[];
  signalCount: number;
  riskSignalCount: number;
  hasAnyReport: boolean;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRelativeDe(iso: string | null | undefined): string {
  if (!iso) return "KEINE ANALYSE";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "KEINE ANALYSE";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return "HEUTE";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Berlin",
  })
    .format(date)
    .toUpperCase();
}

function protectLabel(score: number): {
  value: string;
  tone: DashboardMetric["tone"];
} {
  if (score >= 70) return { value: "Gut", tone: "green" };
  if (score >= 40) return { value: "Mittel", tone: "amber" };
  return { value: "Kritisch", tone: "red" };
}

function mapActionPriority(priority: string): Recommendation["priority"] {
  if (/sofort|jetzt/i.test(priority)) return "Jetzt";
  if (/hoch|diese woche|mittel/i.test(priority)) return "Diese Woche";
  return "Empfohlen";
}

function riskFromHitSeverity(
  severity: string | undefined,
  risk: string | undefined
): RiskLevel {
  if (severity === "critical" || risk === "action") return "high";
  if (severity === "high" || risk === "review") return "medium";
  if (severity === "medium" || risk === "watch") return "medium";
  return "low";
}

export function buildDashboardOverview(input: {
  google: IntelligenceReport | null;
  exposure: DigitalExposureReport | null;
}): DashboardOverviewData {
  const google = input.google;
  const exposure = input.exposure;
  const hasAnyReport = Boolean(google || exposure);

  const liveHits =
    google?.hits.filter((hit) => isLiveSerpSource(hit.sourceType)) ?? [];
  const likelyCount =
    google?.scorecard?.likelyMeCount ??
    liveHits.filter((h) => (h.identityConfidence ?? 0) >= 70).length;
  const totalLive = google?.scorecard?.totalLive ?? liveHits.length;
  const publicVisibility = google?.scorecard?.publicVisibility ?? 0;
  const googleRisk = google?.riskScore ?? 0;

  const leakFindings =
    exposure?.findings.filter(
      (f) => f.type === "BREACH" || f.type === "PASSWORD_EXPOSURE"
    ) ?? [];
  const leakHigh = leakFindings.filter((f) => f.riskLevel === "high").length;
  const leakScore = exposure?.riskScore ?? 0;
  const confirmedSources =
    exposure?.managementOverview?.confirmedSources ??
    leakFindings.filter((f) => f.type === "BREACH").length;

  const openGoogleActions =
    google?.recommendations.filter((r) => r.priority === "Jetzt").length ?? 0;
  const openLeakActions =
    exposure?.actions?.filter(
      (a) => a.priority === "SOFORT" || a.priority === "HOCH"
    ).length ?? 0;
  const openActions = openGoogleActions + openLeakActions;

  const protectionScore = clampScore(
    100 - Math.max(googleRisk, leakScore) * 0.85
  );
  const protect = protectLabel(protectionScore);

  const metrics: DashboardMetric[] = [
    {
      label: "Digitale Spuren",
      value: String(totalLive),
      detail:
        likelyCount > 0
          ? `${likelyCount} klar zuordenbar`
          : hasAnyReport
            ? "Keine klaren Treffer"
            : "Noch keine Google-Analyse",
      trend: google?.generatedAtLabel
        ? `Stand ${google.generatedAtLabel}`
        : "Analyse ausstehend",
      tone: "cyan",
      info: "Öffentlich indexierte Treffer aus Ihrer Google-Analyse.",
    },
    {
      label: "Datenleck-Risiko",
      value: String(confirmedSources || leakFindings.length),
      detail:
        confirmedSources > 0
          ? `${confirmedSources} bestätigte Quelle(n)`
          : hasAnyReport && exposure
            ? "Keine Leaks gefunden"
            : "Noch kein Leak-Scan",
      trend:
        leakHigh > 0
          ? `${leakHigh} hohe Priorität`
          : exposure
            ? `Score ${leakScore}/100`
            : "Scan ausstehend",
      tone:
        leakHigh > 0 || leakScore >= 70
          ? "red"
          : leakScore >= 40
            ? "amber"
            : "green",
      info: "Bestätigte DeHashed-Quellen und Passwort-Exposure-Hinweise.",
    },
    {
      label: "Online-Sichtbarkeit",
      value: google ? `${publicVisibility}%` : "—",
      detail: google ? "Öffentlich auffindbar" : "Google-Analyse ausstehend",
      trend: google?.scorecard
        ? `Datenschutz ${google.scorecard.privacyScore}/100`
        : "—",
      tone:
        publicVisibility >= 70
          ? "red"
          : publicVisibility >= 40
            ? "amber"
            : "green",
      info: "Wie leicht persönliche Informationen über die Google-Analyse auffindbar sind.",
    },
    {
      label: "Schutzstatus",
      value: hasAnyReport ? protect.value : "—",
      detail: hasAnyReport ? "Aus Analysen abgeleitet" : "Noch keine Analyse",
      trend:
        openActions > 0
          ? `${openActions} Maßnahmen offen`
          : hasAnyReport
            ? "Keine Sofortmaßnahmen"
            : "—",
      tone: hasAnyReport ? protect.tone : "amber",
      info: "Zusammenfassung aus Google-Risiko und Leak-Exposure.",
    },
  ];

  const riskSignals: RiskSignal[] = [];

  if (exposure && confirmedSources > 0) {
    const topLeak =
      leakFindings.find((f) => f.riskLevel === "high") ?? leakFindings[0];
    riskSignals.push({
      id: "risk-leak",
      level: topLeak?.riskLevel === "high" ? "high" : "medium",
      title:
        topLeak?.type === "PASSWORD_EXPOSURE"
          ? "Passwort-Exposure erkannt"
          : "Datenleck erkannt",
      description:
        topLeak?.description ||
        `${confirmedSources} bestätigte Leak-Quelle(n) in DeHashed.`,
      source: topLeak?.sourceName || "Digital Leak Scan",
      info: "Bestätigter Treffer aus dem Digital Leak & Exposure Scan.",
    });
  }

  const criticalHits = liveHits
    .filter((h) => h.severity === "critical" || h.risk === "action")
    .slice(0, 2);
  for (const hit of criticalHits) {
    riskSignals.push({
      id: `risk-google-${hit.id}`,
      level: "high",
      title: hit.title.slice(0, 80),
      description: (hit.whyRelevantPlain || hit.snippet || hit.risks).slice(
        0,
        160
      ),
      source: hit.source || "Google Analyse",
      info: "Kritischer Treffer aus der Google-Analyse.",
    });
  }

  const socialCount =
    google?.managementOverview?.social ??
    liveHits.filter((h) => h.filterCategory === "social").length;
  if (socialCount > 0 && riskSignals.length < 3) {
    riskSignals.push({
      id: "risk-profiles",
      level: "low",
      title: "Öffentliche Profile erkannt",
      description: `${socialCount} Social-/Profil-Treffer in der Google-Analyse.`,
      source: "Google Analyse",
      info: "Öffentliche Profile aus indexierten Suchtreffern.",
    });
  }

  const highHits = liveHits
    .filter(
      (h) =>
        (h.severity === "high" || h.risk === "review") &&
        !criticalHits.some((c) => c.id === h.id)
    )
    .slice(0, 3 - riskSignals.length);
  for (const hit of highHits) {
    riskSignals.push({
      id: `risk-google-${hit.id}`,
      level: riskFromHitSeverity(hit.severity, hit.risk),
      title: hit.title.slice(0, 80),
      description: (hit.whyRelevantPlain || hit.snippet || "").slice(0, 160),
      source: hit.source || "Google Analyse",
    });
  }

  if (riskSignals.length === 0) {
    riskSignals.push({
      id: "risk-empty",
      level: "low",
      title: hasAnyReport
        ? "Keine kritischen Signale"
        : "Noch keine Analyse gestartet",
      description: hasAnyReport
        ? "In den vorliegenden Berichten wurden keine priorisierten Risiken gefunden."
        : "Starten Sie eine Google-Analyse oder einen Digital Leak Scan im Analysecenter.",
      source: "Dashboard",
      info: "Risikosignale erscheinen nach abgeschlossenen Analysen.",
    });
  }

  const recommendations: Recommendation[] = [];
  for (const rec of google?.recommendations ?? []) {
    recommendations.push({
      id: `google-${rec.title}`,
      title: rec.title,
      description: rec.detail || rec.howToFix || rec.why,
      priority: mapActionPriority(rec.priority),
      completed: false,
    });
  }
  for (const action of exposure?.actions ?? []) {
    recommendations.push({
      id: `leak-${action.title}`,
      title: action.title,
      description: action.how || action.why,
      priority: mapActionPriority(action.priority),
      completed: false,
    });
  }
  const priorityRank: Record<Recommendation["priority"], number> = {
    Jetzt: 0,
    "Diese Woche": 1,
    Empfohlen: 2,
  };
  recommendations.sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority]
  );
  const topRecommendations = recommendations.slice(0, 3);
  if (topRecommendations.length === 0) {
    topRecommendations.push({
      id: "rec-empty",
      title: hasAnyReport
        ? "Keine offenen Sofortmaßnahmen"
        : "Erste Analyse starten",
      description: hasAnyReport
        ? "Aktuell liegen keine priorisierten Empfehlungen vor."
        : "Führen Sie eine Google-Analyse oder einen Leak-Scan aus, um Empfehlungen zu erhalten.",
      priority: "Empfohlen",
      completed: false,
    });
  }

  const overview = google?.managementOverview;
  const maxCat = Math.max(
    overview?.social ?? 0,
    overview?.websites ?? 0,
    overview?.mentions ?? 0,
    overview?.documents ?? 0,
    confirmedSources,
    1
  );
  const pct = (n: number) => clampScore((n / maxCat) * 100);

  const analysisSources: AnalysisSource[] = [
    {
      label: "Datenquellen",
      value: hasAnyReport
        ? clampScore(40 + totalLive * 3 + confirmedSources * 8)
        : 0,
      status: "ready",
    },
    {
      label: "Profile",
      value: overview ? pct(overview.social) : 0,
      status: "ready",
    },
    {
      label: "Webseiten",
      value: overview ? pct(overview.websites) : 0,
      status: "ready",
    },
    {
      label: "Erwähnungen",
      value: overview ? pct(overview.mentions) : 0,
      status: "ready",
    },
    {
      label: "Leaks",
      value: exposure
        ? clampScore(
            confirmedSources > 0
              ? 35 + confirmedSources * 15 + leakScore * 0.3
              : 8
          )
        : 0,
      status: "ready",
    },
  ];

  const lastGoogle = google?.generatedAt ?? null;
  const lastLeak = exposure?.completedAt ?? null;
  const lastIso =
    [lastGoogle, lastLeak]
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;

  const securityScore = hasAnyReport
    ? clampScore(
        google?.scorecard?.overallScore ??
          100 - Math.max(googleRisk, leakScore) * 0.8
      )
    : 0;

  const security: DashboardSecurityStatus = {
    score: securityScore,
    monitoringLabel: hasAnyReport ? "AKTIV" : "INAKTIV",
    lastAnalysisLabel: formatRelativeDe(lastIso),
    openActionsLabel: `${openActions} priorisierte Maßnahmen`,
    summaryText: hasAnyReport
      ? `Aus Google- und Leak-Analysen abgeleitet. ${openActions} priorisierte Maßnahme(n) können Ihren Schutzstatus verbessern.`
      : "Noch keine Analyseergebnisse vorhanden. Starten Sie eine Analyse im Analysecenter.",
  };

  const reportCount = (google ? 1 : 0) + (exposure ? 1 : 0);
  const monitoring: DashboardMonitoringTile[] = [
    {
      label: "MONITORING",
      value: hasAnyReport ? "Aktiv" : "Inaktiv",
      detail: hasAnyReport
        ? "Vorhandene Analyseberichte werden im Ergebniscenter angezeigt."
        : "Noch keine Berichte — Analyse starten.",
    },
    {
      label: "BERICHTE",
      value: `${reportCount} verfügbar`,
      detail:
        reportCount > 0
          ? "Aktuelle Berichte im Ergebniscenter einsehen."
          : "Noch keine Berichte vorhanden.",
    },
    {
      label: "NÄCHSTER SCAN",
      value: "Manuell",
      detail: "Scans starten Sie im Analysecenter (kein Automatikzyklus).",
    },
  ];

  return {
    metrics,
    riskSignals: riskSignals.slice(0, 3),
    recommendations: topRecommendations,
    analysisSources,
    security,
    monitoring,
    signalCount: totalLive,
    riskSignalCount: riskSignals.slice(0, 3).length,
    hasAnyReport,
  };
}
