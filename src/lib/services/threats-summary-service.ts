import {
  threatsInputFingerprint,
  type PlatformThreat,
} from "@/lib/dashboard/build-threats-from-reports";
import { loadUserThreatBundle } from "@/lib/dashboard/load-user-threats";
import { summarizeThreatsWithGemini } from "@/lib/dashboard/threats-gemini";
import {
  getThreatsSummaryForUser,
  hashThreatsPrompt,
  upsertThreatsSummary,
  type ThreatsSummaryRecord,
} from "@/lib/dashboard/threats-summary-repository";

export type ThreatsSummaryView = {
  summary: ThreatsSummaryRecord | null;
  threats: PlatformThreat[];
  needsGeneration: boolean;
  fingerprint: string;
};

/**
 * Regenerate combined threats KI summary from current filtered findings.
 * Skips Gemini if fingerprint unchanged (unless force).
 */
export async function regenerateThreatsSummary(
  userId: number,
  options?: { force?: boolean }
): Promise<ThreatsSummaryRecord | null> {
  const { threats } = await loadUserThreatBundle(userId);
  const fingerprint = threatsInputFingerprint(threats);
  const modules = [...new Set(threats.map((t) => t.moduleKey))];

  const existing = await getThreatsSummaryForUser(userId);
  if (
    !options?.force &&
    existing &&
    existing.inputFingerprint === fingerprint &&
    (existing.status === "ready" || existing.status === "empty")
  ) {
    return existing;
  }

  if (threats.length === 0) {
    return upsertThreatsSummary({
      userId,
      summaryText:
        "Keine priorisierten Bedrohungen aus den vorliegenden Analysen.",
      inputFingerprint: fingerprint,
      threatCount: 0,
      modules,
      status: "empty",
      model: null,
      promptHash: null,
    });
  }

  const promptHash = hashThreatsPrompt(threats);
  const { text, model } = await summarizeThreatsWithGemini(threats, { userId });

  if (!text) {
    return upsertThreatsSummary({
      userId,
      summaryText:
        existing?.summaryText ||
        "KI-Lagebild konnte nicht erzeugt werden. Die Bedrohungsliste unten bleibt maßgeblich.",
      inputFingerprint: fingerprint,
      threatCount: threats.length,
      modules,
      status: "failed",
      model,
      promptHash,
      errorMessage: "gemini_unavailable",
    });
  }

  return upsertThreatsSummary({
    userId,
    summaryText: text,
    inputFingerprint: fingerprint,
    threatCount: threats.length,
    modules,
    status: "ready",
    model,
    promptHash,
    errorMessage: null,
  });
}

/** Fire-and-forget after a successful analysis run. */
export function queueThreatsSummaryRegeneration(userId: number): void {
  if (!Number.isFinite(userId) || userId <= 0) return;
  void regenerateThreatsSummary(userId, { force: true }).catch((error) => {
    console.error("[threats-summary] background regenerate failed", error);
  });
}

export async function getThreatsSummaryView(
  userId: number
): Promise<ThreatsSummaryView> {
  const { threats, hasAnyReport } = await loadUserThreatBundle(userId);
  const fingerprint = threatsInputFingerprint(threats);
  const summary = await getThreatsSummaryForUser(userId);

  const needsGeneration =
    hasAnyReport &&
    (!summary ||
      summary.inputFingerprint !== fingerprint ||
      (summary.status === "failed" && threats.length > 0));

  return { summary, threats, needsGeneration, fingerprint };
}
