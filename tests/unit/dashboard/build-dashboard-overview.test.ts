import { describe, expect, it } from "vitest";
import { buildDashboardOverview } from "@/lib/dashboard/build-dashboard-overview";
import type { IntelligenceReport } from "@/lib/analysis/types";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";

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

describe("buildDashboardOverview", () => {
  it("maps google + leak reports into dashboard slots", () => {
    const overview = buildDashboardOverview({
      google: googleStub(),
      exposure: leakStub(),
    });
    expect(overview.hasAnyReport).toBe(true);
    expect(overview.metrics[0]?.value).toBe("6");
    expect(overview.metrics[1]?.value).toBe("1");
    expect(overview.metrics[2]?.value).toBe("68%");
    expect(overview.security.score).toBeGreaterThan(0);
    expect(overview.recommendations.length).toBeGreaterThan(0);
    expect(
      overview.riskSignals.some((r) => /leck|Passwort|Adobe/i.test(r.title))
    ).toBe(true);
    expect(overview.monitoring[1]?.value).toContain("2");
  });

  it("returns empty-state values without inventing demo KPIs", () => {
    const overview = buildDashboardOverview({ google: null, exposure: null });
    expect(overview.hasAnyReport).toBe(false);
    expect(overview.metrics[0]?.value).toBe("0");
    expect(overview.security.score).toBe(0);
    expect(overview.monitoring[0]?.value).toBe("Inaktiv");
  });
});
