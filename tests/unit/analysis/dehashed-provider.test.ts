import { describe, expect, it } from "vitest";
import { buildDehashedQueryFromIdentity } from "@/lib/analysis/osint/dehashed-provider";
import { scoreIdentityConfidence } from "@/lib/analysis/osint/score-engine";
import type { IdentityView } from "@/lib/services/identity-service";

function identity(partial?: Partial<IdentityView>): IdentityView {
  return {
    personal: {
      firstName: "Anja",
      lastName: "Beispiel",
      birthDate: "",
      gender: "",
      phone: "+4917612345678",
      addressLine: "",
      location: "Gera",
      previousLocations: [],
      company: "",
    },
    aliases: {
      publicAlias: "",
      nicknames: [],
      formerNames: [],
      usernames: ["Anja1921"],
      gamingNames: [],
    },
    emails: ["anja@example.de"],
    phoneNumbers: [],
    socialAccounts: [],
    websites: [],
    domains: [],
    companies: [],
    images: [],
    completenessPercent: 40,
    ...partial,
  };
}

describe("dehashed-provider query builder", () => {
  it("builds OR query for email, phone and username", () => {
    const query = buildDehashedQueryFromIdentity(identity());
    expect(query).toContain('email:"anja@example.de"');
    expect(query).toContain('phone:"+4917612345678"');
    expect(query).toContain('username:"Anja1921"');
    expect(query).toContain(" OR ");
  });

  it("returns null when no identifiers", () => {
    expect(
      buildDehashedQueryFromIdentity(
        identity({
          emails: [],
          phoneNumbers: [],
          personal: {
            firstName: "A",
            lastName: "B",
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
        })
      )
    ).toBeNull();
  });
});

describe("dehashed_leak score hard rule", () => {
  it("scores DeHashed leaks at 100", () => {
    const result = scoreIdentityConfidence(
      {
        title: "Datenleck / Breach · Adobe",
        snippet: "Quelle: Adobe",
        url: "https://dehashed.com/",
        category: "Datenleck / Breach",
        sourceType: "dehashed_leak",
      },
      { subjectName: "Anja Beispiel", firstName: "Anja", lastName: "Beispiel" }
    );
    expect(result.score).toBe(100);
    expect(result.positives.join(" ")).toMatch(/DeHashed/i);
  });
});
