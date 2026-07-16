import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("database migrations workflow", () => {
  const dir = path.join(process.cwd(), "database", "migrations");
  const files = readdirSync(dir)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  it("ships ordered 001–005 migration files", () => {
    expect(files).toEqual([
      "001_initial_schema.sql",
      "002_production_identity.sql",
      "003_digital_traces_images.sql",
      "004_admin_role_and_compat.sql",
      "005_identity_profile_fields.sql",
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
    expect(pkg.scripts["db:status"]).toBe("tsx database/status.ts");
    expect(migrate).toContain("_synsight_schema_migrations");
    expect(migrate).toContain("Checksum mismatch");
    expect(migrate).toContain("GET_LOCK");
    expect(migrate).toContain("multipleStatements");
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

  it("adds admin role and compatibility views in 004", () => {
    const sql = readFileSync(
      path.join(dir, "004_admin_role_and_compat.sql"),
      "utf8"
    );
    expect(sql).toContain("`role`");
    expect(sql).toContain("CREATE OR REPLACE VIEW `identity_images`");
    expect(sql).toContain("CREATE OR REPLACE VIEW `analysis_items`");
    expect(sql).toContain("CREATE OR REPLACE VIEW `audit_logs`");
    expect(sql).toContain("`risk_level`");
  });

  it("adds identity profile fields in 005", () => {
    const sql = readFileSync(
      path.join(dir, "005_identity_profile_fields.sql"),
      "utf8"
    );
    expect(sql).toContain("`birth_date`");
    expect(sql).toContain("`gender`");
    expect(sql).toContain("`address_line`");
    expect(sql).toContain("`previous_locations`");
    expect(sql).toContain("`account_status`");
  });
});
