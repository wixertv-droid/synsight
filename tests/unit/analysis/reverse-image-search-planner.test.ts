import { describe, expect, it } from "vitest";
import {
  createEmptySerpCheckpoint,
  markQueryFetched,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
import {
  estimateSerpApiPageCalls,
  planReverseImageQueries,
} from "@/lib/analysis/reverse-image/search-planner";
import { buildPrioritizedSearchTerms } from "@/lib/analysis/reverse-image/identity-priority";
import { scoreImageCandidate } from "@/lib/analysis/reverse-image/candidate-score";
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

describe("reverse-image identity priority", () => {
  it("ranks usernames above weak first names", () => {
    const terms = buildPrioritizedSearchTerms(
      identity({
        personal: {
          firstName: "Rene",
          lastName: "Eule",
          birthDate: "",
          gender: "",
          phone: "",
          addressLine: "",
          location: "",
          previousLocations: [],
          company: "",
        },
        aliases: {
          usernames: ["killereule", "Rene2306"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "rene.eule",
        },
      })
    );
    expect(
      terms
        .slice(0, 3)
        .some((term) => /killereule|rene2306|rene\.eule/i.test(term.value))
    ).toBe(true);
    expect(terms.every((t) => t.priority >= 20)).toBe(true);
    const full = terms.find((t) => t.value === "Rene Eule");
    expect(full?.priority).toBeGreaterThanOrEqual(85);
  });
});

describe("reverse-image search planner", () => {
  it("plans priority-ordered queries without adult extras", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: {
          firstName: "Anja",
          lastName: "Gebert",
          birthDate: "",
          gender: "",
          phone: "",
          addressLine: "",
          location: "",
          previousLocations: [],
          company: "",
        },
        aliases: {
          usernames: ["Anja1921", "Luder-Anja"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "",
        },
      })
    );

    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(["username", "name"]).toContain(plans[0]?.group);
    expect(typeof plans[0]?.priority).toBe("number");
    expect(estimateSerpApiPageCalls(plans)).toBeGreaterThan(0);
    expect(plans.some((p) => p.id.includes("username-adult-"))).toBe(false);
    expect(plans.some((p) => p.query === "Anja1921")).toBe(true);
  });

  it("searches each username individually (no OR between usernames)", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: {
          firstName: "Anja",
          lastName: "Gebert",
          birthDate: "",
          gender: "",
          phone: "",
          addressLine: "",
          location: "",
          previousLocations: [],
          company: "",
        },
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
    expect(plans.some((p) => /Alias · anjalias/i.test(p.label))).toBe(true);
  });

  it("does not add adult site dork queries", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: {
          firstName: "Anja",
          lastName: "Gebert",
          birthDate: "",
          gender: "",
          phone: "",
          addressLine: "",
          location: "",
          previousLocations: [],
          company: "",
        },
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
  });
});

describe("reverse-image candidate score", () => {
  it("filters product-like results from face compare", () => {
    const product = scoreImageCandidate({
      title: "Edelstahl-Rillenkugellager 6201",
      imageUrl: "https://cdn.shop.example/product/sku-6201.jpg",
      sourceUrl: "https://www.amazon.de/dp/B00TEST",
      sourceHost: "amazon.de",
      query: "Rene2306",
      queryGroup: "username",
    });
    expect(product.allowFaceCompare).toBe(false);
    expect(product.score).toBeLessThan(40);

    const social = scoreImageCandidate({
      title: "Rene2306 — Profilfoto",
      imageUrl: "https://scontent.cdninstagram.com/avatar/rene.jpg",
      sourceUrl: "https://www.instagram.com/rene2306/",
      sourceHost: "instagram.com",
      query: "Rene2306",
      queryGroup: "username",
    });
    expect(social.allowFaceCompare).toBe(true);
    expect(social.score).toBeGreaterThanOrEqual(40);
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
