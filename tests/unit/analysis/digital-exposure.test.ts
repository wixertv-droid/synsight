import { describe, expect, it } from "vitest";
import {
  maskEmail,
  maskPhone,
  maskSecret,
  stripHtml,
} from "@/lib/analysis/digital-exposure/mask";
import { buildGeminiPrepPayload } from "@/lib/analysis/digital-exposure/gemini-prep";
import {
  summarizeDehashedEntries,
  formatDehashedHttpError,
} from "@/lib/analysis/digital-exposure/dehashed-client";
import type { DigitalExposureFinding } from "@/lib/analysis/digital-exposure/types";

describe("digital exposure helpers", () => {
  it("masks only secrets with first3/last2 preview", () => {
    expect(maskSecret("super-secret-password")).toMatch(/^sup\*+rd$/);
    expect(maskSecret("abc123hash")).toMatch(/^abc\*+sh$/);
    // audit helpers still exist for usage logs
    expect(maskEmail("max.mustermann@example.de")).toMatch(
      /^ma\*+@example\.de$/
    );
    expect(maskPhone("+4917612345678")).toContain("*");
  });

  it("strips HTML from breach descriptions", () => {
    expect(stripHtml("<p>Adobe <em>Leak</em></p>")).toBe("Adobe Leak");
  });

  it("keeps email/username/name cleartext and only masks password/hash", () => {
    const summaries = summarizeDehashedEntries([
      {
        email: ["anja1921@example.de"],
        password: ["super-secret-should-never-appear"],
        hashed_password: ["abc123hashvalue"],
        hash_type: "bcrypt",
        database_name: "Adobe",
        username: ["anja1921"],
        name: ["Anja Beispiel"],
        city: ["Berlin"],
        country: ["DE"],
        ip_address: ["1.2.3.4"],
      },
      {
        email: ["anja1921@example.de"],
        phone: ["+4917612345678"],
        database_name: "Adobe",
      },
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].databaseName).toBe("Adobe");
    expect(summaries[0].recordCount).toBe(2);
    expect(summaries[0].hasPasswordExposure).toBe(true);
    expect(summaries[0].hasHashedPasswordExposure).toBe(true);
    expect(summaries[0].hashType).toBe("bcrypt");

    const emailAttr = summaries[0].attributes.find((a) => a.key === "email");
    const userAttr = summaries[0].attributes.find((a) => a.key === "username");
    const nameAttr = summaries[0].attributes.find((a) => a.key === "name");
    const phoneAttr = summaries[0].attributes.find((a) => a.key === "phone");
    const passAttr = summaries[0].attributes.find((a) => a.key === "password");
    const hashAttr = summaries[0].attributes.find(
      (a) => a.key === "hashed_password"
    );

    expect(emailAttr?.maskedValue).toBe("anja1921@example.de");
    expect(userAttr?.maskedValue).toBe("anja1921");
    expect(nameAttr?.maskedValue).toBe("Anja Beispiel");
    expect(phoneAttr?.maskedValue).toBe("+4917612345678");
    expect(passAttr?.maskedValue).toMatch(/^sup\*+ar$/);
    expect(hashAttr?.maskedValue).toMatch(/^abc\*+ue$/);
    expect(JSON.stringify(summaries)).not.toContain(
      "super-secret-should-never-appear"
    );
    expect(JSON.stringify(summaries)).not.toContain("abc123hashvalue");
  });

  it("builds facts-only Gemini payload with cleartext identity fields", () => {
    const findings: DigitalExposureFinding[] = [
      {
        type: "BREACH",
        title: "Adobe",
        description: "Verified breach",
        riskLevel: "high",
        sourceName: "Adobe",
        sourceDate: "2013-10-04",
        recommendation: "Passwort ändern",
        sourceUrl: "https://dehashed.com/",
        identifierMasked: "anja1921@example.de",
        dataClasses: ["E-Mail-Adresse", "Passwort"],
        attributes: [
          {
            key: "email",
            label: "E-Mail-Adresse",
            present: true,
            maskedValue: "anja1921@example.de",
          },
          {
            key: "username",
            label: "Benutzername",
            present: true,
            maskedValue: "anja1921",
          },
          {
            key: "password",
            label: "Passwort",
            present: true,
            maskedValue: "sup***rd",
          },
        ],
      },
    ];
    const payload = buildGeminiPrepPayload({
      subjectName: "Anja Beispiel",
      riskScore: 42,
      findings,
    });
    const json = JSON.stringify(payload);
    expect(payload.mode).toBe("facts_only");
    expect(json).toContain("anja1921@example.de");
    expect(json).toContain("anja1921");
    expect(json).not.toContain("an***@");
    expect(json).not.toMatch(/password123|geheim|super-secret/i);
  });

  it("builds management overview without technical count sentence", async () => {
    const { buildManagementOverview, buildProfessionalSummary } =
      await import("@/lib/analysis/digital-exposure/report-metrics");
    const findings: DigitalExposureFinding[] = [
      {
        type: "BREACH",
        title: "Adobe",
        description: "Leak",
        riskLevel: "high",
        sourceName: "Adobe",
        sourceDate: "2013",
        recommendation: null,
        sourceUrl: null,
        identifierMasked: "anja1921@example.de",
        dataClasses: ["E-Mail-Adresse", "Passwort"],
        attributes: [
          {
            key: "email",
            label: "E-Mail-Adresse",
            present: true,
            maskedValue: "anja1921@example.de",
          },
          {
            key: "password",
            label: "Passwort",
            present: true,
            maskedValue: "sup***rd",
          },
        ],
        recordCount: 2,
        confidence: 98,
      },
      {
        type: "BREACH",
        title: "LinkedIn",
        description: "Leak",
        riskLevel: "medium",
        sourceName: "LinkedIn",
        sourceDate: null,
        recommendation: null,
        sourceUrl: null,
        identifierMasked: "anja1921@example.de",
        dataClasses: ["E-Mail-Adresse", "Benutzername"],
        recordCount: 1,
      },
    ];
    const overview = buildManagementOverview(findings, 83);
    expect(overview.confirmedSources).toBe(2);
    expect(overview.overallRiskLabel).toBe("HOCH");
    expect(overview.headline).toMatch(/mehreren bekannten Datenquellen/i);
    expect(buildProfessionalSummary(overview)).not.toMatch(
      /Es wurden \d+ bestätigte/
    );
  });

  it("maps DeHashed subscription 401 to a clear German message", () => {
    const message = formatDehashedHttpError(
      401,
      JSON.stringify({
        error:
          "You need a search subscription and API credits to use the API, please purchase a search subscription.",
      })
    );
    expect(message).toMatch(/aktives Search-Abo/i);
    expect(message).toMatch(/Not Active/i);
    expect(message).toMatch(/app\.dehashed\.com\/subscriptions/);
  });
});
