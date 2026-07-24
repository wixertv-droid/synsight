import { describe, expect, it } from "vitest";
import {
  maskEmail,
  maskPhone,
  stripHtml,
} from "@/lib/analysis/digital-exposure/mask";
import { buildGeminiPrepPayload } from "@/lib/analysis/digital-exposure/gemini-prep";
import {
  summarizeDehashedEntries,
  formatDehashedHttpError,
} from "@/lib/analysis/digital-exposure/dehashed-client";
import type { DigitalExposureFinding } from "@/lib/analysis/digital-exposure/types";

describe("digital exposure helpers", () => {
  it("masks email and phone without leaking full identifiers", () => {
    expect(maskEmail("max.mustermann@example.de")).toMatch(
      /^ma\*+@example\.de$/
    );
    expect(maskPhone("+4917612345678")).toContain("*");
    expect(maskPhone("+4917612345678")).not.toContain("123456");
  });

  it("strips HTML from breach descriptions", () => {
    expect(stripHtml("<p>Adobe <em>Leak</em></p>")).toBe("Adobe Leak");
  });

  it("summarizes DeHashed entries without storing password values", () => {
    const summaries = summarizeDehashedEntries([
      {
        email: ["max@example.de"],
        password: ["super-secret-should-never-appear"],
        hashed_password: ["abc123hash"],
        hash_type: "bcrypt",
        database_name: "Adobe",
        username: ["max"],
        name: ["Max Mustermann"],
        city: ["Berlin"],
        country: ["DE"],
        ip_address: ["1.2.3.4"],
      },
      {
        email: ["max@example.de"],
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
    expect(summaries[0].attributes.some((a) => a.key === "email")).toBe(true);
    expect(summaries[0].attributes.some((a) => a.key === "city")).toBe(true);
    expect(summaries[0].dataClasses).toEqual(
      expect.arrayContaining(["E-Mail-Adresse", "Benutzername", "Name"])
    );
    expect(JSON.stringify(summaries)).not.toContain(
      "super-secret-should-never-appear"
    );
    expect(JSON.stringify(summaries)).not.toContain("abc123hash");
  });

  it("builds facts-only Gemini payload without inventing data", () => {
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
        identifierMasked: "ma***@example.de",
        dataClasses: [
          "E-Mail-Adresse",
          "Passwort vorhanden (nicht gespeichert)",
        ],
      },
    ];
    const payload = buildGeminiPrepPayload({
      subjectName: "Max Mustermann",
      riskScore: 42,
      findings,
    });
    expect(payload.mode).toBe("facts_only");
    expect(payload.findings).toHaveLength(1);
    expect(payload.instructions).toMatch(/DIGITAL FORENSICS ANALYST/i);
    expect(payload.constraints.join(" ")).toMatch(/bestätigte API-Treffer/i);
    expect(JSON.stringify(payload)).not.toMatch(/password123|geheim/i);
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
        identifierMasked: "a***@x.de",
        dataClasses: ["E-Mail-Adresse", "Passwort vorhanden"],
        attributes: [
          { key: "email", label: "E-Mail-Adresse", present: true },
          { key: "password", label: "Passwort vorhanden", present: true },
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
        identifierMasked: "a***@x.de",
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
