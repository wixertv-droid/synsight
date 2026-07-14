/**
 * Database adapter — the single entry point for Drizzle ORM access.
 *
 * When `DATABASE_URL` is set, repositories receive a typed Drizzle client
 * backed by a MySQL pool. When it is absent, `getDatabase()` returns `null`
 * and repositories fall back to their in-memory implementations so the app
 * remains runnable during local UI development without a database server.
 *
 * Nothing outside `lib/repositories` should import this module.
 */
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import {
  getConnectionPool,
  isDatabaseConfigured,
  pingDatabase,
} from "./connection";
import * as schema from "./schema";
import type { DatabaseHealth } from "./types";

export type SynSightDatabase = MySql2Database<typeof schema>;

let database: SynSightDatabase | null = null;

export function getDatabase(): SynSightDatabase | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!database) {
    const pool = getConnectionPool();
    database = drizzle(pool, { schema, mode: "default" });
  }

  return database;
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      driver: null,
      reachable: false,
      message: "DATABASE_URL is not configured — using in-memory fallbacks.",
    };
  }

  const reachable = await pingDatabase();
  return {
    configured: true,
    driver: "mysql",
    reachable,
    message: reachable
      ? "MySQL connection pool is healthy."
      : "DATABASE_URL is set but the server is unreachable.",
  };
}

export { isDatabaseConfigured } from "./connection";
