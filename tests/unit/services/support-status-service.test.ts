import { describe, expect, it } from "vitest";
import { isWithinSupportHours } from "@/lib/services/support-status-service";

describe("support availability", () => {
  it("marks weekday business hours as within support hours", () => {
    const mondayAt10 = new Date("2026-07-20T08:00:00.000Z");
    expect(
      isWithinSupportHours(mondayAt10, "09:00", "18:00", "Europe/Berlin")
    ).toBe(true);
  });

  it("marks outside configured hours as unavailable", () => {
    const mondayAt20 = new Date("2026-07-20T18:00:00.000Z");
    expect(
      isWithinSupportHours(mondayAt20, "09:00", "18:00", "Europe/Berlin")
    ).toBe(false);
  });
});
