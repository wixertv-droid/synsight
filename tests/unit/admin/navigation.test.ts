import { describe, expect, it } from "vitest";
import {
  ADMIN_SECTIONS,
  ADMIN_SIDEBAR_LINKS,
  adminPageHref,
  getAdminNavItem,
  getAdminSection,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines six main sections including seo", () => {
    expect(ADMIN_SECTIONS.map((section) => section.id)).toEqual([
      "benutzer",
      "marketing",
      "website",
      "finanzen",
      "support",
      "seo",
    ]);
  });

  it("exposes seven sidebar links (overview + six areas)", () => {
    expect(ADMIN_SIDEBAR_LINKS.map((link) => link.code)).toEqual([
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
    ]);
  });

  it("resolves finance sub pages", () => {
    expect(getAdminNavItem("finanzen", "uebersicht")?.view).toBe(
      "finance-overview"
    );
    expect(getAdminNavItem("finanzen", "zahlungsanbieter")?.view).toBe(
      "finance-providers"
    );
    expect(getAdminNavItem("finanzen", "api-kosten")?.view).toBe(
      "finance-api-costs"
    );
    expect(adminPageHref("finanzen", "uebersicht")).toBe(
      "/admin/finanzen/uebersicht"
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

  it("exposes KI-Server monitor under website", () => {
    expect(getAdminNavItem("website", "ki-server")?.view).toBe(
      "website-ki-server"
    );
    expect(adminPageHref("website", "ki-server")).toBe(
      "/admin/website/ki-server"
    );
  });

  it("exposes SEO knowledge CMS under seo", () => {
    expect(getAdminNavItem("seo", "uebersicht")?.view).toBe(
      "seo-knowledge-list"
    );
    expect(getAdminNavItem("seo", "papierkorb")?.view).toBe(
      "seo-knowledge-trash"
    );
    expect(adminPageHref("seo", "uebersicht")).toBe("/admin/seo/uebersicht");
  });
});
