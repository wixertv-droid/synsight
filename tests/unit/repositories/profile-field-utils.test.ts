import { describe, expect, it } from "vitest";
import {
  normalizeBirthDate,
  parseJsonStringArray,
} from "@/lib/repositories/profile-field-utils";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";
import { planScoredGoogleSearches } from "@/lib/analysis/osint/search-planner";
import type { IdentityView } from "@/lib/services/identity-service";

describe("profile-field-utils", () => {
  it("parses MariaDB JSON string arrays for previous_locations", () => {
    expect(parseJsonStringArray('["Leipzig","Berlin"]')).toEqual([
      "Leipzig",
      "Berlin",
    ]);
    expect(parseJsonStringArray(["Gera", " Chemnitz "])).toEqual([
      "Gera",
      "Chemnitz",
    ]);
    expect(parseJsonStringArray(null)).toEqual([]);
    expect(parseJsonStringArray("{broken")).toEqual([]);
  });

  it("normalizes birth dates from Date and ISO strings", () => {
    expect(normalizeBirthDate("1990-01-15")).toBe("1990-01-15");
    expect(normalizeBirthDate("1990-01-15T00:00:00.000Z")).toBe("1990-01-15");
    expect(normalizeBirthDate(new Date("1990-01-15T12:00:00Z"))).toBe(
      "1990-01-15"
    );
    expect(normalizeBirthDate(null)).toBeNull();
  });
});

describe("identity fingerprint + search locations", () => {
  it("includes previousLocations in fingerprint and search queries", () => {
    const identity: IdentityView = {
      personal: {
        firstName: "Anja",
        lastName: "Muster",
        birthDate: "1990-01-01",
        gender: "female",
        phone: "",
        addressLine: "",
        location: "Gera",
        previousLocations: ["Leipzig", "Chemnitz"],
        company: "",
      },
      aliases: {
        publicAlias: "",
        nicknames: [],
        formerNames: [],
        usernames: ["Anja1921"],
        gamingNames: [],
      },
      emails: [],
      phoneNumbers: [],
      socialAccounts: [],
      websites: [],
      domains: [],
      companies: [],
      images: [],
      completenessPercent: 50,
    };

    const fp = buildIdentityFingerprint(identity);
    expect(fp.previousLocations).toEqual(["Leipzig", "Chemnitz"]);
    expect(fp.location).toBe("Gera");

    const plans = planScoredGoogleSearches(identity);
    const locationPlan = plans.find((p) => p.id === "v-identity-location");
    expect(locationPlan?.query).toContain("Gera");
    expect(locationPlan?.query).toContain("Leipzig");
    expect(locationPlan?.query).toContain("Chemnitz");
  });
});
