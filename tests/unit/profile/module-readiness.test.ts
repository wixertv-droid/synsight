import { describe, expect, it } from "vitest";
import {
  buildProfileModuleReadiness,
  joinFirstNames,
  splitFirstNames,
} from "@/lib/profile/module-readiness";
import type { IdentityView } from "@/lib/services/identity-service";

function emptyIdentity(): IdentityView {
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
    images: [],
    completenessPercent: 0,
  };
}

describe("module-readiness", () => {
  it("splits and joins multiple first names", () => {
    expect(splitFirstNames("Anna Maria")).toEqual({
      primary: "Anna",
      additional: ["Maria"],
    });
    expect(joinFirstNames("Anna", ["Maria", "Luise"])).toBe("Anna Maria Luise");
  });

  it("marks google analysis incomplete without core signals", () => {
    const readiness = buildProfileModuleReadiness(emptyIdentity(), {
      activeKeys: ["google_search"],
    });
    const google = readiness.find((r) => r.key === "google_search");
    expect(google?.ready).toBe(false);
    expect(google?.missing.length).toBeGreaterThan(0);
  });

  it("marks phone analysis ready when stammdaten phone exists", () => {
    const view = emptyIdentity();
    view.personal.phone = "+49 170 111";
    const phone = buildProfileModuleReadiness(view, {
      activeKeys: ["phone_analysis"],
    }).find((r) => r.key === "phone_analysis");
    expect(phone?.ready).toBe(true);
  });

  it("returns no modules when activeKeys is missing (fail-closed)", () => {
    expect(buildProfileModuleReadiness(emptyIdentity())).toEqual([]);
  });

  it("filters readiness to active catalog modules only", () => {
    const readiness = buildProfileModuleReadiness(emptyIdentity(), {
      activeKeys: ["google_search", "username_intelligence"],
    });
    expect(readiness.map((r) => r.key)).toEqual([
      "google_search",
      "username_intelligence",
    ]);
    expect(readiness.some((r) => r.key === "person_search")).toBe(false);
    expect(readiness.some((r) => r.key === "alias_analysis")).toBe(false);
  });
});
