import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { getProfileRepository } from "@/lib/repositories";
import {
  getIdentityCompleteness,
  getIdentityForUser,
  persistProcessedProfileImage,
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

  it("persists uploaded image metadata immediately across reloads", async () => {
    await getProfileRepository().ensureDraft(1, {
      firstName: "Alex",
      lastName: "Morgan",
    });
    await persistProcessedProfileImage(1, {
      imageType: "front",
      storagePath: "users/1/images/id/analysis.webp",
      originalPath: "users/1/images/id/original.bin",
      analysisPath: "users/1/images/id/analysis.webp",
      thumbnailPath: "users/1/images/id/thumbnail.webp",
      contentHash: "a".repeat(64),
      mimeType: "image/webp",
      byteSize: 1234,
    });
    const loaded = await getIdentityForUser(1);
    expect(loaded?.images).toHaveLength(1);
    expect(loaded?.images[0]).toMatchObject({
      imageType: "front",
      thumbnailPath: "users/1/images/id/thumbnail.webp",
    });
  });
});
