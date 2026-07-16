import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { getProfileRepository } from "@/lib/repositories";
import {
  getIdentityCompleteness,
  getIdentityForUser,
  saveIdentityForUser,
} from "@/lib/services/identity-service";

describe("identity-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
  });

  it("saves voluntary identity data and computes completeness", async () => {
    await getProfileRepository().ensureDraft(1, {
      firstName: "Alex",
      lastName: "Morgan",
    });

    const before = await getIdentityCompleteness(1);
    expect(before).toBeGreaterThanOrEqual(0);

    const saved = await saveIdentityForUser(1, {
      personal: {
        firstName: "Alex",
        lastName: "Morgan",
        birthDate: "1990-01-15",
        gender: "prefer_not_to_say",
        phone: "+491234",
        addressLine: "Beispielweg 1",
        location: "Gera",
        previousLocations: ["Leipzig"],
        company: "SynSight",
      },
      aliases: {
        publicAlias: "AM",
        nicknames: ["alex"],
        formerNames: [],
        usernames: ["alexm"],
        gamingNames: ["am90"],
      },
      emails: ["alex.alt@example.com"],
      phoneNumbers: ["+49999"],
      socialAccounts: [
        {
          platform: "GitHub",
          username: "alex",
          profileUrl: "https://github.com/alex",
          accountStatus: "active",
        },
      ],
      websites: ["https://example.com"],
      domains: ["example.com"],
      companies: ["SynSight"],
      images: [],
    });

    expect(saved.completenessPercent).toBeGreaterThanOrEqual(85);
    const loaded = await getIdentityForUser(1);
    expect(loaded?.socialAccounts[0]?.platform).toBe("GitHub");
    expect(loaded?.aliases.gamingNames).toContain("am90");
  });
});
