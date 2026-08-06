import { describe, expect, it } from "vitest";
import { buildScanPlan } from "@/lib/demo/scan-plan";
import { computeDemoExposureScore } from "@/lib/demo/demo-exposure-score";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";

describe("demo scan plan", () => {
  it("orders the three fast public checks without heavy modules", () => {
    const plan = buildScanPlan({
      email: "a@b.de",
      username: "shadow",
      phone: "+49151",
      domain: "example.de",
      url: "https://example.de",
    });
    expect(plan.map((s) => s.module)).toEqual([
      "holehe",
      "maigret",
      "phoneinfoga",
    ]);
    expect(plan.map((s) => s.label)).toEqual([
      "Identitätsabgleich",
      "Profilkorrelation",
      "Kommunikations-Metadaten",
    ]);
    expect(plan.some((s) => /spider|harvest|photon/i.test(String(s.module)))).toBe(false);
  });
});

describe("demo exposure score", () => {
  it("scores module findings and ignores SpiderFoot / errors", () => {
    const scored = computeDemoExposureScore([
      {
        source: "holehe",
        risk: "medium",
        title: "Account",
        url: "https://x.example",
      },
      {
        source: "maigret",
        risk: "high",
        title: "Profil",
        url: "https://y.example",
      },
      {
        source: "SpiderFoot",
        risk: "high",
        title: "Deep",
      },
      {
        category: "ERROR",
        source: "phoneinfoga",
        title: "fail",
        risk: "high",
      },
    ]);
    expect(scored.usableCount).toBe(2);
    expect(scored.score).toBeGreaterThan(20);
    expect(["Mittel", "Erhöht", "Kritisch"]).toContain(scored.risk);
  });

  it("wires normalizeUpstreamPayload exposure_score from modules", () => {
    const normalized = normalizeUpstreamPayload({
      queries: { email: "a@b.de", username: "u1" },
      payloads: [
        {
          status: "success",
          findings: [
            {
              source: "holehe",
              platform: "GitHub",
              url: "https://github.com/x",
              risk: "medium",
            },
            {
              source: "maigret",
              platform: "Twitter",
              url: "https://x.com/u1",
              risk: "medium",
            },
            { source: "spiderfoot", title: "noise", risk: "high" },
          ],
        },
      ],
    });
    expect(
      normalized.findings.every((f) => !/spiderfoot/i.test(f.source || ""))
    ).toBe(true);
    expect(normalized.modules.map((m) => m.id)).toEqual(
      expect.arrayContaining(["holehe", "maigret"])
    );
    expect(normalized.exposure_score).toBeGreaterThan(0);
    expect(normalized.risk_level).toBeTruthy();
  });

  it("keeps legacy OSINT fallback visible when only old scanner output exists", () => {
    const normalized = normalizeUpstreamPayload({
      queries: { email: "a@b.de" },
      payloads: [
        {
          status: "success",
          source: "spiderfoot",
          result_count: 1,
          findings: [
            {
              source: "SpiderFoot",
              category: "OSINT",
              title: "Öffentliche Spur",
              description: "Legacy OSINT event",
              risk: "low",
            },
          ],
        },
      ],
    });
    expect(normalized.findings.length).toBeGreaterThan(0);
    expect(normalized.modules.some((m) => m.id === "publicosint")).toBe(true);
  });

  it("formats phone metadata without raw booleans", () => {
    const normalized = normalizeUpstreamPayload({
      queries: { phone: "+4915123456789" },
      payloads: [
        {
          status: "success",
          module: "phoneinfoga",
          findings: [
            {
              source: "phoneinfoga",
              category: "PHONE",
              title: "Telefon-Analyse",
              description: "Nummer gültig: True | Provider: T-Mobile | Country: DE",
              risk: "medium",
            },
          ],
        },
      ],
    });
    expect(normalized.findings[0]?.title).toBe("Telekommunikations-Intelligenz");
    expect(normalized.findings[0]?.description).toContain("Rufnummer validiert: Ja");
    expect(normalized.findings[0]?.description).not.toContain("True");
  });
});
