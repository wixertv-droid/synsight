import { describe, expect, it } from "vitest";
import { identityProfileSchema } from "@/lib/validation/identity";

const base = {
  personal: {
    firstName: "Alex",
    lastName: "Morgan",
    birthDate: "",
    gender: "",
    phone: "",
    addressLine: "",
    location: "",
    previousLocations: [],
    company: "",
  },
  aliases: {
    publicAlias: "",
    nicknames: [],
    formerNames: [],
    usernames: [],
    gamingNames: [],
  },
  emails: [],
  phoneNumbers: [],
  socialAccounts: [],
  websites: [],
  domains: [],
  companies: [],
};

describe("identity image validation", () => {
  it("rejects duplicate image types", () => {
    const result = identityProfileSchema.safeParse({
      ...base,
      images: [
        {
          imageType: "front",
          storagePath: "users/1/images/a/analysis.webp",
        },
        {
          imageType: "front",
          storagePath: "users/1/images/b/analysis.webp",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly four unique reference image types", () => {
    const types = ["front", "left_profile", "right_profile", "angled"] as const;
    const result = identityProfileSchema.safeParse({
      ...base,
      images: types.map((imageType) => ({
        imageType,
        storagePath: `users/1/images/${imageType}/analysis.webp`,
      })),
    });
    expect(result.success).toBe(true);
  });
});
