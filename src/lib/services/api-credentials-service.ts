import { eq } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

export const API_PROVIDERS = ["gemini"] as const;

export type ApiProvider = (typeof API_PROVIDERS)[number];

export interface ApiCredentialPublic {
  provider: ApiProvider;
  label: string;
  isActive: boolean;
  configured: boolean;
  maskedSecret: string | null;
  engineId: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface GeminiCredentials {
  apiKey: string;
  source: "database" | "env";
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function providerLabel(provider: ApiProvider): string {
  if (provider === "gemini") return "Google Gemini";
  return provider;
}

function parseConfigObject(
  configJson: unknown
): Record<string, unknown> | null {
  if (!configJson) return null;
  if (typeof configJson === "string") {
    try {
      const parsed = JSON.parse(configJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof configJson === "object" && !Array.isArray(configJson)) {
    return configJson as Record<string, unknown>;
  }
  return null;
}

function readConfigEngineId(configJson: unknown): string | null {
  const config = parseConfigObject(configJson);
  if (!config) return null;
  const value = config.engineId ?? config.cx ?? config.searchEngineId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadStoredProviderRow(provider: string) {
  const db = getDatabase();
  if (!db) return null;
  const rows = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.provider, provider))
    .limit(1);
  return rows[0] ?? null;
}

function tryDecryptSecret(encryptedSecret: string):
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      error: string;
    } {
  try {
    const value = decryptSecret(encryptedSecret).trim();
    if (!value)
      return { ok: false, error: "Entschlüsselter Schlüssel ist leer." };
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Entschlüsselung fehlgeschlagen (IMAGE_ENCRYPTION_KEY/SESSION_SECRET prüfen).",
    };
  }
}

export async function listApiCredentials(
  actor: AuthenticatedUser
): Promise<ApiCredentialPublic[]> {
  assertAdmin(actor);
  const db = getDatabase();
  const rows = db ? await db.select().from(apiCredentials) : [];
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return API_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (!row) {
      return {
        provider,
        label: providerLabel(provider),
        isActive: false,
        configured: false,
        maskedSecret: null,
        engineId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
      };
    }

    let masked: string | null = null;
    try {
      masked = maskSecret(decryptSecret(row.encryptedSecret));
    } catch {
      masked = "••••••••";
    }

    return {
      provider,
      label: row.label,
      isActive: row.isActive,
      configured: true,
      maskedSecret: masked,
      engineId: readConfigEngineId(row.configJson),
      lastSuccessAt: row.lastSuccessAt,
      lastErrorAt: row.lastErrorAt,
      lastErrorMessage: row.lastErrorMessage,
    };
  });
}

export async function upsertApiCredential(
  actor: AuthenticatedUser,
  input: {
    provider: ApiProvider;
    secret?: string | null;
    engineId?: string | null;
    isActive?: boolean;
    label?: string;
  }
): Promise<ApiCredentialPublic> {
  assertAdmin(actor);
  const db = getDatabase();
  const adminId = Number(actor.id);
  const label = input.label?.trim() || providerLabel(input.provider);

  if (!db) {
    return {
      provider: input.provider,
      label,
      isActive: input.isActive ?? true,
      configured: Boolean(input.secret?.trim()),
      maskedSecret: input.secret ? maskSecret(input.secret) : null,
      engineId: input.engineId?.trim() || null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
    };
  }

  const existing = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.provider, input.provider))
    .limit(1);
  const current = existing[0];

  const secret = input.secret?.trim();
  if (!secret && !current) {
    throw new Error("SECRET_REQUIRED");
  }

  const encryptedSecret = secret
    ? encryptSecret(secret)
    : current!.encryptedSecret;

  const configJson = current?.configJson ?? null;

  await db
    .insert(apiCredentials)
    .values({
      provider: input.provider,
      label,
      encryptedSecret,
      configJson,
      isActive: input.isActive ?? true,
      updatedByAdminId: adminId,
    })
    .onDuplicateKeyUpdate({
      set: {
        label,
        encryptedSecret,
        configJson,
        isActive: input.isActive ?? current?.isActive ?? true,
        updatedByAdminId: adminId,
      },
    });

  const listed = await listApiCredentials(actor);
  return listed.find((item) => item.provider === input.provider)!;
}

/** Runtime resolver — DB first, then env. Used by Gemini summary. */
export async function resolveGeminiCredentials(): Promise<GeminiCredentials | null> {
  const db = getDatabase();
  if (db) {
    try {
      const row = await loadStoredProviderRow("gemini");
      if (row?.isActive) {
        const decrypted = tryDecryptSecret(row.encryptedSecret);
        if (decrypted.ok) {
          return { apiKey: decrypted.value, source: "database" };
        }
      }
    } catch (error) {
      console.error("[api-credentials] gemini resolve failed", error);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) return { apiKey, source: "env" };
  return null;
}

export async function markApiCredentialSuccess(
  provider: ApiProvider
): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  try {
    await db
      .update(apiCredentials)
      .set({
        lastSuccessAt: new Date().toISOString(),
        lastErrorAt: null,
        lastErrorMessage: null,
      })
      .where(eq(apiCredentials.provider, provider));
  } catch (error) {
    console.error("[api-credentials] mark success failed", error);
  }
}

export async function markApiCredentialError(
  provider: ApiProvider,
  message: string
): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  try {
    await db
      .update(apiCredentials)
      .set({
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: message.slice(0, 1000),
      })
      .where(eq(apiCredentials.provider, provider));
  } catch (error) {
    console.error("[api-credentials] mark error failed", error);
  }
}

export interface ApiCredentialTestResult {
  provider: string;
  ok: boolean;
  message: string;
  detail?: string;
  latencyMs: number;
  hitCount?: number;
}

/**
 * Live connectivity probe for remaining admin API cards (Gemini).
 * Search provider tests use /api/admin/search-provider/test.
 */
export async function testApiCredentialConnection(input: {
  provider: string;
  secret?: string | null;
  engineId?: string | null;
}): Promise<ApiCredentialTestResult> {
  const started = Date.now();
  const provider = input.provider;

  if (provider === "gemini") {
    let apiKey = input.secret?.trim() || "";
    let source = "draft";

    if (!apiKey) {
      const row = await loadStoredProviderRow("gemini");
      if (!row) {
        const envKey = process.env.GEMINI_API_KEY?.trim() || "";
        if (envKey) {
          apiKey = envKey;
          source = "env";
        } else {
          return {
            provider,
            ok: false,
            message: "Kein Gemini-Eintrag in der Datenbank.",
            detail: "Bitte API-Key speichern und erneut testen.",
            latencyMs: Date.now() - started,
          };
        }
      } else if (!row.isActive) {
        return {
          provider,
          ok: false,
          message: "Gemini ist inaktiv.",
          detail: "Bitte zuerst auf „Aktiv“ schalten.",
          latencyMs: Date.now() - started,
        };
      } else {
        const decrypted = tryDecryptSecret(row.encryptedSecret);
        if (!decrypted.ok) {
          return {
            provider,
            ok: false,
            message: "Gemini-Key in der DB nicht lesbar.",
            detail: `${decrypted.error} — Schlüssel neu speichern.`,
            latencyMs: Date.now() - started,
          };
        }
        apiKey = decrypted.value;
        source = "database";
      }
    }

    const models = [
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];
    let lastDetail = "Unbekannter Fehler";

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Antworten Sie nur mit OK." }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 8 },
            }),
          }
        );
        const latencyMs = Date.now() - started;
        const body = (await response.json().catch(() => ({}))) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
          error?: { message?: string; status?: string };
        };

        if (!response.ok) {
          lastDetail =
            body.error?.message ||
            body.error?.status ||
            `HTTP ${response.status} (${model})`;
          continue;
        }

        const text =
          body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        await markApiCredentialSuccess("gemini");
        return {
          provider,
          ok: true,
          message: `Gemini aktiv — Antwort in ${latencyMs} ms.`,
          detail: `Quelle=${source} · Modell=${model}${text ? ` · Probe=${text.slice(0, 40)}` : ""}`,
          latencyMs,
        };
      } catch (error) {
        lastDetail = error instanceof Error ? error.message : "Netzwerkfehler";
      }
    }

    await markApiCredentialError("gemini", lastDetail);
    return {
      provider,
      ok: false,
      message: "Gemini antwortet nicht korrekt.",
      detail: lastDetail,
      latencyMs: Date.now() - started,
    };
  }

  return {
    provider,
    ok: false,
    message: "Live-Test für diesen Anbieter ist noch nicht freigeschaltet.",
    detail:
      "Gemini kann hier getestet werden. Suchanbieter (SerpAPI) unter Website → APIs & Integrationen.",
    latencyMs: Date.now() - started,
  };
}
