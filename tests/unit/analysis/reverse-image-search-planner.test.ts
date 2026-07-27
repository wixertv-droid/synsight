import { describe, expect, it } from "vitest";
import {
  collectReverseImageHandles,
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
  it("uses full first+last name including multiple first names", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Hans Klaus", lastName: "Müller" },
      })
    );
    expect(plans.some((p) => p.query === '"Hans Klaus Müller"')).toBe(true);
    expect(plans.some((p) => p.query === '"Hans Klaus Müller" foto')).toBe(
      true
    );
  });

  it("includes all aliases and batches usernames with OR", () => {
    const plans = planReverseImageQueries(
      identity({
        personal: { firstName: "Max", lastName: "Mustermann" },
        aliases: {
          publicAlias: "maxi_public",
          usernames: ["max99", "mustermann_m"],
          gamingNames: ["xMaxPro"],
          formerNames: ["Maxi Alt"],
          nicknames: [],
        },
        socialAccounts: [
          {
            platform: "instagram",
            username: "max.inst",
            profileUrl: "",
            accountStatus: "active",
          },
        ],
      }),
      { handlesPerQuery: 4 }
    );

    const handlePlan = plans.find((p) => p.id === "handles-0");
    expect(handlePlan?.query).toContain('"maxi_public"');
    expect(handlePlan?.query).toContain('"max99"');
    expect(handlePlan?.query).toContain('"mustermann_m"');
    expect(handlePlan?.query).toContain('"xMaxPro"');
    expect(handlePlan?.query).toContain(" OR ");

    expect(
      collectReverseImageHandles(
        identity({
          personal: { firstName: "Max", lastName: "Mustermann" },
          aliases: {
            publicAlias: "maxi_public",
            usernames: ["max99"],
            gamingNames: ["xMaxPro"],
            formerNames: ["Maxi Alt"],
            nicknames: [],
          },
          socialAccounts: [
            {
              platform: "instagram",
              username: "max.inst",
              profileUrl: "",
              accountStatus: "active",
            },
          ],
        })
      )
    ).toHaveLength(5);
  });

  it("does not cap aliases at six entries", () => {
    const handles = collectReverseImageHandles(
      identity({
        aliases: {
          usernames: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "",
        },
      })
    );
    expect(handles).toHaveLength(9);
    const plans = planReverseImageQueries(
      identity({
        aliases: {
          usernames: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"],
          gamingNames: [],
          formerNames: [],
          nicknames: [],
          publicAlias: "",
        },
      }),
      { handlesPerQuery: 4 }
    );
    expect(plans.filter((p) => p.id.startsWith("handles-"))).toHaveLength(3);
  });
});
