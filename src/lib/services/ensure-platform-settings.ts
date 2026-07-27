import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;
let lastOkAt = 0;
const TTL_MS = 60_000;

/** Spiegel von DEFAULT_PLATFORM_SETTINGS — kein Import-Zyklus mit admin-platform-service. */
const ENSURE_DEFAULTS = {
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
  digitalLeakDefaultRetentionDays: 90,
} as const;

export function resetPlatformSettingsEnsureForTests(): void {
  ensurePromise = null;
  lastOkAt = 0;
}

export async function ensurePlatformSettingsSchema(
  force = false
): Promise<boolean> {
  if (!force && lastOkAt > 0 && Date.now() - lastOkAt < TTL_MS) {
    return true;
  }
  if (force) ensurePromise = null;

  if (!ensurePromise) {
    ensurePromise = runEnsure()
      .then((ok) => {
        if (ok) lastOkAt = Date.now();
        else ensurePromise = null;
        return ok;
      })
      .catch((error) => {
        ensurePromise = null;
        console.error("[ensurePlatformSettingsSchema] failed", error);
        return false;
      });
  }
  return ensurePromise;
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

/** Roh-JSON aus MariaDB (Objekt, String oder doppelt kodiert) → Plain Object. */
function parseRawSettings(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  // Doppelt kodiert: JSON-String als Wert
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mergeWithDefaults(
  raw: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...raw,
    imageMaxUploadMb: asNumber(
      raw.imageMaxUploadMb,
      ENSURE_DEFAULTS.imageMaxUploadMb
    ),
    imageCompressionQuality: asNumber(
      raw.imageCompressionQuality,
      ENSURE_DEFAULTS.imageCompressionQuality
    ),
    imageWebpQuality: asNumber(
      raw.imageWebpQuality,
      ENSURE_DEFAULTS.imageWebpQuality
    ),
    imageThumbnailQuality: asNumber(
      raw.imageThumbnailQuality,
      ENSURE_DEFAULTS.imageThumbnailQuality
    ),
    imageMaxResolution: asNumber(
      raw.imageMaxResolution,
      ENSURE_DEFAULTS.imageMaxResolution
    ),
    encryptOriginals: asBool(
      raw.encryptOriginals,
      ENSURE_DEFAULTS.encryptOriginals
    ),
    generateAnalysisImages: asBool(
      raw.generateAnalysisImages,
      ENSURE_DEFAULTS.generateAnalysisImages
    ),
    supportHoursStart: asString(
      raw.supportHoursStart,
      ENSURE_DEFAULTS.supportHoursStart
    ),
    supportHoursEnd: asString(
      raw.supportHoursEnd,
      ENSURE_DEFAULTS.supportHoursEnd
    ),
    supportTimezone: asString(
      raw.supportTimezone,
      ENSURE_DEFAULTS.supportTimezone
    ),
    supportResponseText: asString(
      raw.supportResponseText,
      ENSURE_DEFAULTS.supportResponseText
    ),
    digitalLeakDefaultRetentionDays: asNumber(
      raw.digitalLeakDefaultRetentionDays,
      ENSURE_DEFAULTS.digitalLeakDefaultRetentionDays
    ),
  };
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }
  if (Array.isArray(result)) return result as T[];
  return [];
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id INT UNSIGNED NOT NULL DEFAULT 1,
      settings_json JSON NOT NULL,
      updated_by_admin_id BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const defaultPayload = JSON.stringify(ENSURE_DEFAULTS);

  await db.execute(sql`
    INSERT IGNORE INTO platform_settings (id, settings_json)
    VALUES (1, ${defaultPayload})
  `);

  // MariaDB: JSON_SET kann NULL liefern → ER_BAD_NULL_ERROR auf NOT NULL-Spalte.
  // Defaults deshalb in JS mergen und als vollständiges JSON zurückschreiben.
  try {
    const rows = asRows<{ settings_json?: unknown; settingsJson?: unknown }>(
      await db.execute(sql`
        SELECT settings_json
        FROM platform_settings
        WHERE id = 1
        LIMIT 1
      `)
    );
    const rawCell = rows[0]?.settings_json ?? rows[0]?.settingsJson ?? null;
    const merged = mergeWithDefaults(parseRawSettings(rawCell));
    const payload = JSON.stringify(merged);

    await db.execute(sql`
      UPDATE platform_settings
      SET settings_json = ${payload}
      WHERE id = 1
    `);
  } catch (error) {
    console.warn(
      "[ensurePlatformSettingsSchema] JS merge failed, writing defaults",
      error
    );
    await db.execute(sql`
      UPDATE platform_settings
      SET settings_json = ${defaultPayload}
      WHERE id = 1
    `);
  }

  return true;
}
