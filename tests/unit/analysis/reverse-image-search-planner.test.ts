import { describe, expect, it } from "vitest";
import {
  createEmptySerpCheckpoint,
  markQueryFetched,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
import { planReverseImageQueries } from "@/lib/analysis/reverse-image/search-planner";
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
  it("uses full first+last name including multiple first names", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Hans Klaus", lastName: "Müller" },
      })
    );
    expect(plans.some((p) => p.query === '"Hans Klaus Müller"')).toBe(true);
  });

  it("creates separate username queries (no OR batching)", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Anja", lastName: "Gebert" },
        aliases: {
          usernames: ["anja_g", "gebert_a"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "anjalias",
        },
      })
    );
    expect(
      plans.filter((p) => p.group === "username").length
    ).toBeGreaterThanOrEqual(2);
    expect(
      plans.filter((p) => p.group === "alias").length
    ).toBeGreaterThanOrEqual(1);
    expect(plans.some((p) => p.query === '"anja_g"')).toBe(true);
    // Username-Queries bleiben einzeln (kein OR zwischen Benutzernamen)
    expect(
      plans.some(
        (p) =>
          p.group === "username" &&
          !p.id.includes("adult") &&
          p.query.includes(" OR ")
      )
    ).toBe(false);
  });

  it("adds adult/niche image queries for aliases and usernames like Google search", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Anja", lastName: "Gebert" },
        aliases: {
          usernames: ["anja_g"],
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
          p.id.startsWith("alias-adult-") &&
          p.query.includes("site:joyclub.de") &&
          p.query.includes('"anjalias"')
      )
    ).toBe(true);
    expect(
      plans.some(
        (p) =>
          p.id.startsWith("username-adult-") &&
          p.query.includes("site:onlyfans.com") &&
          p.query.includes('"anja_g"')
      )
    ).toBe(true);
  });
});

describe("reverse-image serp checkpoint v2", () => {
  it("stores results per query id", () => {
    let checkpoint = createEmptySerpCheckpoint([
      { id: "name-full", label: "Name", query: '"Test"', group: "name" },
    ]);
    checkpoint = markQueryFetched(checkpoint, checkpoint.queries[0], [
      {
        title: "Bild",
        imageUrl: "https://cdn.example/a.jpg",
        sourceUrl: null,
        sourceHost: "example.com",
        query: '"Test"',
        position: 1,
      },
    ]);
    expect(checkpoint.resultsByQuery["name-full"]).toHaveLength(1);
    expect(checkpoint.serpFetchComplete).toBe(true);
  });
});
