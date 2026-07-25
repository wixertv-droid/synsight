import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";
import {
  GEMINI_OSINT_SAFETY_SETTINGS,
  GEMINI_SAFETY_FALLBACK_MESSAGE,
  isGeminiSafetyBlock,
} from "@/lib/analysis/gemini-safety";
import type {
  UsernameGeminiPayload,
  UsernameHit,
  UsernameManagementOverview,
} from "@/lib/analysis/username/types";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import {
  recordApiUsageEvent,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";
import { createHash } from "node:crypto";

export function buildUsernameGeminiPayload(input: {
  subjectName: string;
  subjectUsername: string;
  identityScore: number;
  riskScore: number;
  hits: UsernameHit[];
  managementOverview: UsernameManagementOverview;
}): UsernameGeminiPayload {
  return {
    mode: "facts_only",
    instructions:
      "Du bist DIGITAL IDENTITY ANALYST. Beschreibe ausschließlich gelieferte Username-Treffer. Keine Halluzinationen, keine Ergänzungen, keine Beschönigung.",
    subjectName: input.subjectName,
    subjectUsername: input.subjectUsername,
    identityScore: input.identityScore,
    riskScore: input.riskScore,
    hits: input.hits.map((hit) => ({
      platform: hit.platform,
      category: hit.category,
      profileName: hit.profileName,
      profileUrl: hit.profileUrl,
      title: hit.title,
      snippet: hit.snippet,
      visibleInfo: hit.visibleInfo,
      confidence: hit.confidence,
      riskLevel: hit.riskLevel,
      isProblematic: hit.isProblematic,
      problemTags: hit.problemTags,
    })),
    managementOverview: input.managementOverview,
    constraints: [
      "Nur echte SerpAPI-Treffer verwenden",
      "Keine Vermutungen über Personen ohne Beleg in hits",
      "Problematische Plattformen sachlich nennen wenn in Daten vorhanden",
      "Confidence und Plattformnamen beibehalten",
      "Empfehlungen: SOFORT / HOCH / MITTEL / OPTIONAL",
    ],
  };
}

function buildPrompt(payload: UsernameGeminiPayload): string {
  return `Du bist DIGITAL IDENTITY ANALYST eines Cyber Security Unternehmens.

NICHT Assistent. NICHT freundlich. NICHT beschönigend.
Arbeite ausschließlich mit den gelieferten Treffern (JSON). Erfinde keine Profile.

Beantworte in diesen Abschnitten:

1. Kurzlage
Wo erscheint der Benutzername? Wie viele Plattformen?

2. Identitätsverknüpfung
Welche Plattformen gehören wahrscheinlich zusammen (nur anhand gelieferter Confidence/Signale)?
Ist der Benutzername eher einzigartig?

3. Öffentliche Exposition
Welche Plattformen wirken besonders öffentlich?
Welche Informationen lassen sich über die Person ableiten (nur aus visibleInfo/title/snippet)?

4. Risiken
Welche Risiken entstehen? Problematische Kategorien ausdrücklich nennen wenn vorhanden
(Pornografie, Glücksspiel, Extremismus, Dating, gehackte Accounts, Scam, auffällige Foren, Darknet).

5. Maßnahmenplan
Priorisiert SOFORT / HOCH / MITTEL / OPTIONAL mit Warum · Risiko · Umsetzung · Zeitaufwand · Schwierigkeit · Nutzen.

DATEN (JSON — einzige Faktenbasis):
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
  error?: { message?: string };
}

function parseUsage(raw: unknown): ApiTokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
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

function extractText(candidate: GeminiCandidate | undefined): string {
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
  const config: Record<string, unknown> = { maxOutputTokens: 4096 };
  if (isGemini3) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    config.temperature = 0.15;
  }
  return config;
}

export async function summarizeUsernameWithGemini(input: {
  payload: UsernameGeminiPayload;
  userId?: number | null;
  analysisId?: number | null;
}): Promise<{
  summary: string | null;
  model: string | null;
  promptHash: string | null;
  tokenUsage: ApiTokenUsage | null;
}> {
  const credentials = await resolveGeminiCredentials();
  if (!credentials) {
    return {
      summary: null,
      model: null,
      promptHash: null,
      tokenUsage: null,
    };
  }

  const prompt = buildPrompt(input.payload);
  const promptHash = createHash("sha256")
    .update(prompt)
    .digest("hex")
    .slice(0, 32);
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
  let usedModel: string | null = null;
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
      const usage = parseUsage(body.usageMetadata);
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

      const text = extractText(candidate);
      if (!text) {
        lastError = "empty candidate text";
        continue;
      }
      const sanitized = sanitizeAiSummary(text);
      if (sanitized.length > (bestPartial?.length ?? 0)) {
        bestPartial = sanitized;
        usedModel = model;
      }

      const complete =
        isCompleteAiSummary(sanitized) ||
        (sanitized.length >= 200 &&
          /Kurzlage|Identitätsverknüpfung|Maßnahmenplan/i.test(sanitized));

      if (!complete) {
        lastError = `incomplete (${sanitized.length})`;
        continue;
      }

      await markApiCredentialSuccess("gemini");
      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "username_intelligence",
        referenceKey: `gemini:username:${input.payload.subjectUsername}:${Date.now()}`,
        userId: input.userId ?? null,
        analysisId: input.analysisId ?? null,
        requestCount: attempts,
        success: true,
        detail: `Username Identity · ${input.payload.subjectUsername} · ${model}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          model,
          module: "username_intelligence",
          hitCount: input.payload.hits.length,
          finishReason,
        },
      });
      return {
        summary: sanitized,
        model,
        promptHash,
        tokenUsage: accumulatedUsage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "gemini failed";
    }
  }

  if (bestPartial && bestPartial.length >= 160) {
    await markApiCredentialSuccess("gemini");
    await recordApiUsageEvent({
      providerCode: "gemini",
      eventType: "username_intelligence_partial",
      referenceKey: `gemini-partial:username:${Date.now()}`,
      userId: input.userId ?? null,
      analysisId: input.analysisId ?? null,
      requestCount: Math.max(1, attempts),
      success: true,
      detail: `Username Identity (Teilantwort) · ${input.payload.subjectUsername}`,
      tokenUsage: accumulatedUsage,
      metaJson: { lastError, module: "username_intelligence" },
    });
    return {
      summary: sanitizeAiSummary(bestPartial),
      model: usedModel,
      promptHash,
      tokenUsage: accumulatedUsage,
    };
  }

  if (safetyBlocked) {
    await recordApiUsageEvent({
      providerCode: "gemini",
      eventType: "username_intelligence_safety",
      referenceKey: `gemini-safety:username:${Date.now()}`,
      userId: input.userId ?? null,
      analysisId: input.analysisId ?? null,
      requestCount: Math.max(1, attempts),
      success: true,
      detail: `Username Identity Safety-Fallback · ${input.payload.subjectUsername}`,
      tokenUsage: accumulatedUsage,
    });
    return {
      summary: GEMINI_SAFETY_FALLBACK_MESSAGE,
      model: usedModel,
      promptHash,
      tokenUsage: accumulatedUsage,
    };
  }

  await markApiCredentialError("gemini", lastError);
  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "username_intelligence_error",
    referenceKey: `gemini-error:username:${Date.now()}`,
    userId: input.userId ?? null,
    analysisId: input.analysisId ?? null,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 200),
    tokenUsage: accumulatedUsage,
  });

  return {
    summary: null,
    model: usedModel,
    promptHash,
    tokenUsage: accumulatedUsage,
  };
}
