/**
 * Force-apply catalog rows + scan tables without full migrate.
 *
 * Usage:
 *   DATABASE_URL='mysql://synsight:...@localhost:3306/synsight' npm run db:ensure-catalog
 */
import { createConnection } from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function applySql(
  connection: Awaited<ReturnType<typeof createConnection>>,
  relativePath: string
) {
  const sqlPath = path.join(process.cwd(), relativePath);
  const sql = await readFile(sqlPath, "utf8");
  const [result] = await connection.query(sql);
  console.log(`Applied ${relativePath}`);
  console.log(result);
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const connection = await createConnection({
    uri: url,
    multipleStatements: true,
  });
  try {
    await applySql(
      connection,
      "database/fixes/repair_digital_leak_catalog.sql"
    );
    await applySql(
      connection,
      "database/migrations/023_username_intelligence.sql"
    );
    console.log(
      "Catalog + schema repair applied (Digital Leak + Username Intelligence)."
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
