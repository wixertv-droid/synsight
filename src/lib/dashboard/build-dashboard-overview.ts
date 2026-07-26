/**
 * Map active-module reports into current dashboard prop shapes.
 * Module-agnostic: adapters register per analysis key; unknown active keys
 * contribute a neutral "no report yet" tile.
 */
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { isLiveSerpSource } from "@/lib/analysis/types";
import type { UsernameReport } from "@/lib/analysis/username/types";
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

/** One active catalog module + optional report payload. */
export interface DashboardModuleInput {
  key: string;
  label: string;
  report: unknown | null;
}

interface ModuleContribution {
  metrics: DashboardMetric[];
  riskSignals: RiskSignal[];
  recommendations: Recommendation[];
  analysisSources: AnalysisSource[];
  lastAnalysisAt: string | null;
  riskScore: number;
  openActions: number;
  signalCount: number;
  hasReport: boolean;
  summaryBits: string[];
}

type ModuleAdapter = (
  label: string,
  report: unknown | null
) => ModuleContribution;

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

function emptyContribution(): ModuleContribution {
  return {
    metrics: [],
    riskSignals: [],
    recommendations: [],
    analysisSources: [],
    lastAnalysisAt: null,
    riskScore: 0,
    openActions: 0,
    signalCount: 0,
    hasReport: false,
    summaryBits: [],
  };
}

function isGoogleReport(value: unknown): value is IntelligenceReport {
  return Boolean(
    value &&
    typeof value === "object" &&
    "moduleKey" in value &&
    (value as IntelligenceReport).moduleKey === "google_search"
  );
}

function isExposureReport(value: unknown): value is DigitalExposureReport {
  return Boolean(
    value &&
    typeof value === "object" &&
    "moduleKey" in value &&
    (value as DigitalExposureReport).moduleKey === "digital_leak_exposure"
  );
}

function isUsernameReport(value: unknown): value is UsernameReport {
  return Boolean(
    value &&
    typeof value === "object" &&
    "moduleKey" in value &&
    (value as UsernameReport).moduleKey === "username_intelligence"
  );
}

function pendingMetric(label: string, detail: string): DashboardMetric {
  return {
    label,
    value: "—",
    detail,
    trend: "Analyse ausstehend",
    tone: "amber",
    info: `Noch kein Bericht für ${label}.`,
  };
}

function pendingSource(label: string): AnalysisSource {
  return { label, value: 0, status: "ready" };
}

const googleAdapter: ModuleAdapter = (label, raw) => {
  const google = isGoogleReport(raw) ? raw : null;
  if (!google) {
    return {
      ...emptyContribution(),
      metrics: [
        pendingMetric("Digitale Spuren", "Noch keine Google-Analyse"),
        pendingMetric("Online-Sichtbarkeit", "Google-Analyse ausstehend"),
      ],
      analysisSources: [
        pendingSource("Datenquellen"),
        pendingSource("Profile"),
        pendingSource("Webseiten"),
        pendingSource("Erwähnungen"),
      ],
    };
  }

  const liveHits =
    google.hits.filter((hit) => isLiveSerpSource(hit.sourceType)) ?? [];
  const likelyCount =
    google.scorecard?.likelyMeCount ??
    liveHits.filter((h) => (h.identityConfidence ?? 0) >= 70).length;
  const totalLive = google.scorecard?.totalLive ?? liveHits.length;
  const publicVisibility = google.scorecard?.publicVisibility ?? 0;
  const googleRisk = google.riskScore ?? 0;
  const openGoogleActions =
    google.recommendations.filter((r) => r.priority === "Jetzt").length ?? 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Digitale Spuren",
      value: String(totalLive),
      detail:
        likelyCount > 0
          ? `${likelyCount} klar zuordenbar`
          : "Keine klaren Treffer",
      trend: google.generatedAtLabel
        ? `Stand ${google.generatedAtLabel}`
        : "Analyse ausstehend",
      tone: "cyan",
      info: "Öffentlich indexierte Treffer aus Ihrer Google-Analyse.",
    },
    {
      label: "Online-Sichtbarkeit",
      value: `${publicVisibility}%`,
      detail: "Öffentlich auffindbar",
      trend: google.scorecard
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
  ];

  const riskSignals: RiskSignal[] = [];
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
      source: hit.source || label,
      info: "Kritischer Treffer aus der Google-Analyse.",
    });
  }

  const socialCount =
    google.managementOverview?.social ??
    liveHits.filter((h) => h.filterCategory === "social").length;
  if (socialCount > 0) {
    riskSignals.push({
      id: "risk-profiles",
      level: "low",
      title: "Öffentliche Profile erkannt",
      description: `${socialCount} Social-/Profil-Treffer in der Google-Analyse.`,
      source: label,
      info: "Öffentliche Profile aus indexierten Suchtreffern.",
    });
  }

  const highHits = liveHits
    .filter(
      (h) =>
        (h.severity === "high" || h.risk === "review") &&
        !criticalHits.some((c) => c.id === h.id)
    )
    .slice(0, 2);
  for (const hit of highHits) {
    riskSignals.push({
      id: `risk-google-${hit.id}`,
      level: riskFromHitSeverity(hit.severity, hit.risk),
      title: hit.title.slice(0, 80),
      description: (hit.whyRelevantPlain || hit.snippet || "").slice(0, 160),
      source: hit.source || label,
    });
  }

  const recommendations: Recommendation[] = (google.recommendations ?? []).map(
    (rec) => ({
      id: `google-${rec.title}`,
      title: rec.title,
      description: rec.detail || rec.howToFix || rec.why,
      priority: mapActionPriority(rec.priority),
      completed: false,
    })
  );

  const overview = google.managementOverview;
  const social = overview?.social ?? 0;
  const websites = overview?.websites ?? 0;
  const mentions = overview?.mentions ?? 0;

  return {
    metrics,
    riskSignals,
    recommendations,
    analysisSources: [
      {
        label: "Datenquellen",
        value: clampScore(totalLive === 0 ? 0 : 28 + totalLive * 4),
        status: "ready",
        count: totalLive,
      },
      {
        label: "Profile",
        value: clampScore(social === 0 ? 0 : 20 + social * 18),
        status: "ready",
        count: social,
      },
      {
        label: "Webseiten",
        value: clampScore(websites === 0 ? 0 : 20 + websites * 16),
        status: "ready",
        count: websites,
      },
      {
        label: "Erwähnungen",
        value: clampScore(mentions === 0 ? 0 : 18 + mentions * 12),
        status: "ready",
        count: mentions,
      },
    ],
    lastAnalysisAt: google.generatedAt ?? null,
    riskScore: googleRisk,
    openActions: openGoogleActions,
    signalCount: totalLive,
    hasReport: true,
    summaryBits: ["Google"],
  };
};

const exposureAdapter: ModuleAdapter = (label, raw) => {
  const exposure = isExposureReport(raw) ? raw : null;
  if (!exposure) {
    return {
      ...emptyContribution(),
      metrics: [pendingMetric("Datenleck-Risiko", "Noch kein Leak-Scan")],
      analysisSources: [pendingSource("Leaks")],
    };
  }

  const leakFindings =
    exposure.findings.filter(
      (f) => f.type === "BREACH" || f.type === "PASSWORD_EXPOSURE"
    ) ?? [];
  const leakHigh = leakFindings.filter((f) => f.riskLevel === "high").length;
  const leakScore = exposure.riskScore ?? 0;
  const confirmedSources =
    exposure.managementOverview?.confirmedSources ??
    leakFindings.filter((f) => f.type === "BREACH").length;
  const openLeakActions =
    exposure.actions?.filter(
      (a) => a.priority === "SOFORT" || a.priority === "HOCH"
    ).length ?? 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Datenleck-Risiko",
      value: String(confirmedSources || leakFindings.length),
      detail:
        confirmedSources > 0
          ? `${confirmedSources} bestätigte Quelle(n)`
          : "Keine Leaks gefunden",
      trend:
        leakHigh > 0 ? `${leakHigh} hohe Priorität` : `Score ${leakScore}/100`,
      tone:
        leakHigh > 0 || leakScore >= 70
          ? "red"
          : leakScore >= 40
            ? "amber"
            : "green",
      info: "Bestätigte DeHashed-Quellen und Passwort-Exposure-Hinweise.",
    },
  ];

  const riskSignals: RiskSignal[] = [];
  if (confirmedSources > 0) {
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
      source: topLeak?.sourceName || label,
      info: "Bestätigter Treffer aus dem Digital Leak & Exposure Scan.",
    });
  }

  const recommendations: Recommendation[] = (exposure.actions ?? []).map(
    (action) => ({
      id: `leak-${action.title}`,
      title: action.title,
      description: action.how || action.why,
      priority: mapActionPriority(action.priority),
      completed: false,
    })
  );

  return {
    metrics,
    riskSignals,
    recommendations,
    analysisSources: [
      {
        label: "Leaks",
        value: clampScore(
          confirmedSources > 0
            ? 35 + confirmedSources * 15 + leakScore * 0.3
            : leakFindings.length > 0
              ? 22
              : 0
        ),
        status: "ready",
        count: confirmedSources || leakFindings.length,
      },
    ],
    lastAnalysisAt: exposure.completedAt ?? null,
    riskScore: leakScore,
    openActions: openLeakActions,
    signalCount: confirmedSources || leakFindings.length,
    hasReport: true,
    summaryBits: ["Leak"],
  };
};

const usernameAdapter: ModuleAdapter = (label, raw) => {
  const username = isUsernameReport(raw) ? raw : null;
  if (!username) {
    return {
      ...emptyContribution(),
      metrics: [pendingMetric("Username-Treffer", "Noch kein Username-Scan")],
      analysisSources: [pendingSource("Usernames")],
    };
  }

  const hitCount = username.hitCount ?? username.hits?.length ?? 0;
  const platformCount =
    username.managementOverview?.platformCount ??
    username.platformOverview?.length ??
    0;
  const problematic =
    username.managementOverview?.problematicCount ??
    username.hits?.filter((h) => h.isProblematic).length ??
    0;
  const riskScore = username.riskScore ?? 0;
  const openActions =
    username.actions?.filter(
      (a) => a.priority === "SOFORT" || a.priority === "HOCH"
    ).length ?? 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Username-Treffer",
      value: String(hitCount),
      detail:
        platformCount > 0
          ? `${platformCount} Plattform(en)`
          : "Keine Plattformen",
      trend:
        problematic > 0
          ? `${problematic} problematisch`
          : `Score ${riskScore}/100`,
      tone:
        problematic > 0 || riskScore >= 70
          ? "red"
          : riskScore >= 40
            ? "amber"
            : "green",
      info: "Öffentliche Profiltreffer aus dem Username Intelligence Scan.",
    },
  ];

  const riskSignals: RiskSignal[] = [];
  const hotHits = (username.hits ?? [])
    .filter((h) => h.isProblematic || h.riskLevel === "high")
    .slice(0, 2);
  for (const hit of hotHits) {
    riskSignals.push({
      id: `risk-username-${hit.id}`,
      level: hit.riskLevel === "high" ? "high" : "medium",
      title: (hit.title || hit.platform).slice(0, 80),
      description: (hit.snippet || hit.visibleInfo.join(", ") || "").slice(
        0,
        160
      ),
      source: hit.platform || label,
      info: "Treffer aus dem Username Intelligence Scan.",
    });
  }

  const recommendations: Recommendation[] = (username.actions ?? []).map(
    (action) => ({
      id: `username-${action.title}`,
      title: action.title,
      description: action.how || action.why,
      priority: mapActionPriority(action.priority),
      completed: false,
    })
  );

  return {
    metrics,
    riskSignals,
    recommendations,
    analysisSources: [
      {
        label: "Usernames",
        value: clampScore(
          hitCount > 0 ? 25 + platformCount * 12 + riskScore * 0.25 : 0
        ),
        status: "ready",
        count: hitCount,
      },
    ],
    lastAnalysisAt: username.completedAt ?? null,
    riskScore,
    openActions,
    signalCount: hitCount,
    hasReport: true,
    summaryBits: ["Username"],
  };
};

const unknownAdapter: ModuleAdapter = (label, report) => {
  if (report) {
    return {
      ...emptyContribution(),
      metrics: [
        {
          label,
          value: "OK",
          detail: "Bericht vorhanden",
          trend: "Details im Ergebniscenter",
          tone: "cyan",
          info: `Aktiver Modulbericht für ${label}.`,
        },
      ],
      analysisSources: [{ label, value: 40, status: "ready" }],
      hasReport: true,
      summaryBits: [label],
    };
  }
  return {
    ...emptyContribution(),
    metrics: [pendingMetric(label, "Noch kein Bericht")],
    analysisSources: [pendingSource(label)],
  };
};

/** Registry of known module adapters — extend here for new analyses. */
const MODULE_ADAPTERS: Record<string, ModuleAdapter> = {
  google_search: googleAdapter,
  digital_leak_exposure: exposureAdapter,
  username_intelligence: usernameAdapter,
};

function contributeModule(module: DashboardModuleInput): ModuleContribution {
  const adapter = MODULE_ADAPTERS[module.key] ?? unknownAdapter;
  return adapter(module.label, module.report);
}

export function buildDashboardOverview(input: {
  modules: DashboardModuleInput[];
}): DashboardOverviewData {
  const contributions = input.modules.map(contributeModule);
  const hasAnyReport = contributions.some((c) => c.hasReport);

  const metrics: DashboardMetric[] = contributions.flatMap((c) => c.metrics);

  const maxRisk = Math.max(0, ...contributions.map((c) => c.riskScore));
  const openActions = contributions.reduce((sum, c) => sum + c.openActions, 0);
  const protectionScore = hasAnyReport ? clampScore(100 - maxRisk * 0.85) : 0;
  const protect = protectLabel(protectionScore);

  metrics.push({
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
    info: "Zusammenfassung aus den aktiven Analyseberichten.",
  });

  const riskSignals: RiskSignal[] = [];
  for (const c of contributions) {
    for (const signal of c.riskSignals) {
      if (riskSignals.length >= 3) break;
      if (riskSignals.some((existing) => existing.id === signal.id)) continue;
      riskSignals.push(signal);
    }
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
        : "Starten Sie eine Analyse im Analysecenter.",
      source: "Dashboard",
      info: "Risikosignale erscheinen nach abgeschlossenen Analysen.",
    });
  }

  const recommendations: Recommendation[] = contributions.flatMap(
    (c) => c.recommendations
  );
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
        : "Führen Sie eine Analyse im Analysecenter aus, um Empfehlungen zu erhalten.",
      priority: "Empfohlen",
      completed: false,
    });
  }

  const analysisSources: AnalysisSource[] = contributions.flatMap(
    (c) => c.analysisSources
  );

  const lastIso =
    contributions
      .map((c) => c.lastAnalysisAt)
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;

  const googleContribution = contributions.find((c) =>
    c.summaryBits.includes("Google")
  );
  const googleOverall = input.modules.find(
    (m) => m.key === "google_search" && isGoogleReport(m.report)
  )?.report;
  const googleScore =
    googleOverall && isGoogleReport(googleOverall)
      ? googleOverall.scorecard?.overallScore
      : undefined;

  const securityScore = hasAnyReport
    ? clampScore(googleScore ?? 100 - maxRisk * 0.8)
    : 0;

  const summaryLabels = [
    ...new Set(contributions.flatMap((c) => c.summaryBits)),
  ];
  const security: DashboardSecurityStatus = {
    score: securityScore,
    monitoringLabel: hasAnyReport ? "AKTIV" : "INAKTIV",
    lastAnalysisLabel: formatRelativeDe(lastIso),
    openActionsLabel: `${openActions} priorisierte Maßnahmen`,
    summaryText: hasAnyReport
      ? `Aus ${summaryLabels.join("- und ")}-Analysen abgeleitet. ${openActions} priorisierte Maßnahme(n) können Ihren Schutzstatus verbessern.`
      : "Noch keine Analyseergebnisse vorhanden. Starten Sie eine Analyse im Analysecenter.",
  };

  const reportCount = contributions.filter((c) => c.hasReport).length;
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

  const signalCount = contributions.reduce((sum, c) => sum + c.signalCount, 0);

  // Prefer google signal count for the widget when google is active with a report
  const displaySignalCount =
    googleContribution?.hasReport && googleContribution.signalCount > 0
      ? googleContribution.signalCount
      : signalCount;

  return {
    metrics,
    riskSignals: riskSignals.slice(0, 3),
    recommendations: topRecommendations,
    analysisSources,
    security,
    monitoring,
    signalCount: displaySignalCount,
    riskSignalCount: riskSignals.slice(0, 3).length,
    hasAnyReport,
  };
}
