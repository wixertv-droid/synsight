import { getDatabase } from "@/lib/database/client";
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  type PlatformSettings,
} from "@/lib/services/admin-platform-service";
import { isStaffOnline } from "@/lib/repositories/mysql/support-repository";

export type SupportAvailabilityTone = "green" | "orange" | "red";

export interface SupportAvailabilityStatus {
  tone: SupportAvailabilityTone;
  label: string;
  detail: string;
  adminOnline: boolean;
  withinHours: boolean;
  hoursStart: string;
  hoursEnd: string;
  timezone: string;
  responseText: string;
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );
  return { weekday, minutes: hour * 60 + minute };
}

export function isWithinSupportHours(
  now: Date,
  start: string,
  end: string,
  timezone: string
): boolean {
  const { weekday, minutes } = getZonedParts(now, timezone);
  if (["Sat", "Sun"].includes(weekday)) return false;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  return minutes >= startMinutes && minutes < endMinutes;
}

export async function getSupportAvailabilityStatus(): Promise<SupportAvailabilityStatus> {
  let settings: Pick<
    PlatformSettings,
    | "supportHoursStart"
    | "supportHoursEnd"
    | "supportTimezone"
    | "supportResponseText"
  > = {
    supportHoursStart: DEFAULT_PLATFORM_SETTINGS.supportHoursStart,
    supportHoursEnd: DEFAULT_PLATFORM_SETTINGS.supportHoursEnd,
    supportTimezone: DEFAULT_PLATFORM_SETTINGS.supportTimezone,
    supportResponseText: DEFAULT_PLATFORM_SETTINGS.supportResponseText,
  };

  try {
    const dbSettings = await getPublicPlatformSettings();
    settings = {
      supportHoursStart: dbSettings.supportHoursStart,
      supportHoursEnd: dbSettings.supportHoursEnd,
      supportTimezone: dbSettings.supportTimezone,
      supportResponseText: dbSettings.supportResponseText,
    };
  } catch {
    // fallback defaults for public pages without auth
  }

  const now = new Date();
  const withinHours = isWithinSupportHours(
    now,
    settings.supportHoursStart,
    settings.supportHoursEnd,
    settings.supportTimezone
  );
  const adminOnline = await isStaffOnline(getDatabase());

  let tone: SupportAvailabilityTone;
  let label: string;
  let detail: string;

  if (!withinHours) {
    tone = "red";
    label = "Außerhalb der Support-Zeiten";
    detail = `Erreichbar ${settings.supportHoursStart}–${settings.supportHoursEnd} Uhr (${settings.supportTimezone}).`;
  } else if (adminOnline) {
    tone = "green";
    label = "Support online";
    detail = "Ein Mitarbeiter ist gerade verfügbar.";
  } else {
    tone = "orange";
    label = "Support-Zeiten aktiv";
    detail = "Wir sind in der Erreichbarkeitszeit — Antwort folgt zeitnah.";
  }

  return {
    tone,
    label,
    detail,
    adminOnline,
    withinHours,
    hoursStart: settings.supportHoursStart,
    hoursEnd: settings.supportHoursEnd,
    timezone: settings.supportTimezone,
    responseText: settings.supportResponseText,
  };
}

export async function getSupportAvailabilityForUser() {
  return getSupportAvailabilityStatus();
}
