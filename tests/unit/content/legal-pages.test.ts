import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const legalRoutes = [
  "impressum",
  "datenschutz",
  "agb",
  "cookies",
  "nutzungsbedingungen",
  "security",
];

describe("Sprint 7 legal compliance pages", () => {
  it("ships all required legal route pages", () => {
    for (const route of legalRoutes) {
      const file = path.join(root, "src/app", route, "page.tsx");
      expect(existsSync(file), `missing ${route}`).toBe(true);
      const source = readFileSync(file, "utf8");
      expect(source).toContain("LegalDocument");
      expect(source).toMatch(/updatedAt/);
    }
  });

  it("links all legal pages from the Footer", () => {
    const footer = readFileSync(
      path.join(root, "src/components/layout/Footer.tsx"),
      "utf8"
    );
    for (const route of legalRoutes) {
      expect(footer).toContain(`href: "/${route}"`);
    }
    expect(footer).toContain('href: "/contact"');
    expect(footer).toContain('href: "/login"');
    expect(footer).toContain('href: "/register"');
    expect(footer).toContain("mailto:datenschutz@synsight.de");
    expect(footer).toContain("mailto:contact@synsight.de");
  });

  it("uses real operator data in the Impressum", () => {
    const impressum = readFileSync(
      path.join(root, "src/app/impressum/page.tsx"),
      "utf8"
    );
    expect(impressum).toContain("René Eule");
    expect(impressum).toContain("Katharinenstraße 4");
    expect(impressum).toContain("07546 Gera");
    expect(impressum).toContain("contact@synsight.de");
    expect(impressum).toContain("§ 19 UStG");
    expect(impressum).not.toMatch(/lorem ipsum/i);
    expect(impressum).not.toMatch(/Platzhalter/i);
  });

  it("documents SynCredits and no-subscription billing in the AGB", () => {
    const agb = readFileSync(path.join(root, "src/app/agb/page.tsx"), "utf8");
    expect(agb).toContain("SynCredits");
    expect(agb).toMatch(/[Aa]bonnements/);
    expect(agb).toContain("18");
    expect(agb).toContain("Deutschland");
  });

  it("states necessary-only cookies and future categories", () => {
    const cookies = readFileSync(
      path.join(root, "src/app/cookies/page.tsx"),
      "utf8"
    );
    expect(cookies).toContain("technisch notwendige");
    expect(cookies).toContain("Marketing-Cookies");
    expect(cookies).toContain("Analyse-Cookies");
  });

  it("describes Argon2id and Germany hosting on the security page", () => {
    const security = readFileSync(
      path.join(root, "src/app/security/page.tsx"),
      "utf8"
    );
    expect(security).toContain("Argon2id");
    expect(security).toContain("Nürnberg");
    expect(security).toContain("MariaDB");
    expect(security).toContain("Responsible Disclosure");
    expect(security).toContain("2FA");
  });
});
