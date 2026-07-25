import { describe, expect, it } from "vitest";
import {
  confidenceBand,
  confidenceLabel,
  scoreUsernameHit,
} from "@/lib/analysis/username/confidence";
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
  it("plans 5–8 deduped high-value queries", () => {
    const { username, queries } = planUsernameQueries(baseIdentity(), 8);
    expect(username).toBe("maxbyte");
    expect(queries.length).toBeGreaterThanOrEqual(5);
    expect(queries.length).toBeLessThanOrEqual(8);
    const keys = queries.map((q) => q.query.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(queries[0].query).toContain('"maxbyte"');
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

  it("scores identity confidence and hides below 60", () => {
    const score = scoreUsernameHit({
      username: "maxbyte",
      title: "maxbyte · GitHub",
      snippet: "Max Mustermann Berlin SynSight",
      url: "https://github.com/maxbyte",
      identity: baseIdentity(),
    });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(confidenceBand(score)).not.toBe("hidden");
    expect(confidenceLabel(95)).toBe("Bestätigt");
    expect(confidenceBand(55)).toBe("hidden");
  });

  it("computes finance snapshot automatically", () => {
    const finance = computeUsernameFinance(DEFAULT_USERNAME_MODULE_SETTINGS);
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
