import { describe, expect, it } from "vitest";
import { buildThreatsFromReports } from "@/lib/dashboard/build-threats-from-reports";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { IntelligenceReport } from "@/lib/analysis/types";

describe("buildThreatsFromReports", () => {
  it("returns empty list without reports", () => {
    expect(buildThreatsFromReports({})).toEqual([]);
    expect(
      buildThreatsFromReports({ google: null, exposure: null, username: null })
    ).toEqual([]);
  });

  it("maps leak findings into threats", () => {
    const exposure = {
      moduleKey: "digital_leak_exposure",
      findings: [
        {
          type: "BREACH",
          title: "Adobe",
          description: "Leak Adobe",
          riskLevel: "high",
          sourceName: "Adobe",
          recommendation: "Passwort ändern",
          identifierMasked: "a***@x.de",
        },
      ],
      actions: [
        {
          priority: "SOFORT",
          title: "Passwort ändern",
          why: "Leak-Risiko",
          how: "Jetzt ändern",
          relatedSource: "Adobe",
        },
      ],
    } as unknown as DigitalExposureReport;

    const threats = buildThreatsFromReports({ exposure });
    expect(threats.length).toBe(1);
    expect(threats[0]?.level).toBe("high");
    expect(threats[0]?.source).toBe("Adobe");
    expect(threats[0]?.moduleKey).toBe("digital_leak_exposure");
    expect(threats[0]?.userAction).toMatch(/ändern/i);
  });

  it("maps actionable google hits into threats", () => {
    const google = {
      moduleKey: "google_search",
      hits: [
        {
          id: "h1",
          title: "Öffentliches Profil",
          snippet: "Sichtbare Daten",
          source: "example.com",
          sourceType: "serpapi_google",
          severity: "high",
          risk: "review",
          shouldAct: true,
          whyRelevantPlain: "Zuordenbar",
          recommendation: "Privat stellen",
        },
      ],
      recommendations: [],
    } as unknown as IntelligenceReport;

    const threats = buildThreatsFromReports({ google });
    expect(threats.length).toBe(1);
    expect(threats[0]?.title).toMatch(/Profil/i);
    expect(threats[0]?.level).toBe("medium");
    expect(threats[0]?.moduleKey).toBe("google_search");
  });
});
