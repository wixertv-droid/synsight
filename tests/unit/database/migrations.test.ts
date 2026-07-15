import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("database migrations workflow", () => {
  const dir = path.join(process.cwd(), "database", "migrations");
  const files = readdirSync(dir)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  it("ships ordered 001–003 migration files", () => {
    expect(files).toEqual([
      "001_initial_schema.sql",
      "002_production_identity.sql",
      "003_digital_traces_images.sql",
    ]);
  });

  it("documents and implements the migrate runner", () => {
    const migrate = readFileSync(
      path.join(process.cwd(), "database", "migrate.ts"),
      "utf8"
    );
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    );
    expect(pkg.scripts["db:migrate"]).toBe("tsx database/migrate.ts");
    expect(migrate).toContain("_synsight_schema_migrations");
    expect(migrate).toContain("001");
  });

  it("adds digital_traces and image pipeline columns in 003", () => {
    const sql = readFileSync(
      path.join(dir, "003_digital_traces_images.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `digital_traces`");
    expect(sql).toContain("`original_path`");
    expect(sql).toContain("`analysis_path`");
    expect(sql).toContain("`thumbnail_path`");
    expect(sql).toContain("`content_hash`");
  });
});
