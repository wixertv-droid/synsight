import { getDatabase } from "@/lib/database/client";
import { isStaffOnline } from "@/lib/repositories/mysql/support-presence";
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  type PlatformSettings,
} from "@/lib/services/admin-platform-service";

export type SupportAvailabilityTone = "green" | "red";

export interface SupportAvailabilityStatus {
  tone: SupportAvailabilityTone;
  label: string;
  detail: string;
  /** Public reference page for the current state */
  href: string;
  hrefLabel: string;
  staffOnline: boolean;
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
    // Public page must never fail hard if platform_settings is unavailable.
  }

  const now = new Date();
  const withinHours = isWithinSupportHours(
    now,
    settings.supportHoursStart,
    settings.supportHoursEnd,
    settings.supportTimezone
  );
  const staffOnline = await isStaffOnline(getDatabase());

  let tone: SupportAvailabilityTone;
  let label: string;
  let detail: string;
  let href: string;
  let hrefLabel: string;

  if (staffOnline) {
    tone = "green";
    label = "Support anwesend";
    detail =
      "Ein Mitarbeiter mit Support- oder Admin-Rechten ist gerade online.";
    href = "/support-richtlinien#anwesend";
    hrefLabel = "Was bedeutet „Support anwesend“?";
  } else if (withinHours) {
    tone = "green";
    label = "Support-Zeiten aktiv";
    detail = `Innerhalb der Support-Zeiten (${settings.supportHoursStart}–${settings.supportHoursEnd} Uhr, ${settings.supportTimezone}). ${settings.supportResponseText}.`;
    href = "/support-richtlinien#erreichbarkeit";
    hrefLabel = "Support-Zeiten & Reaktionszeiten";
  } else {
    tone = "red";
    label = "Außerhalb der Support-Zeiten";
    detail = `Aktuell ist kein Support online. Erreichbar Mo–Fr ${settings.supportHoursStart}–${settings.supportHoursEnd} Uhr (${settings.supportTimezone}). Tickets können trotzdem gesendet werden.`;
    href = "/support-richtlinien#zeiten";
    hrefLabel = "Außerhalb der Zeiten";
  }

  return {
    tone,
    label,
    detail,
    href,
    hrefLabel,
    staffOnline,
    withinHours,
    hoursStart: settings.supportHoursStart,
    hoursEnd: settings.supportHoursEnd,
    timezone: settings.supportTimezone,
    responseText: settings.supportResponseText,
  };
}
