import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildGoogleQueriesFromIdentity } from "@/lib/analysis/google/queries";
import { runGoogleIntelligenceAnalysis } from "@/lib/analysis/google/run-analysis";
import { clearIntelligenceReportsForTests } from "@/lib/analysis/session-store";
import type { IdentityView } from "@/lib/services/identity-service";

vi.mock("@/lib/analysis/google/custom-search", () => ({
  isGoogleSearchConfigured: vi.fn(async () => false),
  fetchGoogleSearch: vi.fn(async () => []),
}));

vi.mock("@/lib/analysis/gemini-summary", () => ({
  summarizeWithGemini: vi.fn(async () => null),
}));

function sampleIdentity(): IdentityView {
  return {
    personal: {
      firstName: "Anna",
      lastName: "Beispiel",
      birthDate: "1990-01-01",
      gender: "female",
      phone: "+49 170 1234567",
      addressLine: "Musterstraße 1",
      location: "Berlin",
      previousLocations: ["Hamburg"],
      company: "SynSight GmbH",
    },
    aliases: {
      publicAlias: "anna.b",
      nicknames: [],
      formerNames: [],
      usernames: ["anna_beispiel"],
      gamingNames: [],
    },
    emails: ["anna@beispiel.de"],
    phoneNumbers: [],
    socialAccounts: [
      {
        platform: "LinkedIn",
        username: "anna-beispiel",
        profileUrl: "https://www.linkedin.com/in/anna-beispiel",
        accountStatus: "active",
      },
    ],
    websites: ["https://anna-beispiel.de"],
    domains: [],
    companies: [],
    images: [],
    completenessPercent: 80,
  };
}

describe("buildGoogleQueriesFromIdentity", () => {
  it("builds at most 5 queries only from profile fields", () => {
    const queries = buildGoogleQueriesFromIdentity(sampleIdentity());
    expect(queries.length).toBeLessThanOrEqual(5);
    const joined = queries.map((q) => q.query).join(" ");
    expect(joined).toContain("Anna Beispiel");
    expect(joined).toContain("anna@beispiel.de");
    expect(joined).toContain("SynSight GmbH");
    expect(joined).toContain("+49 170 1234567");
  });
});

describe("runGoogleIntelligenceAnalysis", () => {
  beforeEach(() => {
    clearIntelligenceReportsForTests();
  });

  it("does not fabricate SERP hits when API is not configured", async () => {
    const report = await runGoogleIntelligenceAnalysis(sampleIdentity());
    const serpHits = report.hits.filter(
      (h) => h.sourceType === "serpapi_google"
    );
    expect(serpHits).toHaveLength(0);
    expect(report.apiConfigured).toBe(false);
    expect(report.queries.length).toBeGreaterThan(0);
  });

  it("includes profile-linked hits separately labeled", async () => {
    const report = await runGoogleIntelligenceAnalysis(sampleIdentity());
    const profileHits = report.hits.filter(
      (h) => h.sourceType === "identity_profile"
    );
    expect(profileHits.length).toBeGreaterThan(0);
    expect(profileHits.every((h) => h.status === "profile_only")).toBe(true);
    expect(report.managementOverview.mentions).toBe(report.hits.length);
    expect(report.recommendations[0]?.why).toBeTruthy();
    expect(report.aiSummary).toBeNull();
    expect(
      report.recommendations.some((item) =>
        item.title.includes("Live-Google-Suche")
      )
    ).toBe(false);
    expect(report.summaryText).not.toMatch(/nicht konfiguriert/i);
  });
});
