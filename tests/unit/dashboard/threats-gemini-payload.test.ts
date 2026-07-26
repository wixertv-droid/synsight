import { describe, expect, it } from "vitest";
import {
  buildThreatsGeminiPayload,
  type ThreatsGeminiPayload,
} from "@/lib/dashboard/threats-gemini";
import type { PlatformThreat } from "@/lib/dashboard/build-threats-from-reports";
import { threatsInputFingerprint } from "@/lib/dashboard/threats-fingerprint";

const sample: PlatformThreat[] = [
  {
    id: "threat-leak-a",
    level: "high",
    title: "Leak",
    found: "Adobe",
    whyItMatters: "Risiko",
    userAction: "Passwort ändern",
    source: "Adobe",
    moduleKey: "digital_leak_exposure",
    moduleLabel: "Digital Leak & Exposure",
    url: null,
    actionPlatform: "Adobe",
    actionTitle: "Leak",
    orderType: "privacy_request",
    selfGuide: ["Passwort ändern"],
    aiExplain: { whyFound: "Leak", whyRelevant: "Risiko" },
  },
  {
    id: "threat-google-b",
    level: "medium",
    title: "Profil",
    found: "Öffentlich",
    whyItMatters: "Sichtbarkeit",
    userAction: "Privat stellen",
    source: "example.com",
    moduleKey: "google_search",
    moduleLabel: "Google Analyse",
    url: "https://example.com/profile",
    actionPlatform: "example.com",
    actionTitle: "Profil",
    orderType: "google_removal",
    selfGuide: ["Öffnen und prüfen"],
    aiExplain: { whyFound: "SERP", whyRelevant: "Öffentlich" },
  },
];

describe("threats gemini payload", () => {
  it("builds facts-only payload with counts", () => {
    const payload: ThreatsGeminiPayload = buildThreatsGeminiPayload(sample);
    expect(payload.mode).toBe("facts_only");
    expect(payload.threatCount).toBe(2);
    expect(payload.highCount).toBe(1);
    expect(payload.mediumCount).toBe(1);
    expect(payload.modules).toContain("google_search");
    expect(payload.threats[0]?.title).toBe("Leak");
  });

  it("fingerprints threat sets stably", () => {
    const a = threatsInputFingerprint(sample);
    const b = threatsInputFingerprint([...sample].reverse());
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
