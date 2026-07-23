import { eq } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

export const API_PROVIDERS = ["google_custom_search", "gemini"] as const;

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

export interface GoogleSearchCredentials {
  apiKey: string;
  engineId: string;
  source: "database" | "env";
}

export interface GeminiCredentials {
  apiKey: string;
  source: "database" | "env";
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function providerLabel(provider: ApiProvider): string {
  if (provider === "google_custom_search") {
    return "Google Custom Search";
  }
  return "Google Gemini";
}

function readConfigEngineId(configJson: unknown): string | null {
  if (!configJson || typeof configJson !== "object") return null;
  const value = (configJson as { engineId?: unknown }).engineId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

  const engineId =
    input.engineId !== undefined
      ? input.engineId?.trim() || null
      : readConfigEngineId(current?.configJson);

  const configJson =
    input.provider === "google_custom_search"
      ? { engineId }
      : (current?.configJson ?? null);

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

/** Runtime resolver — DB first, then env. Used by Google Search. */
export async function resolveGoogleSearchCredentials(): Promise<GoogleSearchCredentials | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, "google_custom_search"))
        .limit(1);
      const row = rows[0];
      if (row?.isActive) {
        const apiKey = decryptSecret(row.encryptedSecret).trim();
        const engineId = readConfigEngineId(row.configJson);
        if (apiKey && engineId) {
          return { apiKey, engineId, source: "database" };
        }
      }
    } catch (error) {
      console.error("[api-credentials] google resolve failed", error);
    }
  }

  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();
  if (apiKey && engineId) {
    return { apiKey, engineId, source: "env" };
  }
  return null;
}

/** Runtime resolver — DB first, then env. Used by Gemini summary. */
export async function resolveGeminiCredentials(): Promise<GeminiCredentials | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, "gemini"))
        .limit(1);
      const row = rows[0];
      if (row?.isActive) {
        const apiKey = decryptSecret(row.encryptedSecret).trim();
        if (apiKey) return { apiKey, source: "database" };
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
