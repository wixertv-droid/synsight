import { describe, expect, it } from "vitest";
import { buildScanPlan } from "@/lib/demo/scan-plan";
import { computeDemoExposureScore } from "@/lib/demo/demo-exposure-score";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";

describe("demo scan plan", () => {
  it("orders Holehe → Maigret → PhoneInfoga without SpiderFoot", () => {
    const plan = buildScanPlan({
      email: "a@b.de",
      username: "shadow",
      phone: "+49151",
    });
    expect(plan.map((s) => s.module)).toEqual([
      "holehe",
      "maigret",
      "phoneinfoga",
    ]);
    expect(plan.some((s) => String(s.module).includes("spider"))).toBe(false);
  });
});

describe("demo exposure score", () => {
  it("scores specialist findings, legacy OSINT fallback findings and ignores errors", () => {
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
    expect(scored.usableCount).toBe(3);
    expect(scored.score).toBeGreaterThan(20);
    expect(["Mittel", "Erhöht", "Kritisch"]).toContain(scored.risk);
  });

  it("wires normalizeUpstreamPayload exposure_score from specialist modules", () => {
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
          ],
        },
      ],
    });
    expect(normalized.modules.map((m) => m.id)).toEqual(
      expect.arrayContaining(["holehe", "maigret"])
    );
    expect(normalized.exposure_score).toBeGreaterThan(0);
    expect(normalized.risk_level).toBeTruthy();
  });

  it("keeps older SpiderFoot/OSINT scanner payloads visible instead of empty", () => {
    const normalized = normalizeUpstreamPayload({
      queries: { email: "a@b.de" },
      payloads: [
        {
          status: "success",
          source: "spiderfoot",
          summary: "Öffentliche SpiderFoot-Analyse abgeschlossen.",
          findings: [
            {
              source: "SpiderFoot",
              category: "SOCIAL",
              title: "Öffentliche Profile",
              description: "2 öffentliche Signalgruppen gefunden.",
              risk: "medium",
              platform: "sfp_accounts",
            },
          ],
        },
      ],
    });
    expect(normalized.findings).toHaveLength(1);
    expect(normalized.modules.map((m) => m.id)).toContain("publicosint");
    expect(normalized.exposure_score).toBeGreaterThan(0);
  });
});
