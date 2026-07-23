import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("database migrations workflow", () => {
  const dir = path.join(process.cwd(), "database", "migrations");
  const files = readdirSync(dir)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  it("ships ordered 001–013 migration files", () => {
    expect(files).toEqual([
      "001_initial_schema.sql",
      "002_production_identity.sql",
      "003_digital_traces_images.sql",
      "004_admin_role_and_compat.sql",
      "005_identity_profile_fields.sql",
      "006_production_user_role.sql",
      "007_syncredits.sql",
      "008_admin_control_center.sql",
      "009_pricing_and_image_hardening.sql",
      "010_promotions.sql",
      "011_company_communications.sql",
      "012_mobile_upload_token.sql",
      "013_intelligence_reports.sql",
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

  it("replaces temporary demo roles with production users in 006", () => {
    const sql = readFileSync(
      path.join(dir, "006_production_user_role.sql"),
      "utf8"
    );
    expect(sql).toContain("SET `role` = 'user'");
    expect(sql).toContain("ENUM('admin','user')");
    expect(sql).toContain("DEFAULT 'user'");
  });

  it("adds SynCredits ledger tables in 007", () => {
    const sql = readFileSync(path.join(dir, "007_syncredits.sql"), "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `credit_accounts`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `credit_transactions`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `credit_packages`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `payment_providers`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `invoices`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `usage_logs`");
    expect(sql).toContain("pack_7800");
  });

  it("adds admin transaction audit metadata in 008", () => {
    const sql = readFileSync(
      path.join(dir, "008_admin_control_center.sql"),
      "utf8"
    );
    expect(sql).toContain("`performed_by`");
    expect(sql).toContain("`reason`");
    expect(sql).toContain("`transaction_source`");
    expect(sql).toContain("'admin_credit'");
    expect(sql).toContain("'admin_remove'");
  });

  it("adds DB pricing and image uniqueness in 009", () => {
    const sql = readFileSync(
      path.join(dir, "009_pricing_and_image_hardening.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `analysis_pricing`");
    expect(sql).toContain("'phone_analysis'");
    expect(sql).toContain("'alias_analysis'");
    expect(sql).toContain("`default_price_cents`");
    expect(sql).toContain("profile_images_user_type_unique");
  });

  it("adds promotions tables and welcome bonus seed in 010", () => {
    const sql = readFileSync(path.join(dir, "010_promotions.sql"), "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `promotions`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `promotion_rewards`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `promotion_logs`");
    expect(sql).toContain("'promotion'");
    expect(sql).toContain("Willkommensbonus");
  });

  it("adds company communication tables in 011", () => {
    const sql = readFileSync(
      path.join(dir, "011_company_communications.sql"),
      "utf8"
    );
    expect(sql).toContain(
      "CREATE TABLE IF NOT EXISTS `communication_settings`"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `contact_requests`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `partner_requests`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `press_requests`");
    expect(sql).toContain("contact@synsight.de");
    expect(sql).toContain("press@synsight.de");
    expect(sql).toContain("partners@synsight.de");
  });
});
