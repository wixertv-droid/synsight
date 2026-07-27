import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;
let lastOkAt = 0;
const TTL_MS = 60_000;

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

  await db.execute(sql`
    INSERT IGNORE INTO platform_settings (id, settings_json)
    VALUES (
      1,
      JSON_OBJECT(
        'imageMaxUploadMb', 12,
        'imageCompressionQuality', 82,
        'imageWebpQuality', 80,
        'imageThumbnailQuality', 72,
        'imageMaxResolution', 2048,
        'encryptOriginals', true,
        'generateAnalysisImages', true,
        'supportHoursStart', '09:00',
        'supportHoursEnd', '18:00',
        'supportTimezone', 'Europe/Berlin',
        'supportResponseText', 'In der Regel innerhalb von 1–2 Werktagen',
        'digitalLeakDefaultRetentionDays', 90
      )
    )
  `);

  // Repair double-encoded JSON (column holds a JSON string instead of object).
  // MariaDB: kein CAST(... AS JSON) — JSON ist LONGTEXT, Unquote reicht.
  try {
    await db.execute(sql`
      UPDATE platform_settings
      SET settings_json = JSON_UNQUOTE(settings_json)
      WHERE id = 1
        AND JSON_TYPE(settings_json) = 'STRING'
        AND JSON_VALID(JSON_UNQUOTE(settings_json))
    `);
  } catch (error) {
    console.warn("[ensurePlatformSettingsSchema] JSON repair skipped", error);
  }

  await db.execute(sql`
    UPDATE platform_settings
    SET settings_json = JSON_SET(
      COALESCE(settings_json, JSON_OBJECT()),
      '$.digitalLeakDefaultRetentionDays',
      COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(settings_json, '$.digitalLeakDefaultRetentionDays')) AS SIGNED),
        90
      ),
      '$.generateAnalysisImages',
      COALESCE(JSON_EXTRACT(settings_json, '$.generateAnalysisImages'), true),
      '$.encryptOriginals',
      COALESCE(JSON_EXTRACT(settings_json, '$.encryptOriginals'), true)
    )
    WHERE id = 1
  `);

  return true;
}
