import type { AuthenticatedUser } from "@/lib/auth/types";
import { isStaffRole } from "@/lib/admin/permissions";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials, platformSettings } from "@/lib/database/schema";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-vault";
import { ensurePlatformSettingsSchema } from "@/lib/services/ensure-platform-settings";
import { eq, sql } from "drizzle-orm";

export const ADMIN_API_PROVIDERS = [
  "gemini",
  "openai",
  "dehashed",
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
  supportHoursStart: "09:00",
  supportHoursEnd: "18:00",
  supportTimezone: "Europe/Berlin",
  supportResponseText: "In der Regel innerhalb von 1–2 Werktagen",
  /** Default Digital Leak result retention (-1 immediate, 0 keep, else days). */
  digitalLeakDefaultRetentionDays: 90,
} as const;

export type PlatformSettings = {
  imageMaxUploadMb: number;
  imageCompressionQuality: number;
  imageWebpQuality: number;
  imageThumbnailQuality: number;
  imageMaxResolution: number;
  encryptOriginals: boolean;
  generateAnalysisImages: boolean;
  supportHoursStart: string;
  supportHoursEnd: string;
  supportTimezone: string;
  supportResponseText: string;
  digitalLeakDefaultRetentionDays: number;
};

export interface ApiCredentialSummary {
  provider: AdminApiProvider;
  label: string;
  isActive: boolean;
  configured: boolean;
  engineId: string | null;
  /** DeHashed account email (Admin-Referenz), stored in config_json */
  accountEmail: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  decryptOk: boolean | null;
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function assertStaff(actor: AuthenticatedUser): void {
  if (!isStaffRole(actor.role)) throw new Error("STAFF_FORBIDDEN");
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function parseSettingsJson(raw: unknown): Partial<PlatformSettings> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Partial<PlatformSettings>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Partial<PlatformSettings>;
  }
  return null;
}

function normalizeSettings(
  value: Partial<PlatformSettings> | null | undefined
): PlatformSettings {
  const raw = value ?? {};
  return {
    imageMaxUploadMb: asNumber(
      raw.imageMaxUploadMb,
      DEFAULT_PLATFORM_SETTINGS.imageMaxUploadMb
    ),
    imageCompressionQuality: asNumber(
      raw.imageCompressionQuality,
      DEFAULT_PLATFORM_SETTINGS.imageCompressionQuality
    ),
    imageWebpQuality: asNumber(
      raw.imageWebpQuality,
      DEFAULT_PLATFORM_SETTINGS.imageWebpQuality
    ),
    imageThumbnailQuality: asNumber(
      raw.imageThumbnailQuality,
      DEFAULT_PLATFORM_SETTINGS.imageThumbnailQuality
    ),
    imageMaxResolution: asNumber(
      raw.imageMaxResolution,
      DEFAULT_PLATFORM_SETTINGS.imageMaxResolution
    ),
    encryptOriginals: asBool(
      raw.encryptOriginals,
      DEFAULT_PLATFORM_SETTINGS.encryptOriginals
    ),
    generateAnalysisImages: asBool(
      raw.generateAnalysisImages,
      DEFAULT_PLATFORM_SETTINGS.generateAnalysisImages
    ),
    supportHoursStart: asString(
      raw.supportHoursStart,
      DEFAULT_PLATFORM_SETTINGS.supportHoursStart
    ),
    supportHoursEnd: asString(
      raw.supportHoursEnd,
      DEFAULT_PLATFORM_SETTINGS.supportHoursEnd
    ),
    supportTimezone: asString(
      raw.supportTimezone,
      DEFAULT_PLATFORM_SETTINGS.supportTimezone
    ),
    supportResponseText: asString(
      raw.supportResponseText,
      DEFAULT_PLATFORM_SETTINGS.supportResponseText
    ),
    digitalLeakDefaultRetentionDays: asNumber(
      raw.digitalLeakDefaultRetentionDays,
      DEFAULT_PLATFORM_SETTINGS.digitalLeakDefaultRetentionDays
    ),
  };
}

export async function getPublicPlatformSettings(): Promise<PlatformSettings> {
  await ensurePlatformSettingsSchema();
  const db = getDatabase();
  if (!db) return { ...DEFAULT_PLATFORM_SETTINGS };

  try {
    const rows = await db.select().from(platformSettings).limit(1);
    return normalizeSettings(parseSettingsJson(rows[0]?.settingsJson));
  } catch (error) {
    console.error("[getPublicPlatformSettings] failed", error);
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export async function getAdminPlatformSettings(
  actor: AuthenticatedUser
): Promise<PlatformSettings> {
  assertAdmin(actor);
  return getPublicPlatformSettings();
}

async function persistPlatformSettings(
  actor: AuthenticatedUser,
  input: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const merged = normalizeSettings({
    ...(await getPublicPlatformSettings()),
    ...input,
  });

  const db = getDatabase();
  if (!db) return merged;

  const ensured = await ensurePlatformSettingsSchema(true);
  if (!ensured) {
    throw new Error(
      "platform_settings konnte nicht initialisiert werden — bitte db:migrate ausführen."
    );
  }

  const actorId = Number(actor.id);
  const adminId = Number.isFinite(actorId) ? actorId : null;
  const payload = JSON.stringify(merged);

  await db.execute(sql`
    INSERT INTO platform_settings (id, settings_json, updated_by_admin_id)
    VALUES (1, CAST(${payload} AS JSON), ${adminId})
    ON DUPLICATE KEY UPDATE
      settings_json = CAST(${payload} AS JSON),
      updated_by_admin_id = ${adminId}
  `);

  return merged;
}

export async function updateAdminPlatformSettings(
  actor: AuthenticatedUser,
  input: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  assertAdmin(actor);
  return persistPlatformSettings(actor, input);
}

export async function getSupportHoursSettings(actor: AuthenticatedUser) {
  assertStaff(actor);
  const settings = await getPublicPlatformSettings();
  return {
    supportHoursStart: settings.supportHoursStart,
    supportHoursEnd: settings.supportHoursEnd,
    supportTimezone: settings.supportTimezone,
    supportResponseText: settings.supportResponseText,
  };
}

export async function updateSupportHoursSettings(
  actor: AuthenticatedUser,
  input: {
    supportHoursStart: string;
    supportHoursEnd: string;
    supportTimezone: string;
    supportResponseText: string;
  }
) {
  assertStaff(actor);
  const settings = await persistPlatformSettings(actor, input);
  return {
    supportHoursStart: settings.supportHoursStart,
    supportHoursEnd: settings.supportHoursEnd,
    supportTimezone: settings.supportTimezone,
    supportResponseText: settings.supportResponseText,
  };
}

function readEngineId(configJson: unknown): string | null {
  let value: unknown = configJson;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as { engineId?: unknown; cx?: unknown };
  const engine = row.engineId ?? row.cx;
  return typeof engine === "string" && engine.trim() ? engine.trim() : null;
}

function readAccountEmail(configJson: unknown): string | null {
  let value: unknown = configJson;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const email = (value as { email?: unknown }).email;
  return typeof email === "string" && email.includes("@") ? email.trim() : null;
}

function asConfigObject(configJson: unknown): Record<string, unknown> {
  if (!configJson) return {};
  if (typeof configJson === "string") {
    try {
      const parsed = JSON.parse(configJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof configJson === "object" && !Array.isArray(configJson)) {
    return { ...(configJson as Record<string, unknown>) };
  }
  return {};
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
        label:
          provider === "dehashed"
            ? "DeHashed.com"
            : provider.replace(/_/g, " "),
        isActive: false,
        configured: false,
        engineId: null,
        accountEmail: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        decryptOk: null,
      };
    }

    let decryptOk: boolean | null = null;
    try {
      decryptSecret(row.encryptedSecret);
      decryptOk = true;
    } catch {
      decryptOk = false;
    }

    return {
      provider,
      label: row.label,
      isActive: row.isActive,
      configured: true,
      engineId: readEngineId(row.configJson),
      accountEmail: readAccountEmail(row.configJson),
      lastSuccessAt: row.lastSuccessAt,
      lastErrorAt: row.lastErrorAt,
      lastErrorMessage: row.lastErrorMessage,
      decryptOk,
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
    accountEmail?: string | null;
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

  // Leere cx-Felder dürfen eine vorhandene Engine-ID nicht überschreiben.
  const incomingEngineId = input.engineId?.trim() || "";
  const engineId =
    incomingEngineId || readEngineId(current?.configJson) || null;

  const incomingEmail = input.accountEmail?.trim() || "";
  const accountEmail =
    incomingEmail || readAccountEmail(current?.configJson) || null;

  if (input.provider === "dehashed" && !accountEmail) {
    throw new Error("ACCOUNT_EMAIL_REQUIRED");
  }

  const configJson: Record<string, unknown> = {
    ...asConfigObject(current?.configJson),
  };
  if (engineId) configJson.engineId = engineId;
  if (accountEmail) configJson.email = accountEmail;

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
    accountEmail,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    decryptOk: true,
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
    accountEmail: readAccountEmail(row.configJson),
    lastSuccessAt: row.lastSuccessAt,
    lastErrorAt: row.lastErrorAt,
    lastErrorMessage: row.lastErrorMessage,
    decryptOk: true,
  };
}
