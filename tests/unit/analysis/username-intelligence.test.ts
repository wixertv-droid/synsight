import { describe, expect, it } from "vitest";
import {
  confidenceBand,
  confidenceLabel,
  evaluateUsernameHit,
  scoreUsernameHit,
} from "@/lib/analysis/username/confidence";
import {
  buildSecurityOverview,
  splitPrimaryAndWeakHits,
} from "@/lib/analysis/username/report-metrics";
import type { UsernameHit } from "@/lib/analysis/username/types";
import {
  detectPlatform,
  detectProblemTags,
} from "@/lib/analysis/username/platform-detect";
import { planUsernameQueries } from "@/lib/analysis/username/search-planner";
import { computeUsernameFinance } from "@/lib/analysis/username/finance";
import { DEFAULT_USERNAME_MODULE_SETTINGS } from "@/lib/analysis/username/types";
import type { IdentityView } from "@/lib/services/identity-service";

function baseIdentity(overrides?: Partial<IdentityView>): IdentityView {
  return {
    personal: {
      firstName: "Max",
      lastName: "Mustermann",
      birthDate: "",
      gender: "",
      phone: "",
      addressLine: "",
      location: "Berlin",
      previousLocations: [],
      company: "SynSight",
    },
    aliases: {
      publicAlias: "maxbyte",
      nicknames: [],
      formerNames: [],
      usernames: ["maxbyte"],
      gamingNames: ["maxbyte_gaming"],
    },
    emails: ["max@example.de"],
    phoneNumbers: [],
    socialAccounts: [],
    websites: ["https://github.com/maxbyte"],
    domains: [],
    companies: ["SynSight"],
    images: [],
    completenessPercent: 70,
    ...overrides,
  };
}

describe("username intelligence helpers", () => {
  it("plans queries across all identity usernames", () => {
    const identity = baseIdentity({
      aliases: {
        publicAlias: "maxbyte",
        nicknames: [],
        formerNames: [],
        usernames: ["maxbyte", "MaxByte99", "m.byte"],
        gamingNames: ["maxbyte_gaming"],
      },
    });
    const { username, usernames, queries } = planUsernameQueries(identity, 8);
    expect(username).toBe("maxbyte");
    expect(usernames.length).toBeGreaterThanOrEqual(3);
    expect(queries.length).toBeGreaterThanOrEqual(5);
    expect(queries.length).toBeLessThanOrEqual(8);
    const keys = queries.map((q) => q.query.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(queries.some((q) => q.username === "MaxByte99")).toBe(true);
    expect(queries.every((q) => q.username.length > 0)).toBe(true);
  });

  it("detects known platforms and problem tags", () => {
    expect(detectPlatform("https://github.com/maxbyte").platform).toBe(
      "GitHub"
    );
    expect(detectPlatform("https://steamcommunity.com/id/x").platform).toBe(
      "Steam"
    );
    expect(
      detectProblemTags(
        "https://example.com",
        "hacked account dump",
        "combolist leak"
      )
    ).toContain("gehackte Accounts");
  });

  it("applies weighted confidence and drops SKU noise", () => {
    const strong = evaluateUsernameHit({
      username: "maxbyte",
      title: "maxbyte · GitHub",
      snippet: "Max Mustermann Berlin SynSight",
      url: "https://github.com/maxbyte",
      identity: baseIdentity(),
    });
    expect(strong.score).toBe(100);
    expect(
      strong.checks.some((c) => c.matched && c.label.includes("Benutzername"))
    ).toBe(true);

    const alone = scoreUsernameHit({
      username: "maxbyte",
      title: "Profil maxbyte",
      snippet: "Öffentliches Profil",
      url: "https://example.com/u/maxbyte",
      identity: null,
    });
    expect(alone).toBeGreaterThanOrEqual(70);
    expect(alone).toBeLessThanOrEqual(80);

    const noise = evaluateUsernameHit({
      username: "R2306",
      title: "Artikelnummer R2306 Ersatzteil",
      snippet: "SKU R2306 im Shopkatalog",
      url: "https://shop.example.com/sku/R2306",
      identity: baseIdentity(),
    });
    expect(noise.isNoise).toBe(true);
    expect(noise.score).toBe(0);

    expect(confidenceLabel(95)).toBe("Bestätigt");
    expect(confidenceBand(55)).toBe("hidden");
  });

  it("splits primary and weak hits for SOC overview", () => {
    const hits: UsernameHit[] = [
      {
        id: "1",
        platform: "Forum",
        category: "Foren",
        profileName: "x",
        profileUrl: "https://a.test/1",
        title: "a",
        snippet: "b",
        visibleInfo: [],
        identityScore: 90,
        confidence: 90,
        confidenceBand: "likely",
        riskLevel: "high",
        firstSeen: null,
        queryUsed: "q",
        logoKey: "fo",
        isProblematic: true,
        problemTags: ["Dating"],
      },
      {
        id: "2",
        platform: "Shop",
        category: "Sonstige",
        profileName: null,
        profileUrl: "https://a.test/2",
        title: "c",
        snippet: "d",
        visibleInfo: [],
        identityScore: 45,
        confidence: 45,
        confidenceBand: "hidden",
        riskLevel: "low",
        firstSeen: null,
        queryUsed: "q",
        logoKey: "sh",
        isProblematic: false,
        problemTags: [],
        isWeakMatch: true,
      },
    ];
    const { primary, weak } = splitPrimaryAndWeakHits(hits);
    expect(primary).toHaveLength(1);
    expect(weak).toHaveLength(1);
    const security = buildSecurityOverview({
      hits,
      actions: [],
      overallRisk: "high",
    });
    expect(security.ampel).toBe("red");
    expect(security.criticalHits).toBe(1);
    expect(security.possibleFalsePositives).toBe(1);
  });

  it("computes finance snapshot automatically", async () => {
    const finance = await computeUsernameFinance(
      DEFAULT_USERNAME_MODULE_SETTINGS
    );
    expect(finance.estimatedApiCostEur).toBeGreaterThan(0);
    expect(finance.costPerAnalysisEur).toBeGreaterThan(
      finance.estimatedApiCostEur
    );
    expect(finance.revenuePerAnalysisEur).toBe(
      DEFAULT_USERNAME_MODULE_SETTINGS.synCredits *
        DEFAULT_USERNAME_MODULE_SETTINGS.creditValueEur
    );
  });
});
