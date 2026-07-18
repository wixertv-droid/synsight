import { describe, expect, it } from "vitest";
import { buildGoogleSearchReport } from "@/lib/dashboard/google-search-report";
import type { IdentityView } from "@/lib/services/identity-service";

function sampleIdentity(overrides: Partial<IdentityView> = {}): IdentityView {
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
      nicknames: ["Annie"],
      formerNames: [],
      usernames: ["anna_beispiel"],
      gamingNames: [],
    },
    emails: ["anna@beispiel.de", "a.beispiel@firma.de"],
    phoneNumbers: ["+49 30 123456"],
    socialAccounts: [
      {
        platform: "LinkedIn",
        username: "anna-beispiel",
        profileUrl: "https://www.linkedin.com/in/anna-beispiel",
        accountStatus: "active",
      },
    ],
    websites: ["https://anna-beispiel.de"],
    domains: ["beispiel.de"],
    companies: ["SynSight GmbH"],
    images: [
      {
        imageType: "front",
        storagePath: "/uploads/anna.jpg",
      },
    ],
    completenessPercent: 92,
    ...overrides,
  };
}

describe("buildGoogleSearchReport", () => {
  it("builds queries and hits from profile fields", () => {
    const report = buildGoogleSearchReport(sampleIdentity());

    expect(report.subjectName).toBe("Anna Beispiel");
    expect(report.hits.length).toBeGreaterThanOrEqual(8);
    expect(report.queries.length).toBeGreaterThanOrEqual(5);
    expect(report.profileCompleteness).toBe(92);

    const queryTexts = report.queries.map((q) => q.query).join(" ");
    expect(queryTexts).toContain("Anna Beispiel");
    expect(queryTexts).toContain("anna@beispiel.de");
    expect(queryTexts).toContain("+49 170 1234567");
    expect(queryTexts).toContain("SynSight GmbH");

    const categories = new Set(report.hits.map((h) => h.category));
    expect(categories.has("name")).toBe(true);
    expect(categories.has("email")).toBe(true);
    expect(categories.has("phone")).toBe(true);
    expect(categories.has("company")).toBe(true);
    expect(categories.has("social")).toBe(true);
    expect(categories.has("website")).toBe(true);
  });

  it("still returns a baseline report for empty profiles", () => {
    const report = buildGoogleSearchReport(null);
    expect(report.subjectName).toBe("Max Mustermann");
    expect(report.hits.length).toBeGreaterThanOrEqual(2);
    expect(report.queries.length).toBeGreaterThanOrEqual(1);
    expect(report.missingProfileHints.length).toBeGreaterThan(0);
  });

  it("assigns risk based on contact exposure", () => {
    const report = buildGoogleSearchReport(sampleIdentity());
    expect(["low", "medium", "high"]).toContain(report.riskLevel);
    expect(report.riskScore).toBeGreaterThan(30);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
