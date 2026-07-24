import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";
import {
  GEMINI_OSINT_SAFETY_SETTINGS,
  GEMINI_SAFETY_FALLBACK_MESSAGE,
  isGeminiSafetyBlock,
} from "@/lib/analysis/gemini-safety";
import {
  AI_SUMMARY_FINDING_TITLE,
  type DigitalExposureFinding,
  type DigitalExposureGeminiPayload,
  type DigitalExposureManagementOverview,
  type DigitalExposureThreatMatrix,
} from "@/lib/analysis/digital-exposure/types";
import { isAiSummaryFinding } from "@/lib/analysis/digital-exposure/report-metrics";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import {
  recordApiUsageEvent,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";

/**
 * Facts-only payload for Gemini Digital Forensics Analyst.
 */
export function buildGeminiPrepPayload(input: {
  subjectName: string;
  riskScore: number;
  findings: DigitalExposureFinding[];
  managementOverview?: DigitalExposureManagementOverview;
  threatMatrix?: DigitalExposureThreatMatrix;
}): DigitalExposureGeminiPayload {
  const findings = input.findings.filter(
    (f) => !isAiSummaryFinding(f) && f.title !== AI_SUMMARY_FINDING_TITLE
  );

  return {
    mode: "facts_only",
    instructions:
      "Du bist DIGITAL FORENSICS ANALYST. Erstelle einen professionellen Cybersecurity-Bericht ausschließlich aus den gelieferten Fakten. Keine neuen Leaks, keine Vermutungen, keine Personenbewertung, keine Beschönigung.",
    subjectName: input.subjectName,
    riskScore: input.riskScore,
    findings: findings.map((finding) => ({
      type: finding.type,
      title: finding.title,
      riskLevel: finding.riskLevel,
      sourceName: finding.sourceName,
      sourceDate: finding.sourceDate,
      recommendation: finding.recommendation,
      dataClasses: finding.dataClasses,
      attributes: finding.attributes,
      recordCount: finding.recordCount,
      confidence: finding.confidence,
      hashType: finding.hashType,
      collection: finding.collection,
    })),
    managementOverview: input.managementOverview,
    threatMatrix: input.threatMatrix,
    constraints: [
      "Nur bestätigte API-Treffer verwenden",
      "Keine Passwörter oder Secrets erfinden oder speichern",
      "Keine Spekulation über Identität oder Motivation",
      "Kompromittierende Inhalte ausdrücklich nennen wenn in den Daten vorhanden",
      "Empfehlungen priorisieren: SOFORT / HOCH / MITTEL / OPTIONAL",
      "Jede Aussage braucht Bezug zu gelieferten Quellen/Feldern",
    ],
  };
}

function buildPrompt(payload: DigitalExposureGeminiPayload): string {
  return `Du bist DIGITAL FORENSICS ANALYST eines Cyber Security Unternehmens.

NICHT Assistent. NICHT freundlich. NICHT beschönigend. NICHT dramatisierend.
Du beschreibst ausschließlich nachweisbare Fakten aus den gelieferten DeHashed-/Exposure-Daten.
Du erfindest nichts. Du ergänzt nichts. Du verschweigst nichts, was in den Daten steht.

Falls in den Daten Hinweise auf Pornografie, Dating-Portale, Glücksspiel,
kompromittierende Plattformen, gehackte Accounts, Spamlisten, auffällige Foren,
illegale Inhalte oder Darknet-Bezüge vorkommen: ausdrücklich benennen.

VERBOTENE FORMULIERUNGEN (außer wörtlich in Daten):
vermutlich, könnte, wahrscheinlich, scheint, möglicherweise, eventuell.

AUSGABESTRUKTUR (genau diese Abschnitte):

1. Digital Forensics Kurzlage
Nur belegte Exposure-Lage der Identität.

2. Sicherheitsanalyse
Bewerte ausschließlich anhand der Daten:
- mehrfach gefundene Identitätsmerkmale
- Überschneidungen zwischen Quellen
- aktuelle vs. historische Signale (wenn Daten vorhanden)
- Wahrscheinlichkeit (faktenbasiert) für:
  Credential Stuffing, Phishing, Spam, Social Engineering,
  Identitätsdiebstahl, Accountübernahmen, SIM-Swapping
Nutze threatMatrix-Werte wenn vorhanden.

3. Leak-Quellen
Jede bestätigte Quelle mit betroffenen Merkmalen (attributes/dataClasses).

4. Maßnahmenplan
Keine Standardfloskeln. Pro Maßnahme:
Warum · Risiko · Umsetzung · Zeitaufwand · Schwierigkeit · Priorität (SOFORT/HOCH/MITTEL/OPTIONAL) · Nutzen
Bezug zu konkreten Quellen.

5. Quellenübersicht
Liste der Leak-Quellen aus den Daten.

DATEN (JSON — einzige erlaubte Faktenbasis):
${JSON.stringify(payload)}`;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiCandidate {
  finishReason?: string;
  content?: { parts?: Array<{ text?: string; thought?: boolean }> };
}

interface GeminiGenerateResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsageMetadata;
}

function parseUsageMetadata(raw: unknown): ApiTokenUsage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const meta = raw as GeminiUsageMetadata;
  const prompt = Number(meta.promptTokenCount) || 0;
  const candidates = Number(meta.candidatesTokenCount) || 0;
  const total =
    Number(meta.totalTokenCount) ||
    (prompt > 0 || candidates > 0 ? prompt + candidates : 0);
  if (prompt <= 0 && candidates <= 0 && total <= 0) return null;
  return {
    promptTokenCount: prompt,
    candidatesTokenCount: candidates,
    totalTokenCount: total,
  };
}

function extractCandidateText(candidate: GeminiCandidate | undefined): string {
  const parts = candidate?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function generationConfigForModel(model: string): Record<string, unknown> {
  const isGemini3 = /gemini-3/i.test(model);
  const config: Record<string, unknown> = { maxOutputTokens: 8192 };
  if (isGemini3) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    config.temperature = 0.15;
  }
  return config;
}

/** Live Gemini Digital Forensics summary — facts only, billed like Google KI. */
export async function summarizeDigitalExposureWithGemini(
  payload: DigitalExposureGeminiPayload,
  options?: { userId?: number | null; analysisId?: number | null }
): Promise<string | null> {
  const credentials = await resolveGeminiCredentials();
  if (!credentials) return null;

  const prompt = buildPrompt(payload);
  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError = "gemini failed";
  let attempts = 0;
  let bestPartial: string | null = null;
  let accumulatedUsage: ApiTokenUsage | null = null;
  let safetyBlocked = false;

  for (const model of models) {
    attempts += 1;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(credentials.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: generationConfigForModel(model),
            safetySettings: GEMINI_OSINT_SAFETY_SETTINGS,
          }),
        }
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `HTTP ${response.status}: ${detail.slice(0, 200)}`;
        continue;
      }
      const body = (await response.json()) as GeminiGenerateResponse;
      const usage = parseUsageMetadata(body.usageMetadata);
      if (usage) {
        accumulatedUsage = accumulatedUsage
          ? {
              promptTokenCount:
                accumulatedUsage.promptTokenCount + usage.promptTokenCount,
              candidatesTokenCount:
                accumulatedUsage.candidatesTokenCount +
                usage.candidatesTokenCount,
              totalTokenCount:
                (accumulatedUsage.totalTokenCount ?? 0) +
                (usage.totalTokenCount ?? 0),
            }
          : usage;
      }

      const candidate = body.candidates?.[0];
      const finishReason = candidate?.finishReason ?? null;
      const promptBlock = body.promptFeedback?.blockReason ?? null;
      if (
        isGeminiSafetyBlock({
          finishReason,
          blockReason: promptBlock,
          promptBlockReason: promptBlock,
        })
      ) {
        safetyBlocked = true;
        lastError = `SAFETY block (${model})`;
        continue;
      }

      const text = extractCandidateText(candidate);
      if (!text) {
        lastError = "empty candidate text";
        continue;
      }
      const sanitized = sanitizeAiSummary(text);
      if (sanitized.length > (bestPartial?.length ?? 0)) {
        bestPartial = sanitized;
      }

      const truncated =
        finishReason === "MAX_TOKENS" || finishReason === "LENGTH";
      const complete =
        !truncated &&
        (isCompleteAiSummary(sanitized) ||
          (sanitized.length >= 200 &&
            /Sicherheitsanalyse|Maßnahmenplan|Leak-Quellen/i.test(sanitized)));

      if (!complete) {
        lastError = truncated
          ? `MAX_TOKENS (${sanitized.length})`
          : `incomplete (${sanitized.length})`;
        continue;
      }

      await markApiCredentialSuccess("gemini");
      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "summarize",
        referenceKey: `gemini:digital-leak:${payload.subjectName}:${Date.now()}`,
        userId: options?.userId ?? null,
        analysisId: options?.analysisId ?? null,
        requestCount: attempts,
        success: true,
        detail: `Digital Forensics · ${payload.subjectName} · ${model}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          model,
          module: "digital_leak_exposure",
          findingCount: payload.findings.length,
          finishReason,
        },
      });
      return sanitized;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "gemini failed";
    }
  }

  if (bestPartial && bestPartial.length >= 160) {
    await markApiCredentialSuccess("gemini");
    await recordApiUsageEvent({
      providerCode: "gemini",
      eventType: "summarize_partial",
      referenceKey: `gemini-partial:digital-leak:${Date.now()}`,
      userId: options?.userId ?? null,
      analysisId: options?.analysisId ?? null,
      requestCount: Math.max(1, attempts),
      success: true,
      detail: `Digital Forensics (Teilantwort) · ${payload.subjectName}`,
      tokenUsage: accumulatedUsage,
      metaJson: { lastError, module: "digital_leak_exposure" },
    });
    return sanitizeAiSummary(bestPartial);
  }

  if (safetyBlocked) {
    await recordApiUsageEvent({
      providerCode: "gemini",
      eventType: "summarize_safety_fallback",
      referenceKey: `gemini-safety:digital-leak:${Date.now()}`,
      userId: options?.userId ?? null,
      analysisId: options?.analysisId ?? null,
      requestCount: Math.max(1, attempts),
      success: true,
      detail: `Digital Forensics Safety-Fallback · ${payload.subjectName}`,
      tokenUsage: accumulatedUsage,
    });
    return GEMINI_SAFETY_FALLBACK_MESSAGE;
  }

  await markApiCredentialError("gemini", lastError);
  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "summarize_error",
    referenceKey: `gemini-error:digital-leak:${Date.now()}`,
    userId: options?.userId ?? null,
    analysisId: options?.analysisId ?? null,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 500),
    tokenUsage: accumulatedUsage,
  });
  return null;
}
