/**
 * Ordered SQL migrator for SynSight.
 *
 * Applies `database/migrations/*.sql` files alphabetically and records
 * them in `_synsight_schema_migrations`. This is the supported workflow
 * for the hand-authored MySQL 8 reference migrations (001–003).
 *
 * Usage:
 *   DATABASE_URL=mysql://... npm run db:migrate
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.join(process.cwd(), "database", "migrations");

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required to run migrations. Example: mysql://user:pass@localhost:3306/synsight"
    );
  }
  return url;
}

async function ensureMigrationsTable(connection: mysql.Connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`_synsight_schema_migrations\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(255) NOT NULL,
      \`checksum\` CHAR(64) NOT NULL,
      \`applied_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`_synsight_schema_migrations_name_unique\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

async function alreadyApplied(
  connection: mysql.Connection,
  name: string
): Promise<boolean> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT 1 AS ok FROM `_synsight_schema_migrations` WHERE `name` = ? LIMIT 1",
    [name]
  );
  return rows.length > 0;
}

async function applyMigration(
  connection: mysql.Connection,
  name: string,
  sql: string,
  checksum: string
) {
  // Split on semicolons but keep DELIMITER-free MySQL statements.
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);

  await connection.beginTransaction();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    await connection.query(
      "INSERT INTO `_synsight_schema_migrations` (`name`, `checksum`) VALUES (?, ?)",
      [name, checksum]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await ensureMigrationsTable(connection);
    const files = await listMigrationFiles();
    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let applied = 0;
    for (const name of files) {
      if (await alreadyApplied(connection, name)) {
        console.log(`skip  ${name}`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      console.log(`apply ${name}`);
      await applyMigration(connection, name, sql, checksum);
      applied += 1;
    }

    console.log(
      applied === 0
        ? "Migrations up to date."
        : `Applied ${applied} migration(s) successfully.`
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
