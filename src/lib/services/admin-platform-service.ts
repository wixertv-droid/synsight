import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials, platformSettings } from "@/lib/database/schema";
import { encryptSecret } from "@/lib/security/secret-vault";
import { eq } from "drizzle-orm";

export const ADMIN_API_PROVIDERS = [
  "gemini",
  "openai",
  "google_custom_search",
  "serpapi",
  "haveibeenpwned",
  "virustotal",
  "hunter_io",
  "opencorporates",
] as const;

export type AdminApiProvider = (typeof ADMIN_API_PROVIDERS)[number];

export const DEFAULT_PLATFORM_SETTINGS = {
  imageMaxUploadMb: 12,
  imageCompressionQuality: 82,
  imageWebpQuality: 80,
  imageThumbnailQuality: 72,
  imageMaxResolution: 2048,
  encryptOriginals: true,
  generateAnalysisImages: true,
} as const;

export type PlatformSettings = {
  imageMaxUploadMb: number;
  imageCompressionQuality: number;
  imageWebpQuality: number;
  imageThumbnailQuality: number;
  imageMaxResolution: number;
  encryptOriginals: boolean;
  generateAnalysisImages: boolean;
};

export interface ApiCredentialSummary {
  provider: AdminApiProvider;
  label: string;
  isActive: boolean;
  configured: boolean;
  engineId: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function normalizeSettings(
  value: Partial<PlatformSettings> | null | undefined
): PlatformSettings {
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...value,
  };
}

export async function getAdminPlatformSettings(
  actor: AuthenticatedUser
): Promise<PlatformSettings> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return { ...DEFAULT_PLATFORM_SETTINGS };

  const rows = await db.select().from(platformSettings).limit(1);
  return normalizeSettings(
    (rows[0]?.settingsJson as Partial<PlatformSettings> | undefined) ?? null
  );
}

export async function updateAdminPlatformSettings(
  actor: AuthenticatedUser,
  input: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  assertAdmin(actor);
  const merged = normalizeSettings({
    ...(await getAdminPlatformSettings(actor)),
    ...input,
  });

  const db = getDatabase();
  if (!db) return merged;

  const adminId = Number(actor.id);

  await db
    .insert(platformSettings)
    .values({
      id: 1,
      settingsJson: merged,
      updatedByAdminId: adminId,
    })
    .onDuplicateKeyUpdate({
      set: {
        settingsJson: merged,
        updatedByAdminId: adminId,
      },
    });

  return merged;
}

function readEngineId(configJson: unknown): string | null {
  if (!configJson || typeof configJson !== "object") return null;
  const value = (configJson as { engineId?: unknown }).engineId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function listAdminApiCredentials(
  actor: AuthenticatedUser
): Promise<ApiCredentialSummary[]> {
  assertAdmin(actor);
  const db = getDatabase();
  const rows = db ? await db.select().from(apiCredentials) : [];

  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return ADMIN_API_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (!row) {
      return {
        provider,
        label: provider.replace(/_/g, " "),
        isActive: false,
        configured: false,
        engineId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
      };
    }

    return {
      provider,
      label: row.label,
      isActive: row.isActive,
      configured: true,
      engineId: readEngineId(row.configJson),
      lastSuccessAt: row.lastSuccessAt,
      lastErrorAt: row.lastErrorAt,
    };
  });
}

export async function upsertAdminApiCredential(
  actor: AuthenticatedUser,
  input: {
    provider: AdminApiProvider;
    label: string;
    secret?: string | null;
    engineId?: string | null;
    isActive: boolean;
  }
): Promise<ApiCredentialSummary> {
  assertAdmin(actor);
  const db = getDatabase();
  const adminId = Number(actor.id);

  const existing = db
    ? await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, input.provider))
        .limit(1)
    : [];
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
      : readEngineId(current?.configJson);

  const configJson =
    input.provider === "google_custom_search"
      ? { engineId }
      : (current?.configJson ?? null);

  if (db) {
    await db
      .insert(apiCredentials)
      .values({
        provider: input.provider,
        label: input.label,
        encryptedSecret,
        configJson,
        isActive: input.isActive,
        updatedByAdminId: adminId,
      })
      .onDuplicateKeyUpdate({
        set: {
          label: input.label,
          encryptedSecret,
          configJson,
          isActive: input.isActive,
          updatedByAdminId: adminId,
        },
      });
  }

  return {
    provider: input.provider,
    label: input.label,
    isActive: input.isActive,
    configured: true,
    engineId,
    lastSuccessAt: null,
    lastErrorAt: null,
  };
}

export async function setAdminApiCredentialActive(
  actor: AuthenticatedUser,
  provider: AdminApiProvider,
  isActive: boolean
): Promise<ApiCredentialSummary | null> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return null;

  const rows = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.provider, provider))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const adminId = Number(actor.id);

  await db
    .update(apiCredentials)
    .set({ isActive, updatedByAdminId: adminId })
    .where(eq(apiCredentials.provider, provider));

  return {
    provider,
    label: row.label,
    isActive,
    configured: true,
    engineId: readEngineId(row.configJson),
    lastSuccessAt: row.lastSuccessAt,
    lastErrorAt: row.lastErrorAt,
  };
}
