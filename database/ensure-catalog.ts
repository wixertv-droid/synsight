/**
 * Force-apply Digital Leak catalog rows + scan tables without full migrate.
 *
 * Usage:
 *   DATABASE_URL='mysql://synsight:...@localhost:3306/synsight' npm run db:ensure-catalog
 */
import { createConnection } from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sqlPath = path.join(
    process.cwd(),
    "database/fixes/repair_digital_leak_catalog.sql"
  );
  const sql = await readFile(sqlPath, "utf8");
  const connection = await createConnection({
    uri: url,
    multipleStatements: true,
  });
  try {
    const [result] = await connection.query(sql);
    console.log("Digital Leak catalog + schema repair applied.");
    console.log(result);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
