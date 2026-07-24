import { describe, expect, it } from "vitest";
import {
  exactAliasMatch,
  scoreIdentityConfidence,
} from "@/lib/analysis/osint/score-engine";
import { planScoredGoogleSearches } from "@/lib/analysis/osint/search-planner";
import type { IntelligenceHit } from "@/lib/analysis/types";
import type { IdentityView } from "@/lib/services/identity-service";

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

describe("exactAliasMatch", () => {
  it("matches exact alias in text/url without fuzzy partials", () => {
    expect(exactAliasMatch("Profil Anja1921 auf JoyClub", "Anja1921")).toBe(
      true
    );
    expect(
      exactAliasMatch("https://joyclub.de/member/Luder-Anja", "Luder-Anja")
    ).toBe(true);
    // Luna darf nicht aus Luder-Anja entstehen
    expect(exactAliasMatch("Profil Luder-Anja", "Luna")).toBe(false);
    expect(exactAliasMatch("User Luna online", "Luna")).toBe(true);
  });
});

describe("score-engine hard rules", () => {
  it("gives alias-only adult hit score >= 90 without real name", () => {
    const result = scoreIdentityConfidence(
      hit({
        title: "Anja1921 — Profil",
        snippet: "Mitglied seit 2019",
        url: "https://www.joyclub.de/member/Anja1921",
        category: "adult",
        sourceType: "serpapi_bing",
      }),
      {
        subjectName: "Anja Muster",
        firstName: "Anja",
        lastName: "Muster",
        location: "Gera",
        locations: ["Gera"],
        aliases: ["Anja1921", "Luder-Anja", "Luna"],
      }
    );
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("penalizes namensvetter with foreign major city", () => {
    const result = scoreIdentityConfidence(
      hit({
        title: "Anja Muster — Fachärztin Berlin",
        snippet: "Praxis in Berlin-Mitte",
        url: "https://arzt-berlin.example/anja-muster",
      }),
      {
        subjectName: "Anja Muster",
        firstName: "Anja",
        lastName: "Muster",
        location: "Gera",
        locations: ["Gera"],
        aliases: [],
      }
    );
    expect(result.score).toBeLessThan(50);
    expect(result.negatives.some((n) => /Namensvetter/i.test(n))).toBe(true);
  });
});

describe("per-alias Bing adult queries", () => {
  it("builds one exact Bing adult query per username", () => {
    const identity: IdentityView = {
      personal: {
        firstName: "Anja",
        lastName: "Muster",
        birthDate: "",
        gender: "",
        phone: "",
        addressLine: "",
        location: "Gera",
        previousLocations: [],
        company: "",
      },
      aliases: {
        publicAlias: "",
        nicknames: [],
        formerNames: [],
        usernames: ["Anja1921", "Luder-Anja", "Luna"],
        gamingNames: [],
      },
      emails: [],
      phoneNumbers: [],
      socialAccounts: [],
      websites: [],
      domains: [],
      companies: [],
      images: [],
      completenessPercent: 40,
    };
    const plans = planScoredGoogleSearches(identity);
    const adult = plans.filter((p) => p.vector === "adult_alias");
    expect(adult.length).toBe(3);
    expect(adult.every((p) => p.engine === "bing")).toBe(true);
    expect(adult.some((p) => p.query.startsWith('"Anja1921"'))).toBe(true);
    expect(adult.some((p) => p.query.includes("einfachgeiler.com"))).toBe(true);
    expect(adult.every((p) => /"[^"]+" \(site:joyclub/.test(p.query))).toBe(
      true
    );
  });
});
