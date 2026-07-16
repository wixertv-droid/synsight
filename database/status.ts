/**
 * Report MariaDB/MySQL connection health and migration status.
 *
 * Usage:
 *   DATABASE_URL=mysql://... npm run db:status
 */
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.join(process.cwd(), "database", "migrations");

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Example: mysql://user:pass@localhost:3306/synsight"
    );
  }
  return url;
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [pingRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT 1 AS ok, DATABASE() AS db, VERSION() AS version"
    );
    const meta = pingRows[0];
    console.log("Connection: OK");
    console.log(`Database:   ${meta?.db ?? "(none)"}`);
    console.log(`Server:     ${meta?.version ?? "unknown"}`);

    const [tableCheck] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_synsight_schema_migrations'"
    );
    const hasMigrationsTable = Number(tableCheck[0]?.cnt ?? 0) > 0;

    const files = await listMigrationFiles();
    console.log(`Migrations on disk: ${files.length}`);

    if (!hasMigrationsTable) {
      console.log(
        "Applied:    0 (migrations table missing — run npm run db:migrate)"
      );
      console.log("Status:     PENDING");
      process.exitCode = 2;
      return;
    }

    const [appliedRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT `name`, `checksum`, `applied_at` FROM `_synsight_schema_migrations` ORDER BY `name`"
    );
    const applied = new Map(
      appliedRows.map((row) => [String(row.name), String(row.checksum)])
    );

    let pending = 0;
    let mismatch = 0;

    for (const name of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = applied.get(name);
      if (!existing) {
        console.log(`  pending  ${name}`);
        pending += 1;
        continue;
      }
      if (existing !== checksum) {
        console.log(`  MISMATCH ${name}`);
        mismatch += 1;
        continue;
      }
      console.log(`  ok       ${name}`);
    }

    const [userCountRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );
    if (Number(userCountRows[0]?.cnt ?? 0) > 0) {
      const [users] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT COUNT(*) AS cnt FROM `users`"
      );
      console.log(`Users:      ${Number(users[0]?.cnt ?? 0)}`);
      try {
        const [admin] = await connection.query<mysql.RowDataPacket[]>(
          "SELECT `email`, `username`, `role`, `status` FROM `users` WHERE `username` = 'admin' LIMIT 1"
        );
        if (admin[0]) {
          console.log(
            `Admin:      ${admin[0].email} (role=${admin[0].role}, status=${admin[0].status})`
          );
        } else {
          console.log("Admin:      missing — run npm run db:seed");
        }
      } catch {
        console.log("Admin:      (role column pending — finish migrations)");
      }
    }

    if (mismatch > 0) {
      console.log("Status:     CHECKSUM MISMATCH");
      process.exitCode = 1;
      return;
    }
    if (pending > 0) {
      console.log(`Status:     ${pending} pending migration(s)`);
      process.exitCode = 2;
      return;
    }

    console.log("Status:     UP TO DATE");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    "db:status failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
