import { describe, expect, it } from "vitest";
import {
  createEmptySerpCheckpoint,
  markQueryFetched,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
import {
  estimateSerpApiPageCalls,
  planReverseImageQueries,
} from "@/lib/analysis/reverse-image/search-planner";
import type { IdentityView } from "@/lib/services/identity-service";

function identity(partial: Partial<IdentityView>): IdentityView {
  return {
    personal: {
      firstName: "",
      lastName: "",
      birthDate: "",
      gender: "",
      phone: "",
      addressLine: "",
      location: "",
      previousLocations: [],
      company: "",
      ...partial.personal,
    },
    aliases: {
      publicAlias: "",
      nicknames: [],
      formerNames: [],
      usernames: [],
      gamingNames: [],
      ...partial.aliases,
    },
    emails: [],
    phoneNumbers: [],
    socialAccounts: [],
    websites: [],
    domains: [],
    companies: [],
    images: [],
    completenessPercent: 50,
    ...partial,
  };
}

describe("reverse-image search planner", () => {
  it("keeps SerpAPI call budget lean for typical profile", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Anja", lastName: "Gebert" },
        aliases: {
          usernames: ["Anja1921", "Luder-Anja"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "",
        },
      })
    );

    // 2 usernames × 2 + name × 2 = 6 queries
    expect(plans).toHaveLength(6);
    expect(estimateSerpApiPageCalls(plans)).toBeLessThanOrEqual(12);
    expect(plans[0]?.group).toBe("username");
    expect(plans.some((p) => p.query === "Anja1921")).toBe(true);
    expect(plans.some((p) => p.query === "Luder-Anja")).toBe(true);
    // Keine 6 Einzelsite-Queries mehr
    expect(plans.some((p) => p.id.includes("username-site-"))).toBe(false);
    expect(plans.some((p) => p.id.includes("exact"))).toBe(false);
  });

  it("searches each username individually (no OR between usernames)", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Anja", lastName: "Gebert" },
        aliases: {
          usernames: ["Anja1921", "Luder-Anja"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "anjalias",
        },
      })
    );
    expect(
      plans.some(
        (p) =>
          p.group === "username" &&
          !p.id.includes("adult") &&
          p.query.includes(" OR ") &&
          p.query.includes("Anja1921") &&
          p.query.includes("Luder-Anja")
      )
    ).toBe(false);
    expect(plans.some((p) => p.label === "Alias · anjalias")).toBe(true);
  });

  it("bundles adult sites in one query per username", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Anja", lastName: "Gebert" },
        aliases: {
          usernames: ["anja_g"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "",
        },
      })
    );
    expect(
      plans.some(
        (p) =>
          p.id.startsWith("username-adult-") &&
          p.query.includes("site:amarotic.com") &&
          p.query.includes("anja_g")
      )
    ).toBe(true);
  });
});

describe("reverse-image serp checkpoint v2", () => {
  it("stores results per query id", () => {
    let checkpoint = createEmptySerpCheckpoint([
      { id: "name-open", label: "Name", query: "Test", group: "name" },
    ]);
    checkpoint = markQueryFetched(checkpoint, checkpoint.queries[0], [
      {
        title: "Bild",
        imageUrl: "https://cdn.example/a.jpg",
        sourceUrl: null,
        sourceHost: "example.com",
        query: "Test",
        position: 1,
      },
    ]);
    expect(checkpoint.resultsByQuery["name-open"]).toHaveLength(1);
    expect(checkpoint.serpFetchComplete).toBe(true);
  });
});
