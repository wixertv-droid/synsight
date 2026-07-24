import { describe, expect, it } from "vitest";
import { planScoredGoogleSearches } from "@/lib/analysis/osint/search-planner";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";
import { aggregateProfiles } from "@/lib/analysis/osint/profile-aggregator";
import { evaluateThreatMatrix } from "@/lib/analysis/osint/threat-evaluator";
import { buildVerifiedGeminiPayload } from "@/lib/analysis/osint/gemini-summary-builder";
import type { IntelligenceHit } from "@/lib/analysis/types";
import type { IdentityView } from "@/lib/services/identity-service";

function identity(): IdentityView {
  return {
    personal: {
      firstName: "Anna",
      lastName: "Beispiel",
      birthDate: "1990-01-01",
      gender: "female",
      phone: "+49 170 1234567",
      addressLine: "Musterstraße 1",
      location: "Berlin",
      previousLocations: [],
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
    socialAccounts: [],
    websites: ["https://anna-beispiel.de"],
    domains: [],
    companies: [],
    images: [],
    completenessPercent: 80,
  };
}

function hit(partial: Partial<IntelligenceHit>): IntelligenceHit {
  return {
    id: "serp-1",
    query: "q",
    title: "Title",
    url: "https://example.com/a",
    snippet: "Snippet",
    category: "name",
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
    ...partial,
  };
}

describe("Sprint 6C enterprise OSINT", () => {
  it("builds identity fingerprint hash", () => {
    const fp = buildIdentityFingerprint(identity());
    expect(fp.hash).toHaveLength(16);
    expect(fp.emails).toContain("anna@beispiel.de");
    expect(fp.phones[0]).toContain("170");
  });

  it("scores recon matrix with Direct Identifiers first and max 12", () => {
    const plans = planScoredGoogleSearches(identity());
    expect(plans.length).toBeLessThanOrEqual(12);
    expect(plans.length).toBeGreaterThanOrEqual(7);
    expect(plans[0]?.searchScore).toBeGreaterThanOrEqual(
      plans[plans.length - 1]?.searchScore ?? 0
    );
    expect(plans[0]?.label).toBe("Direct Identifiers");
    expect(plans[0]?.searchScore).toBe(100);
    expect(plans[0]?.engine).toBe("google");
  });

  it("includes Bing adult and forum vectors in recon strategy", () => {
    const plans = planScoredGoogleSearches(identity());
    expect(plans.some((p) => p.engine === "bing")).toBe(true);
    expect(plans.some((p) => p.id === "v-adult-niche")).toBe(true);
    expect(
      plans.every((p) => p.engine === "google" || p.engine === "bing")
    ).toBe(true);
    expect(plans.some((p) => p.query.includes("linkedin.com"))).toBe(true);
    expect(plans.some((p) => p.query.includes("filetype:pdf"))).toBe(true);
  });

  it("aggregates same-host pages into one profile", () => {
    const { aggregatedHits, profiles } = aggregateProfiles([
      hit({
        id: "1",
        url: "https://www.nexusmods.com/user/1",
        identityConfidence: 80,
        source: "nexusmods.com",
      }),
      hit({
        id: "2",
        url: "https://www.nexusmods.com/user/1/posts",
        identityConfidence: 75,
        source: "nexusmods.com",
      }),
      hit({
        id: "3",
        url: "https://steamcommunity.com/id/x",
        identityConfidence: 82,
        source: "steamcommunity.com",
      }),
    ]);
    expect(
      profiles.some((p) => p.host === "nexusmods.com" && p.pageCount === 2)
    ).toBe(true);
    expect(
      aggregatedHits.filter(
        (h) =>
          h.sourceType === "serpapi_google" || h.sourceType === "serpapi_bing"
      )
    ).toHaveLength(2);
  });

  it("builds facts-only gemini prompt structure", () => {
    const { prompt } = buildVerifiedGeminiPayload("Anna Beispiel", "medium", [
      hit({
        identityConfidence: 85,
        url: "https://steamcommunity.com/id/anna",
        title: "Steam",
        source: "steamcommunity.com",
      }),
    ]);
    expect(prompt).toContain("Senior OSINT Intelligence Analyst");
    expect(prompt).toContain("Digitales Kurzprofil");
    expect(prompt).toContain("Du erfindest nichts");
    expect(prompt).toContain("VERBOTENE FORMULIERUNGEN");
  });

  it("evaluates multi-dimensional threat matrix", () => {
    const matrix = evaluateThreatMatrix([
      hit({
        identityConfidence: 90,
        title: "Kontakt anna@beispiel.de",
        snippet: "Telefon +49 170 1234567",
        url: "https://example.com/contact",
      }),
    ]);
    expect(matrix.privacyRisk).toBeGreaterThan(0);
    expect(matrix.overall).toBeGreaterThan(0);
  });
});
