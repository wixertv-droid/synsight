/**
 * Runtime catalog self-heal for Reverse Image Search (discovery + compare).
 */
import { sql, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { analysisPricing } from "@/lib/database/schema";
import { ensureReverseImageSchema } from "@/lib/analysis/reverse-image/ensure-schema";

let ensurePromise: Promise<boolean> | null = null;
let lastSuccessAt = 0;
const SUCCESS_TTL_MS = 30_000;

export function resetReverseImageCatalogEnsureForTests(): void {
  ensurePromise = null;
  lastSuccessAt = 0;
}

export async function ensureReverseImageCatalog(
  force = false
): Promise<boolean> {
  if (
    !force &&
    lastSuccessAt > 0 &&
    Date.now() - lastSuccessAt < SUCCESS_TTL_MS
  ) {
    return true;
  }

  if (force) ensurePromise = null;

  if (!ensurePromise) {
    ensurePromise = runEnsure()
      .then((ok) => {
        if (ok) lastSuccessAt = Date.now();
        else ensurePromise = null;
        return ok;
      })
      .catch((error) => {
        ensurePromise = null;
        console.error("[ensureReverseImageCatalog] failed", error);
        return false;
      });
  }

  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await ensureReverseImageSchema();

  try {
    await db.execute(sql`
      INSERT INTO analysis_pricing
        (analysis_key, label, description, credits, sort_order,
         is_active, is_system_default, default_label,
         default_description, default_credits)
      VALUES
        (
          'reverse_image_discovery',
          'Reverse Image · Bildsuche',
          'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
          12,
          118,
          1,
          1,
          'Reverse Image · Bildsuche',
          'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
          12
        ),
        (
          'reverse_image_compare',
          'Reverse Image · Gesichtsvergleich',
          'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
          13,
          119,
          1,
          1,
          'Reverse Image · Gesichtsvergleich',
          'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
          13
        )
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        description = VALUES(description),
        sort_order = VALUES(sort_order),
        is_system_default = 1,
        default_label = VALUES(default_label),
        default_description = VALUES(default_description),
        default_credits = VALUES(default_credits),
        is_active = IF(is_active IS NULL, 1, is_active)
    `);

    await db.execute(sql`
      UPDATE analysis_pricing
      SET
        label = 'Reverse Image Search (Legacy)',
        description = 'Veraltet — nutzen Sie Bildsuche + Gesichtsvergleich.',
        is_active = 0
      WHERE analysis_key = 'reverse_image_search'
    `);
  } catch (error) {
    console.error("[ensureReverseImageCatalog] pricing upsert failed", error);
    return false;
  }

  const rows = await db
    .select({ id: analysisPricing.id })
    .from(analysisPricing)
    .where(eq(analysisPricing.analysisKey, "reverse_image_discovery"))
    .limit(1);

  return Boolean(rows[0]);
}
