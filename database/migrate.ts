/**
 * Ordered SQL migrator for SynSight.
 *
 * Applies `database/migrations/*.sql` files alphabetically and records
 * them in `_synsight_schema_migrations`. Re-runs verify checksums and
 * skip already-applied files. DDL statements are applied one-by-one
 * (MySQL auto-commits DDL; wrapping them in a transaction is unreliable).
 *
 * Usage:
 *   DATABASE_URL=mysql://... npm run db:migrate
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.join(process.cwd(), "database", "migrations");
const LOCK_NAME = "synsight_schema_migrate";

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

async function getAppliedChecksum(
  connection: mysql.Connection,
  name: string
): Promise<string | null> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT `checksum` FROM `_synsight_schema_migrations` WHERE `name` = ? LIMIT 1",
    [name]
  );
  return rows[0]?.checksum ? String(rows[0].checksum) : null;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

async function applyMigration(
  connection: mysql.Connection,
  name: string,
  sql: string,
  checksum: string
) {
  const statements = splitStatements(sql);
  for (const statement of statements) {
    await connection.query(statement);
  }
  await connection.query(
    "INSERT INTO `_synsight_schema_migrations` (`name`, `checksum`) VALUES (?, ?)",
    [name, checksum]
  );
}

async function acquireLock(connection: mysql.Connection): Promise<void> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT GET_LOCK(?, 60) AS locked",
    [LOCK_NAME]
  );
  if (!rows[0] || Number(rows[0].locked) !== 1) {
    throw new Error("Could not acquire migration lock.");
  }
}

async function releaseLock(connection: mysql.Connection): Promise<void> {
  await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await ensureMigrationsTable(connection);
    await acquireLock(connection);

    const files = await listMigrationFiles();
    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let applied = 0;
    for (const name of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await getAppliedChecksum(connection, name);

      if (existing) {
        if (existing !== checksum) {
          throw new Error(
            `Checksum mismatch for ${name}. Refusing to continue. ` +
              `Applied=${existing} Current=${checksum}`
          );
        }
        console.log(`skip  ${name} (checksum ok)`);
        continue;
      }

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
    try {
      await releaseLock(connection);
    } catch {
      /* ignore unlock failures */
    }
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
