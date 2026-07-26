import { describe, expect, it } from "vitest";
import { buildDashboardOverview } from "@/lib/dashboard/build-dashboard-overview";
import type { IntelligenceReport } from "@/lib/analysis/types";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { UsernameReport } from "@/lib/analysis/username/types";

function googleStub(): IntelligenceReport {
  return {
    moduleKey: "google_search",
    moduleTitle: "Google",
    subjectName: "Anna Beispiel",
    generatedAt: new Date().toISOString(),
    generatedAtLabel: "gerade eben",
    retentionDays: 30,
    expiresAt: null,
    profileCompleteness: 80,
    dataSourceLabel: "SerpAPI",
    apiConfigured: true,
    riskScore: 55,
    riskLevel: "medium",
    summaryText: "ok",
    aiSummary: null,
    managementOverview: {
      websites: 4,
      social: 3,
      images: 1,
      phones: 0,
      emails: 1,
      companies: 1,
      documents: 0,
      press: 0,
      forums: 1,
      other: 0,
      mentions: 6,
    },
    buckets: { total: 6, relevant: 4, neutral: 1, low: 1, stale: 0 },
    queries: [],
    hits: [
      {
        id: "h1",
        query: "q",
        title: "Profil",
        url: "https://example.com",
        snippet: "Anna",
        category: "social",
        fetchedAt: new Date().toISOString(),
        source: "example.com",
        sourceType: "serpapi_google",
        visibility: "public_index",
        relevance: "relevant",
        risk: "watch",
        status: "verified",
        whyFound: "",
        whyRelevant: "",
        visibleData: "",
        isPublic: true,
        isProblematic: false,
        risks: "",
        canIgnore: true,
        shouldAct: false,
        recommendation: "",
        identityConfidence: 80,
        severity: "medium",
        filterCategory: "social",
      },
    ],
    recommendations: [
      {
        title: "Profil prüfen",
        detail: "Sichtbarkeit reduzieren",
        why: "öffentlich",
        danger: "gering",
        howToFix: "Einstellungen ändern",
        effort: "10 Min.",
        priority: "Jetzt",
        difficulty: "Niedrig",
        relatedHitIds: [],
      },
    ],
    executive: {
      totalPublicHits: 6,
      criticalHits: 0,
      recommendedActions: ["Profil prüfen"],
      overallRisk: "medium",
      priority: "Diese Woche",
      narrative: "test",
    },
    missingProfileHints: [],
    scorecard: {
      overallScore: 62,
      privacyScore: 55,
      publicVisibility: 68,
      identityRisk: 40,
      likelyMeCount: 1,
      criticalCount: 0,
      highCount: 0,
      totalLive: 6,
    },
  };
}

function leakStub(): DigitalExposureReport {
  return {
    scanId: 1,
    moduleKey: "digital_leak_exposure",
    subjectName: "Anna Beispiel",
    status: "completed",
    riskScore: 72,
    summary: "Leaks gefunden",
    emailCount: 1,
    phoneCount: 0,
    findingCount: 2,
    startedAt: null,
    completedAt: new Date().toISOString(),
    findings: [
      {
        type: "BREACH",
        title: "Adobe",
        description: "Leak Adobe",
        riskLevel: "high",
        sourceName: "Adobe",
        sourceDate: "2013",
        recommendation: "Passwort ändern",
        sourceUrl: null,
        identifierMasked: "a***@x.de",
        dataClasses: ["E-Mail-Adresse"],
      },
    ],
    geminiPrep: {
      mode: "facts_only",
      instructions: "x",
      subjectName: "Anna",
      riskScore: 72,
      findings: [],
      constraints: [],
    },
    managementOverview: {
      headline: "Leaks gefunden",
      overallRisk: "high",
      overallRiskLabel: "HOCH",
      identityExposure: 72,
      threatLevel: "HIGH",
      confidence: 95,
      confirmedSources: 1,
      exposedAttributeCount: 2,
      exposedCategories: ["E-Mail-Adresse"],
      hasPasswordHints: false,
      hasPublicEmail: true,
      hasPublicPhone: false,
    },
    actions: [
      {
        priority: "SOFORT",
        title: "Passwort ändern",
        why: "Leak",
        riskReduced: "ATO",
        how: "Jetzt ändern",
        effort: "10 Min.",
        difficulty: "Niedrig",
        benefit: "Schutz",
        relatedSource: "Adobe",
      },
    ],
    apiConfigured: true,
    providerLabel: "DeHashed",
  };
}

function usernameStub(): UsernameReport {
  return {
    analysisId: 1,
    moduleKey: "username_intelligence",
    subjectName: "Anna Beispiel",
    subjectUsername: "anna42",
    status: "completed",
    identityScore: 80,
    riskScore: 45,
    confidence: 70,
    summary: "Treffer",
    hitCount: 3,
    queryCount: 2,
    startedAt: null,
    completedAt: new Date().toISOString(),
    hits: [
      {
        id: "u1",
        platform: "GitHub",
        category: "dev",
        profileName: "anna42",
        profileUrl: "https://github.com/anna42",
        title: "anna42",
        snippet: "dev",
        visibleInfo: ["repos"],
        identityScore: 80,
        confidence: 90,
        confidenceBand: "likely",
        riskLevel: "high",
        firstSeen: null,
        queryUsed: "anna42",
        logoKey: "github",
        isProblematic: true,
        problemTags: ["exposed"],
      },
    ],
    managementOverview: {
      headline: "Treffer",
      overallRisk: "medium",
      overallRiskLabel: "MITTEL",
      identityScore: 80,
      threatLevel: "MEDIUM",
      confidence: 70,
      platformCount: 2,
      hitCount: 3,
      uniqueUsername: false,
      problematicCount: 1,
      topCategories: ["dev"],
    },
    platformOverview: [],
    identityGraph: { nodes: [], edges: [] },
    timeline: [],
    heatmap: [],
    actions: [
      {
        priority: "HOCH",
        title: "GitHub prüfen",
        why: "öffentlich",
        riskReduced: "OSINT",
        how: "Profil privat stellen",
        selfGuide: ["Einloggen", "Profil privat stellen"],
        effort: "5 Min.",
        effortMinutes: 5,
        difficulty: "Niedrig",
        benefit: "Weniger Sichtbarkeit",
        relatedPlatform: "GitHub",
        relatedHitId: null,
        relatedUrl: null,
        ampel: "orange",
        orderType: "profile_delete",
      },
    ],
    aiSummary: null,
    queries: [],
    apiConfigured: true,
    providerLabel: "SerpAPI",
  };
}

describe("buildDashboardOverview", () => {
  it("maps google + leak reports into dashboard slots", () => {
    const overview = buildDashboardOverview({
      modules: [
        { key: "google_search", label: "Google Analyse", report: googleStub() },
        {
          key: "digital_leak_exposure",
          label: "Digital Leak",
          report: leakStub(),
        },
      ],
    });
    expect(overview.hasAnyReport).toBe(true);
    const byLabel = Object.fromEntries(
      overview.metrics.map((m) => [m.label, m])
    );
    expect(byLabel["Digitale Spuren"]?.value).toBe("6");
    expect(byLabel["Datenleck-Risiko"]?.value).toBe("1");
    expect(byLabel["Online-Sichtbarkeit"]?.value).toBe("68%");
    expect(overview.security.score).toBeGreaterThan(0);
    expect(overview.recommendations.length).toBeGreaterThan(0);
    expect(
      overview.riskSignals.some((r) => /leck|Passwort|Adobe/i.test(r.title))
    ).toBe(true);
    expect(overview.monitoring[1]?.value).toContain("2");
  });

  it("includes username metrics when username module is active", () => {
    const overview = buildDashboardOverview({
      modules: [
        {
          key: "username_intelligence",
          label: "Username Intelligence",
          report: usernameStub(),
        },
      ],
    });
    expect(overview.hasAnyReport).toBe(true);
    expect(
      overview.metrics.some(
        (m) => m.label === "Username-Treffer" && m.value === "3"
      )
    ).toBe(true);
    expect(overview.analysisSources.some((s) => s.label === "Usernames")).toBe(
      true
    );
    expect(overview.recommendations.some((r) => /GitHub/i.test(r.title))).toBe(
      true
    );
  });

  it("shows neutral pending tiles for unknown active modules", () => {
    const overview = buildDashboardOverview({
      modules: [{ key: "future_module", label: "Future Scan", report: null }],
    });
    expect(overview.hasAnyReport).toBe(false);
    expect(
      overview.metrics.some((m) => m.label === "Future Scan" && m.value === "—")
    ).toBe(true);
  });

  it("returns empty-state values without inventing demo KPIs", () => {
    const overview = buildDashboardOverview({
      modules: [
        { key: "google_search", label: "Google Analyse", report: null },
        {
          key: "digital_leak_exposure",
          label: "Digital Leak",
          report: null,
        },
      ],
    });
    expect(overview.hasAnyReport).toBe(false);
    expect(
      overview.metrics.find((m) => m.label === "Digitale Spuren")?.value
    ).toBe("—");
    expect(overview.security.score).toBe(0);
    expect(overview.monitoring[0]?.value).toBe("Inaktiv");
  });
});
