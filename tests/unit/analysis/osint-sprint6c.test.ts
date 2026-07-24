import { describe, expect, it } from "vitest";
import { planScoredGoogleSearches } from "@/lib/analysis/osint/search-planner";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";
import { aggregateProfiles } from "@/lib/analysis/osint/profile-aggregator";
import { evaluateThreatMatrix } from "@/lib/analysis/osint/threat-evaluator";
import { buildVerifiedGeminiPayload } from "@/lib/analysis/osint/gemini-summary-builder";
import {
  scoreConfidenceBandLabel,
  scoreIdentityConfidence,
} from "@/lib/analysis/osint/score-engine";
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

  it("plans priority searches: name+location before email/phone, max 15", () => {
    const plans = planScoredGoogleSearches(identity());
    expect(plans.length).toBeLessThanOrEqual(15);
    expect(plans.length).toBeGreaterThanOrEqual(7);
    expect(plans[0]?.vector).toBe("identity_location");
    expect(plans[0]?.searchScore).toBe(100);
    expect(plans.some((p) => p.vector === "identity_professional")).toBe(true);
    expect(plans.some((p) => p.vector === "identity")).toBe(true);
    expect(plans.some((p) => p.vector === "email")).toBe(true);
    expect(plans.some((p) => p.vector === "phone")).toBe(true);
    expect(
      plans.some((p) => p.vector === "alias" || p.vector === "username")
    ).toBe(true);
    expect(plans.some((p) => p.vector === "domains")).toBe(true);
    // Core identity must outrank adult niche
    const nameScore =
      plans.find((p) => p.vector === "identity_location")?.searchScore ?? 0;
    const adultScore =
      plans.find((p) => p.vector === "adult_alias")?.searchScore ?? 0;
    expect(nameScore).toBeGreaterThan(adultScore);
  });

  it("keeps Google+Bing engines without duplicate queries", () => {
    const plans = planScoredGoogleSearches(identity());
    expect(plans.some((p) => p.engine === "bing")).toBe(true);
    expect(
      plans.every((p) => p.engine === "google" || p.engine === "bing")
    ).toBe(true);
    const keys = plans.map(
      (p) => `${p.engine}:${p.query.toLowerCase().replace(/\s+/g, " ").trim()}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses Sprint 6C confidence band labels", () => {
    expect(scoreConfidenceBandLabel(95)).toBe("Bestätigt");
    expect(scoreConfidenceBandLabel(80)).toBe("Hohe Übereinstimmung");
    expect(scoreConfidenceBandLabel(55)).toBe("Möglicher Treffer");
    expect(scoreConfidenceBandLabel(40)).toBe("Nicht anzeigen");

    const scored = scoreIdentityConfidence(
      {
        title: "Anna Beispiel Berlin SynSight GmbH",
        snippet: "Profil von Anna Beispiel in Berlin",
        url: "https://example.com/anna",
        category: "name",
        sourceType: "serpapi_google",
      },
      {
        subjectName: "Anna Beispiel",
        firstName: "Anna",
        lastName: "Beispiel",
        location: "Berlin",
        company: "SynSight GmbH",
        emails: [],
        phones: [],
        aliases: [],
      }
    );
    expect(scored.score).toBeGreaterThanOrEqual(70);
    expect(["Bestätigt", "Hohe Übereinstimmung"]).toContain(scored.label);
    expect(
      scored.checks.some((c) => c.label === "Vorname gefunden" && c.found)
    ).toBe(true);
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

  it("builds facts-only digital forensics gemini prompt", () => {
    const { prompt } = buildVerifiedGeminiPayload("Anna Beispiel", "medium", [
      hit({
        identityConfidence: 85,
        url: "https://steamcommunity.com/id/anna",
        title: "Steam",
        source: "steamcommunity.com",
      }),
    ]);
    expect(prompt).toContain("Senior Digital Forensics Analyst");
    expect(prompt).toContain("Digitales Identitätsprofil");
    expect(prompt).toContain("Du erfindest nichts");
    expect(prompt).toContain("VERBOTENE FORMULIERUNGEN");
    expect(prompt).toContain("Keine Charakter");
  });

  it("evaluates multi-dimensional threat matrix", () => {
    const matrix = evaluateThreatMatrix([
      hit({
        identityConfidence: 90,
        risk: "action",
        isProblematic: true,
        category: "leak",
      }),
    ]);
    expect(matrix.overall).toBeGreaterThan(0);
  });
});
