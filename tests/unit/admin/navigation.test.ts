import { describe, expect, it } from "vitest";
import {
  ADMIN_SECTIONS,
  ADMIN_SIDEBAR_LINKS,
  adminPageHref,
  getAdminNavItem,
  getAdminSection,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines seven clearly separated admin sections", () => {
    expect(ADMIN_SECTIONS.map((section) => section.id)).toEqual([
      "benutzer",
      "analysen",
      "website",
      "integrationen",
      "geschaeft",
      "support",
      "system",
    ]);
  });

  it("exposes eight sidebar links (overview + seven areas)", () => {
    expect(ADMIN_SIDEBAR_LINKS.map((link) => link.code)).toEqual([
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
    ]);
  });

  it("resolves finance sub pages", () => {
    expect(getAdminNavItem("geschaeft", "uebersicht")?.view).toBe(
      "finance-overview"
    );
    expect(getAdminNavItem("geschaeft", "zahlungsanbieter")?.view).toBe(
      "finance-providers"
    );
    expect(getAdminNavItem("geschaeft", "api-kosten")?.view).toBe(
      "finance-api-costs"
    );
    expect(adminPageHref("geschaeft", "uebersicht")).toBe(
      "/admin/geschaeft/uebersicht"
    );
  });

  it("maps legacy hash targets to new routes via section items", () => {
    expect(getAdminNavItem("support", "nachrichten")?.view).toBe(
      "support-messages"
    );
    expect(
      getAdminSection("integrationen")?.items.some((i) => i.slug === "api")
    ).toBe(true);
  });

  it("exposes KI-Server monitor under system", () => {
    expect(getAdminNavItem("system", "ki-server")?.view).toBe(
      "website-ki-server"
    );
    expect(adminPageHref("website", "ki-server")).toBe(
      "/admin/website/ki-server"
    );
  });

  it("exposes SEO knowledge CMS under website", () => {
    expect(getAdminNavItem("website", "wissen")?.view).toBe(
      "seo-knowledge-list"
    );
    expect(getAdminNavItem("website", "papierkorb")?.view).toBe(
      "seo-knowledge-trash"
    );
    expect(adminPageHref("website", "wissen")).toBe("/admin/website/wissen");
  });
});
