/**
 * How long a Google Intelligence report stays available after generation.
 * Stored with the report; expired reports are treated as missing.
 */

export const REPORT_RETENTION_PRESETS = [
  { days: 1, label: "1 Tag", description: "Kurz speichern" },
  { days: 7, label: "7 Tage", description: "Eine Woche" },
  { days: 30, label: "30 Tage", description: "Ein Monat (Standard)" },
  { days: 90, label: "90 Tage", description: "Ein Quartal" },
  {
    days: 0,
    label: "Unbegrenzt",
    description: "Bis zur nächsten Analyse oder manuellen Löschung",
  },
] as const;

export type ReportRetentionDays =
  (typeof REPORT_RETENTION_PRESETS)[number]["days"];

export const DEFAULT_REPORT_RETENTION_DAYS: ReportRetentionDays = 30;

export const REPORT_RETENTION_STORAGE_KEY = "synsight.reportRetentionDays";

export function isValidRetentionDays(
  value: unknown
): value is ReportRetentionDays {
  return (
    typeof value === "number" &&
    REPORT_RETENTION_PRESETS.some((preset) => preset.days === value)
  );
}

export function parseRetentionDays(
  value: unknown,
  fallback: ReportRetentionDays = DEFAULT_REPORT_RETENTION_DAYS
): ReportRetentionDays {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  return isValidRetentionDays(numeric) ? numeric : fallback;
}

export function computeExpiresAt(
  generatedAtIso: string,
  retentionDays: ReportRetentionDays
): string | null {
  if (retentionDays === 0) return null;
  const generated = new Date(generatedAtIso);
  if (Number.isNaN(generated.getTime())) return null;
  const expires = new Date(generated.getTime() + retentionDays * 86_400_000);
  return expires.toISOString();
}

export function isReportExpired(input: {
  expiresAt?: string | null;
  generatedAt?: string;
  retentionDays?: number | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.expiresAt) {
    const expires = new Date(input.expiresAt);
    if (!Number.isNaN(expires.getTime())) {
      return expires.getTime() <= now.getTime();
    }
  }
  if (
    typeof input.retentionDays === "number" &&
    input.retentionDays > 0 &&
    input.generatedAt
  ) {
    const expiresAt = computeExpiresAt(
      input.generatedAt,
      input.retentionDays as ReportRetentionDays
    );
    if (expiresAt) {
      return new Date(expiresAt).getTime() <= now.getTime();
    }
  }
  return false;
}

export function retentionLabel(days: ReportRetentionDays): string {
  return (
    REPORT_RETENTION_PRESETS.find((preset) => preset.days === days)?.label ??
    `${days} Tage`
  );
}
