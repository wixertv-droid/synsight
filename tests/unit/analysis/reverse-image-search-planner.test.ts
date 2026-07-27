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
  it("keeps SerpAPI call budget lean without adult extras", () => {
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

    // 2 usernames + name × 2 = 4 queries (keine Adult-Extras)
    expect(plans).toHaveLength(4);
    expect(estimateSerpApiPageCalls(plans)).toBe(10); // 3+3+2+2
    expect(plans[0]?.group).toBe("username");
    expect(plans.some((p) => p.query === "Anja1921")).toBe(true);
    expect(plans.some((p) => p.query === "Luder-Anja")).toBe(true);
    expect(plans.some((p) => p.id.includes("username-adult-"))).toBe(false);
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
          p.query.includes(" OR ") &&
          p.query.includes("Anja1921") &&
          p.query.includes("Luder-Anja")
      )
    ).toBe(false);
    expect(plans.some((p) => p.label === "Alias · anjalias")).toBe(true);
  });

  it("does not add adult site dork queries", () => {
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
    expect(plans.some((p) => p.id.startsWith("username-adult-"))).toBe(false);
    expect(plans.some((p) => p.query.includes("site:amarotic.com"))).toBe(
      false
    );
    expect(plans.some((p) => p.query === "anja_g")).toBe(true);
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
