import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import {
  recordApiUsageEvent,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";
import { GEMINI_OSINT_SAFETY_SETTINGS } from "@/lib/analysis/gemini-safety";

export type SeoKeywordAiInput = {
  title: string;
  category: string;
  targetModule: string;
  searchIntent: string;
  difficulty: string;
  language: string;
  existingKeywords?: string[];
  userId?: number | null;
};

export type SeoKeywordAiResult = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  questions: string[];
  searchIntentReason: string;
  articleFocus: string;
  model: string;
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
  error?: {
    message?: string;
  };
};

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

function mergeUsage(
  current: ApiTokenUsage | null,
  next: ApiTokenUsage | null
): ApiTokenUsage | null {
  if (!next) return current;
  if (!current) return next;

  return {
    promptTokenCount: current.promptTokenCount + next.promptTokenCount,
    candidatesTokenCount:
      current.candidatesTokenCount + next.candidatesTokenCount,
    totalTokenCount:
      (current.totalTokenCount ?? 0) + (next.totalTokenCount ?? 0),
  };
}

function extractText(body: GeminiResponse): string {
  return (body.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cleanJsonText(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function stringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;

    const clean = item.trim().replace(/\s+/g, " ");
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(clean);

    if (result.length >= max) break;
  }

  return result;
}

function parseKeywordResult(text: string, model: string): SeoKeywordAiResult {
  const raw = JSON.parse(cleanJsonText(text)) as Record<string, unknown>;

  const primaryKeyword =
    typeof raw.primaryKeyword === "string" ? raw.primaryKeyword.trim() : "";

  if (!primaryKeyword) {
    throw new Error("Gemini hat kein Hauptkeyword geliefert.");
  }

  return {
    primaryKeyword,
    secondaryKeywords: stringArray(raw.secondaryKeywords, 10),
    longTailKeywords: stringArray(raw.longTailKeywords, 8),
    questions: stringArray(raw.questions, 8),
    searchIntentReason:
      typeof raw.searchIntentReason === "string"
        ? raw.searchIntentReason.trim()
        : "",
    articleFocus:
      typeof raw.articleFocus === "string" ? raw.articleFocus.trim() : "",
    model,
  };
}

function buildPrompt(input: SeoKeywordAiInput): string {
  return `Du bist SEO-Redaktionsassistent für SynSight, eine Plattform für digitale Identität, OSINT, Datenschutz und Internet-Sicherheit.

AUFGABE:
Erstelle eine sinnvolle Keyword-Strategie für eine deutschsprachige Wissensseite.

WICHTIGE REGELN:
- Keine erfundenen Suchvolumina.
- Keine erfundenen Google-Daten oder Rankings.
- Keywords müssen natürlich zu Thema und Suchintention passen.
- Keine Keyword-Spam-Listen.
- Formuliere so, wie echte Nutzer suchen könnten.
- Schwerpunkt DACH / deutschsprachige Suche.
- Das Hauptkeyword soll möglichst konkret sein.
- Nebenkeywords sollen das Hauptthema sinnvoll ergänzen.
- Long-Tail-Keywords dürfen Fragen oder längere Suchphrasen sein.
- Nutzerfragen sollen sich für FAQ oder Artikelabschnitte eignen.
- Keine Markdown-Ausgabe.
- Antworte ausschließlich als gültiges JSON.

SEITENKONTEXT:
Titel/Thema: ${input.title}
Kategorie: ${input.category}
Passendes SynSight-Modul: ${input.targetModule}
Suchintention: ${input.searchIntent}
Leser-Niveau: ${input.difficulty}
Sprache: ${input.language}
Bereits eingetragene Begriffe: ${
    input.existingKeywords?.length ? input.existingKeywords.join(", ") : "keine"
  }

JSON-FORMAT:
{
  "primaryKeyword": "ein Hauptkeyword",
  "secondaryKeywords": [
    "Nebenkeyword 1",
    "Nebenkeyword 2",
    "Nebenkeyword 3",
    "Nebenkeyword 4",
    "Nebenkeyword 5"
  ],
  "longTailKeywords": [
    "längere Suchphrase 1",
    "längere Suchphrase 2",
    "längere Suchphrase 3"
  ],
  "questions": [
    "Frage 1?",
    "Frage 2?",
    "Frage 3?",
    "Frage 4?"
  ],
  "searchIntentReason": "Kurze einfache Erklärung, warum diese Suchintention passt.",
  "articleFocus": "Kurzer redaktioneller Vorschlag, worauf der Artikel seinen Schwerpunkt legen sollte."
}`;
}

export async function generateSeoKeywordSuggestions(
  input: SeoKeywordAiInput
): Promise<SeoKeywordAiResult> {
  const credentials = await resolveGeminiCredentials();

  if (!credentials) {
    throw new Error(
      "Gemini ist nicht konfiguriert. Bitte API-Key im Adminbereich prüfen."
    );
  }

  const prompt = buildPrompt(input);

  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ];

  let lastError = "Gemini-Anfrage fehlgeschlagen.";
  let accumulatedUsage: ApiTokenUsage | null = null;
  let attempts = 0;

  for (const model of models) {
    attempts += 1;

    try {
      const isGemini3 = /gemini-3/i.test(model);

      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: 2200,
        responseMimeType: "application/json",
      };

      if (isGemini3) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "minimal",
        };
      } else {
        generationConfig.temperature = 0.25;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          credentials.apiKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig,
            safetySettings: GEMINI_OSINT_SAFETY_SETTINGS,
          }),
        }
      );

      const body = (await response.json().catch(() => ({}))) as GeminiResponse;

      accumulatedUsage = mergeUsage(
        accumulatedUsage,
        parseUsage(body.usageMetadata)
      );

      if (!response.ok) {
        lastError =
          body.error?.message || `Gemini HTTP ${response.status} (${model})`;
        continue;
      }

      const text = extractText(body);

      if (!text) {
        lastError = `Gemini lieferte keinen Text (${model}).`;
        continue;
      }

      let result: SeoKeywordAiResult;

      try {
        result = parseKeywordResult(text, model);
      } catch (error) {
        lastError =
          error instanceof Error
            ? `${error.message} (${model})`
            : `Ungültige Gemini-Antwort (${model})`;
        continue;
      }

      await markApiCredentialSuccess("gemini");

      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "seo_keyword_suggestions",
        referenceKey: `gemini:seo-keywords:${Date.now()}`,
        userId: input.userId ?? null,
        requestCount: attempts,
        success: true,
        detail: `SEO Keyword Assistant · ${input.title} · ${model}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          model,
          module: "seo_content_center",
          action: "keyword_suggestions",
          category: input.category,
          targetModule: input.targetModule,
          searchIntent: input.searchIntent,
          primaryKeyword: result.primaryKeyword,
        },
      });

      return result;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Gemini-Netzwerkfehler";
    }
  }

  await markApiCredentialError("gemini", lastError);

  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "seo_keyword_suggestions_error",
    referenceKey: `gemini:seo-keywords:error:${Date.now()}`,
    userId: input.userId ?? null,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 400),
    tokenUsage: accumulatedUsage,
    metaJson: {
      module: "seo_content_center",
      action: "keyword_suggestions",
    },
  });

  throw new Error(lastError);
}

export type SeoOutlineAiResult = {
  heroSubtitleSuggestions: string[];
  sectionHeadings: string[];
  recommendedIntroAngle: string;
  model: string;
};

export async function generateSeoOutlineSuggestions(input: {
  title: string;
  category: string;
  targetModule: string;
  searchIntent: string;
  difficulty: string;
  language: string;
  keywords: string[];
  userId?: number | null;
}): Promise<SeoOutlineAiResult> {
  const credentials = await resolveGeminiCredentials();

  if (!credentials) {
    throw new Error("Gemini ist nicht konfiguriert.");
  }

  const prompt = `Du bist SEO-Redaktionsassistent für SynSight.

Erstelle für die folgende Wissensseite einen leicht verständlichen Seitenaufbau.

THEMA:
${input.title}

KATEGORIE:
${input.category}

SYN//SIGHT-MODUL:
${input.targetModule}

SUCHINTENTION:
${input.searchIntent}

LESERNIVEAU:
${input.difficulty}

KEYWORDS:
${input.keywords.join(", ") || "keine"}

REGELN:
- Zielgruppe DACH.
- Keine Keyword-Spam-Überschriften.
- Verständlich auch für Einsteiger.
- Untertitel sollen Nutzen und Problem verständlich erklären.
- 5 bis 7 sinnvolle Inhaltsabschnitte.
- Keine erfundenen Fakten.
- Nur JSON zurückgeben.

FORMAT:
{
  "heroSubtitleSuggestions": [
    "Untertitel Variante 1",
    "Untertitel Variante 2",
    "Untertitel Variante 3"
  ],
  "sectionHeadings": [
    "Abschnitt 1",
    "Abschnitt 2",
    "Abschnitt 3",
    "Abschnitt 4",
    "Abschnitt 5"
  ],
  "recommendedIntroAngle": "Kurzer Hinweis, wie die Einleitung aufgebaut werden sollte."
}`;

  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ];

  let lastError = "Gemini-Strukturanfrage fehlgeschlagen.";
  let accumulatedUsage: ApiTokenUsage | null = null;
  let attempts = 0;

  for (const model of models) {
    attempts += 1;

    try {
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: 1800,
        responseMimeType: "application/json",
      };

      if (/gemini-3/i.test(model)) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "minimal",
        };
      } else {
        generationConfig.temperature = 0.25;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          credentials.apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings: GEMINI_OSINT_SAFETY_SETTINGS,
          }),
        }
      );

      const body = (await response.json().catch(() => ({}))) as GeminiResponse;

      accumulatedUsage = mergeUsage(
        accumulatedUsage,
        parseUsage(body.usageMetadata)
      );

      if (!response.ok) {
        lastError =
          body.error?.message || `Gemini HTTP ${response.status} (${model})`;
        continue;
      }

      const text = extractText(body);

      if (!text) {
        lastError = `Leere Gemini-Antwort (${model})`;
        continue;
      }

      const parsed = JSON.parse(cleanJsonText(text)) as Record<string, unknown>;

      const subtitles = stringArray(parsed.heroSubtitleSuggestions, 3);

      const headings = stringArray(parsed.sectionHeadings, 8);

      if (subtitles.length === 0 || headings.length < 3) {
        lastError = `Unvollständige Struktur (${model})`;
        continue;
      }

      const result: SeoOutlineAiResult = {
        heroSubtitleSuggestions: subtitles,
        sectionHeadings: headings,
        recommendedIntroAngle:
          typeof parsed.recommendedIntroAngle === "string"
            ? parsed.recommendedIntroAngle.trim()
            : "",
        model,
      };

      await markApiCredentialSuccess("gemini");

      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "seo_structure_generation",
        referenceKey: `gemini:seo-structure:${Date.now()}`,
        userId: input.userId ?? null,
        requestCount: attempts,
        success: true,
        detail: `SEO Structure Assistant · ${input.title} · ${model}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          model,
          module: "seo_content_center",
          action: "structure_generation",
          category: input.category,
          sectionCount: headings.length,
        },
      });

      return result;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Gemini-Strukturanfrage fehlgeschlagen.";
    }
  }

  await markApiCredentialError("gemini", lastError);

  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "seo_structure_generation_error",
    referenceKey: `gemini:seo-structure:error:${Date.now()}`,
    userId: input.userId ?? null,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 400),
    tokenUsage: accumulatedUsage,
    metaJson: {
      module: "seo_content_center",
      action: "structure_generation",
    },
  });

  throw new Error(lastError);
}

export type SeoContentAiResult = {
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  seoTitle: string;
  metaDescription: string;
  model: string;
};

export async function generateSeoContentDraft(input: {
  title: string;
  heroSubtitle: string;
  category: string;
  targetModule: string;
  searchIntent: string;
  difficulty: string;
  language: string;
  keywords: string[];
  sectionHeadings: string[];
  userId?: number | null;
}): Promise<SeoContentAiResult> {
  const credentials = await resolveGeminiCredentials();

  if (!credentials) {
    throw new Error("Gemini ist nicht konfiguriert.");
  }

  if (input.sectionHeadings.length === 0) {
    throw new Error(
      "Bitte zuerst in Schritt 3 mindestens einen Inhaltsabschnitt anlegen."
    );
  }

  const prompt = `Du bist SEO-Redakteur für SynSight.

SynSight beschäftigt sich mit digitaler Identität, OSINT, Datenschutz,
Datenlecks und Internet-Sicherheit.

Erstelle einen vollständigen hochwertigen Entwurf für eine Wissensseite.

THEMA:
${input.title}

UNTERTITEL:
${input.heroSubtitle || "nicht vorgegeben"}

KATEGORIE:
${input.category}

PASSENDES SYN//SIGHT-MODUL:
${input.targetModule}

SUCHINTENTION:
${input.searchIntent}

LESERNIVEAU:
${input.difficulty}

SPRACHE:
${input.language}

KEYWORDS:
${input.keywords.join(", ") || "keine"}

VORGEGEBENE ARTIKELSTRUKTUR:
${input.sectionHeadings
  .map((heading, index) => `${index + 1}. ${heading}`)
  .join("\n")}

REGELN:
- Schreibe natürlich und hilfreich.
- Kein Keyword-Stuffing.
- Keine erfundenen Studien, Zahlen oder Statistiken.
- Keine erfundenen Quellen.
- Verständlich für die angegebene Zielgruppe.
- Fachbegriffe bei Einsteigern erklären.
- Sicherheitsrisiken sachlich erklären, keine Panikmache.
- SynSight darf passend erwähnt werden, aber der Artikel darf kein reiner Werbetext sein.
- Verwende die vorgegebene Struktur.
- Jeder Abschnitt soll substanziellen Inhalt enthalten.
- Einleitung ungefähr 120 bis 220 Wörter.
- Je Inhaltsabschnitt ungefähr 180 bis 350 Wörter, wenn das Thema genug Inhalt bietet.
- 4 bis 6 hilfreiche FAQ.
- SEO-Titel möglichst ungefähr 40 bis 65 Zeichen.
- Meta-Description möglichst ungefähr 130 bis 165 Zeichen.
- Antworte ausschließlich als gültiges JSON.
- Kein Markdown-Codeblock um das JSON.

JSON:
{
  "intro": "Einleitung",
  "sections": [
    {
      "heading": "Überschrift exakt oder sinngemäß aus der Vorgabe",
      "body": "vollständiger Abschnitt"
    }
  ],
  "faqs": [
    {
      "question": "Frage?",
      "answer": "Hilfreiche Antwort"
    }
  ],
  "seoTitle": "SEO-Titel",
  "metaDescription": "Meta-Beschreibung"
}`;

  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ];

  let lastError = "Gemini-Content-Anfrage fehlgeschlagen.";
  let accumulatedUsage: ApiTokenUsage | null = null;
  let attempts = 0;

  for (const model of models) {
    attempts += 1;

    try {
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: 10000,
        responseMimeType: "application/json",
      };

      if (/gemini-3/i.test(model)) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "minimal",
        };
      } else {
        generationConfig.temperature = 0.3;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          credentials.apiKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig,
            safetySettings: GEMINI_OSINT_SAFETY_SETTINGS,
          }),
        }
      );

      const body = (await response.json().catch(() => ({}))) as GeminiResponse;

      accumulatedUsage = mergeUsage(
        accumulatedUsage,
        parseUsage(body.usageMetadata)
      );

      if (!response.ok) {
        lastError =
          body.error?.message || `Gemini HTTP ${response.status} (${model})`;
        continue;
      }

      const text = extractText(body);

      if (!text) {
        lastError = `Gemini lieferte keinen Content (${model})`;
        continue;
      }

      const parsed = JSON.parse(cleanJsonText(text)) as Record<string, unknown>;

      const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";

      const seoTitle =
        typeof parsed.seoTitle === "string" ? parsed.seoTitle.trim() : "";

      const metaDescription =
        typeof parsed.metaDescription === "string"
          ? parsed.metaDescription.trim()
          : "";

      const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];

      const sections = rawSections
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const row = item as Record<string, unknown>;

          const heading =
            typeof row.heading === "string" ? row.heading.trim() : "";

          const body = typeof row.body === "string" ? row.body.trim() : "";

          if (!heading || !body) return null;

          return { heading, body };
        })
        .filter(
          (
            item
          ): item is {
            heading: string;
            body: string;
          } => Boolean(item)
        );

      const rawFaqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];

      const faqs = rawFaqs
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const row = item as Record<string, unknown>;

          const question =
            typeof row.question === "string" ? row.question.trim() : "";

          const answer =
            typeof row.answer === "string" ? row.answer.trim() : "";

          if (!question || !answer) return null;

          return { question, answer };
        })
        .filter(
          (
            item
          ): item is {
            question: string;
            answer: string;
          } => Boolean(item)
        );

      if (
        intro.length < 80 ||
        sections.length === 0 ||
        !seoTitle ||
        !metaDescription
      ) {
        lastError = `Unvollständiger Content (${model})`;
        continue;
      }

      const result: SeoContentAiResult = {
        intro,
        sections,
        faqs,
        seoTitle,
        metaDescription,
        model,
      };

      await markApiCredentialSuccess("gemini");

      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "seo_content_generation",
        referenceKey: `gemini:seo-content:${Date.now()}`,
        userId: input.userId ?? null,
        requestCount: attempts,
        success: true,
        detail: `SEO Content Writer · ${input.title} · ${model}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          model,
          module: "seo_content_center",
          action: "content_generation",
          category: input.category,
          sectionCount: result.sections.length,
          faqCount: result.faqs.length,
        },
      });

      return result;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Gemini-Content-Anfrage fehlgeschlagen.";
    }
  }

  await markApiCredentialError("gemini", lastError);

  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "seo_content_generation_error",
    referenceKey: `gemini:seo-content:error:${Date.now()}`,
    userId: input.userId ?? null,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 400),
    tokenUsage: accumulatedUsage,
    metaJson: {
      module: "seo_content_center",
      action: "content_generation",
    },
  });

  throw new Error(lastError);
}
