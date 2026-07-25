import { describe, expect, it, vi, beforeEach } from "vitest";
import { isWithinSupportHours } from "@/lib/services/support-status-service";

describe("isWithinSupportHours", () => {
  it("is true on a weekday inside the window (Europe/Berlin)", () => {
    // Wednesday 2026-07-22 10:00 UTC = 12:00 Berlin (CEST)
    const now = new Date("2026-07-22T10:00:00.000Z");
    expect(isWithinSupportHours(now, "09:00", "18:00", "Europe/Berlin")).toBe(
      true
    );
  });

  it("is false outside the window", () => {
    // Wednesday 2026-07-22 20:00 UTC = 22:00 Berlin
    const now = new Date("2026-07-22T20:00:00.000Z");
    expect(isWithinSupportHours(now, "09:00", "18:00", "Europe/Berlin")).toBe(
      false
    );
  });

  it("is false on weekends", () => {
    // Saturday 2026-07-25 10:00 UTC = 12:00 Berlin
    const now = new Date("2026-07-25T10:00:00.000Z");
    expect(isWithinSupportHours(now, "09:00", "18:00", "Europe/Berlin")).toBe(
      false
    );
  });
});

describe("getSupportAvailabilityStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("is green with staff online even outside hours", async () => {
    vi.doMock("@/lib/repositories/mysql/support-presence", () => ({
      isStaffOnline: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/services/admin-platform-service", () => ({
      DEFAULT_PLATFORM_SETTINGS: {
        supportHoursStart: "09:00",
        supportHoursEnd: "18:00",
        supportTimezone: "Europe/Berlin",
        supportResponseText: "1–2 Werktage",
      },
      getPublicPlatformSettings: vi.fn().mockResolvedValue({
        supportHoursStart: "09:00",
        supportHoursEnd: "18:00",
        supportTimezone: "Europe/Berlin",
        supportResponseText: "1–2 Werktage",
      }),
    }));
    vi.doMock("@/lib/database/client", () => ({
      getDatabase: vi.fn().mockReturnValue(null),
    }));

    const { getSupportAvailabilityStatus } =
      await import("@/lib/services/support-status-service");
    const status = await getSupportAvailabilityStatus();
    expect(status.tone).toBe("green");
    expect(status.label).toBe("Support anwesend");
    expect(status.href).toContain("#anwesend");
  });

  it("is red when no staff and outside hours", async () => {
    vi.doMock("@/lib/repositories/mysql/support-presence", () => ({
      isStaffOnline: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock("@/lib/services/admin-platform-service", () => ({
      DEFAULT_PLATFORM_SETTINGS: {
        supportHoursStart: "09:00",
        supportHoursEnd: "18:00",
        supportTimezone: "Europe/Berlin",
        supportResponseText: "1–2 Werktage",
      },
      getPublicPlatformSettings: vi.fn().mockResolvedValue({
        supportHoursStart: "09:00",
        supportHoursEnd: "18:00",
        supportTimezone: "Europe/Berlin",
        supportResponseText: "1–2 Werktage",
      }),
    }));
    vi.doMock("@/lib/database/client", () => ({
      getDatabase: vi.fn().mockReturnValue(null),
    }));

    // Force weekend so withinHours is false regardless of clock
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T10:00:00.000Z"));

    const { getSupportAvailabilityStatus } =
      await import("@/lib/services/support-status-service");
    const status = await getSupportAvailabilityStatus();
    expect(status.tone).toBe("red");
    expect(status.href).toContain("#zeiten");
    vi.useRealTimers();
  });
});
