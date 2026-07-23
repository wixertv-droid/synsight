import { describe, expect, it } from "vitest";
import {
  ADMIN_SECTIONS,
  ADMIN_SIDEBAR_LINKS,
  adminPageHref,
  getAdminNavItem,
  getAdminSection,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines four main sections", () => {
    expect(ADMIN_SECTIONS.map((section) => section.id)).toEqual([
      "benutzer",
      "marketing",
      "website",
      "support",
    ]);
  });

  it("exposes five sidebar links (overview + four areas)", () => {
    expect(ADMIN_SIDEBAR_LINKS.map((link) => link.code)).toEqual([
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
    ]);
  });

  it("resolves sub pages", () => {
    const item = getAdminNavItem("marketing", "preise");
    expect(item?.view).toBe("marketing-pricing");
    expect(adminPageHref("benutzer", "uebersicht")).toBe(
      "/admin/benutzer/uebersicht"
    );
  });

  it("maps legacy hash targets to new routes via section items", () => {
    expect(getAdminNavItem("support", "nachrichten")?.view).toBe(
      "support-messages"
    );
    expect(
      getAdminSection("website")?.items.some((i) => i.slug === "api")
    ).toBe(true);
  });
});
