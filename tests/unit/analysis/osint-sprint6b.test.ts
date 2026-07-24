import { describe, expect, it } from "vitest";
import { planGoogleSearches } from "@/lib/analysis/osint/search-planner";
import { scoreIdentityConfidence } from "@/lib/analysis/osint/confidence-scorer";
import { verifyAndPartitionHits } from "@/lib/analysis/osint/result-verifier";
import {
  buildSourceLinks,
  linkifySummaryText,
} from "@/lib/analysis/osint/source-link-builder";
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
    id: partial.id ?? "serp-1",
    query: partial.query ?? "q",
    title: partial.title ?? "Title",
    url: partial.url ?? "https://example.com/a",
    snippet: partial.snippet ?? "Snippet",
    category: partial.category ?? "name",
    fetchedAt: partial.fetchedAt ?? new Date().toISOString(),
    source: partial.source ?? "example.com",
    sourceType: partial.sourceType ?? "serpapi_google",
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
    identityConfidence: partial.identityConfidence,
    identityConfidenceLabel: partial.identityConfidenceLabel,
    ...partial,
  };
}

describe("SearchPlanner", () => {
  it("plans at most 15 hybrid recon queries without duplicates", () => {
    const plans = planGoogleSearches(identity());
    expect(plans.length).toBeLessThanOrEqual(15);
    expect(plans.length).toBeGreaterThanOrEqual(7);
    const joined = plans.map((p) => p.query).join(" ");
    expect(joined).toContain("Anna Beispiel");
    expect(joined).toContain("Berlin");
    expect(plans[0]?.label).toBe("Name + Wohnort");
    expect(plans.some((p) => p.query.includes("anna@beispiel.de"))).toBe(true);
    expect(
      plans.some(
        (p) => p.query.includes("170 1234567") || p.query.includes("+49")
      )
    ).toBe(true);
    expect(plans.some((p) => p.engine === "bing")).toBe(true);
    const keys = plans.map((p) => `${p.engine}:${p.query.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("ConfidenceScorer", () => {
  it("scores name+location+email highly", () => {
    const result = scoreIdentityConfidence(
      hit({
        title: "Anna Beispiel — Berlin",
        snippet: "Kontakt anna@beispiel.de",
        url: "https://linkedin.com/in/anna",
        category: "social",
      }),
      {
        subjectName: "Anna Beispiel",
        firstName: "Anna",
        lastName: "Beispiel",
        location: "Berlin",
        emails: ["anna@beispiel.de"],
      }
    );
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("keeps alias matches high even without full name", () => {
    const result = scoreIdentityConfidence(
      hit({
        title: "User anna_beispiel",
        snippet: "Profil anna.b",
        url: "https://github.com/anna_beispiel",
      }),
      {
        subjectName: "Anna Beispiel",
        firstName: "Anna",
        lastName: "Beispiel",
        aliases: ["anna_beispiel", "anna.b"],
      }
    );
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("penalizes last-name-only matches without strong signals", () => {
    const result = scoreIdentityConfidence(
      hit({
        title: "Max Beispiel in Hamburg",
        snippet: "anderer Vorname",
      }),
      {
        subjectName: "Anna Beispiel",
        firstName: "Anna",
        lastName: "Beispiel",
        location: "Berlin",
      }
    );
    expect(result.score).toBeLessThan(50);
  });
});

describe("ResultVerifier", () => {
  it("hides hits under 50 and partitions 50–69 as possible", () => {
    const { verified, possible, discarded, displayHits } =
      verifyAndPartitionHits([
        hit({ id: "a", identityConfidence: 88 }),
        hit({ id: "b", identityConfidence: 55, url: "https://example.com/b" }),
        hit({ id: "c", identityConfidence: 20, url: "https://example.com/c" }),
      ]);
    expect(verified.map((h) => h.id)).toEqual(["a"]);
    expect(possible.map((h) => h.id)).toEqual(["b"]);
    expect(discarded.map((h) => h.id)).toEqual(["c"]);
    expect(displayHits.map((h) => h.id)).toEqual(["a", "b"]);
  });
});

describe("SourceLinkBuilder + Gemini payload", () => {
  it("builds clickable sources and verified-only gemini payload", () => {
    const hits = [
      hit({
        id: "1",
        title: "Steam Profil",
        url: "https://steamcommunity.com/id/anna",
        identityConfidence: 80,
        source: "steamcommunity.com",
      }),
      hit({
        id: "2",
        title: "Weak",
        url: "https://example.com/weak",
        identityConfidence: 40,
      }),
    ];
    const links = buildSourceLinks(hits);
    expect(links.some((l) => l.platform === "Steam")).toBe(true);
    expect(links.every((l) => l.confidence >= 70)).toBe(true);

    const text = linkifySummaryText("Gefunden auf Steam und woanders.", links);
    expect(text).toContain("[Steam](https://steamcommunity.com/id/anna)");

    const { verifiedHits, prompt } = buildVerifiedGeminiPayload(
      "Anna Beispiel",
      "medium",
      hits
    );
    expect(verifiedHits).toHaveLength(1);
    expect(prompt).toContain("Management-Zusammenfassung");
    expect(prompt).not.toContain("https://example.com/weak");
  });
});
