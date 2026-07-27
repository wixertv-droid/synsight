import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { reverseImageModuleSettings } from "@/lib/database/schema";
import { ensureReverseImageSchema } from "@/lib/analysis/reverse-image/ensure-schema";
import {
  DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS,
  type ReverseImageModuleSettings,
} from "@/lib/analysis/reverse-image/settings-types";

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampThreshold(value: number): number {
  return Math.max(0.35, Math.min(0.95, value));
}

function mapRow(
  row: typeof reverseImageModuleSettings.$inferSelect | undefined
): ReverseImageModuleSettings {
  if (!row) return { ...DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS };
  return {
    isActive: Boolean(row.isActive),
    apiEnabled: Boolean(row.apiEnabled),
    compareUrl:
      row.compareUrl?.trim() ||
      DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS.compareUrl,
    similarityThreshold: clampThreshold(
      toNumber(
        row.similarityThreshold,
        DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS.similarityThreshold
      )
    ),
    compareTimeoutMs: Math.min(
      60_000,
      Math.max(3000, toNumber(row.compareTimeoutMs, 12_000))
    ),
  };
}

export async function getReverseImageModuleSettings(): Promise<ReverseImageModuleSettings> {
  await ensureReverseImageSchema();
  const db = getDatabase();
  if (!db) return { ...DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS };

  try {
    const rows = await db
      .select()
      .from(reverseImageModuleSettings)
      .where(eq(reverseImageModuleSettings.id, 1))
      .limit(1);
    return mapRow(rows[0]);
  } catch (error) {
    console.error("[reverse-image-settings] read failed", error);
    return { ...DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS };
  }
}

export async function updateReverseImageModuleSettings(
  patch: Partial<ReverseImageModuleSettings>,
  adminId?: number | null
): Promise<ReverseImageModuleSettings> {
  await ensureReverseImageSchema();
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const current = await getReverseImageModuleSettings();
  const next: ReverseImageModuleSettings = {
    ...current,
    ...patch,
    compareUrl: (patch.compareUrl ?? current.compareUrl).trim(),
    similarityThreshold: clampThreshold(
      toNumber(
        patch.similarityThreshold ?? current.similarityThreshold,
        current.similarityThreshold
      )
    ),
    compareTimeoutMs: Math.min(
      60_000,
      Math.max(
        3000,
        toNumber(patch.compareTimeoutMs ?? current.compareTimeoutMs, 12_000)
      )
    ),
  };

  await db
    .insert(reverseImageModuleSettings)
    .values({
      id: 1,
      isActive: next.isActive,
      apiEnabled: next.apiEnabled,
      compareUrl: next.compareUrl,
      similarityThreshold: String(next.similarityThreshold),
      compareTimeoutMs: next.compareTimeoutMs,
      updatedByAdminId: adminId ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        isActive: next.isActive,
        apiEnabled: next.apiEnabled,
        compareUrl: next.compareUrl,
        similarityThreshold: String(next.similarityThreshold),
        compareTimeoutMs: next.compareTimeoutMs,
        updatedByAdminId: adminId ?? null,
      },
    });

  return next;
}
