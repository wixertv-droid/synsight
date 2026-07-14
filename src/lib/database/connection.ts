/**
 * MySQL connection pool management.
 *
 * Uses `mysql2/promise` directly so the pool can be swapped for another
 * driver (e.g. a managed proxy) without touching repositories or services.
 * The pool is created lazily on first use and reused for the process
 * lifetime.
 */
import mysql from "mysql2/promise";
import type { Pool, PoolOptions } from "mysql2/promise";
import type { DatabaseConfig } from "./types";

let pool: Pool | null = null;

function parseDatabaseUrl(url: string): PoolOptions {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: database || undefined,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function createConnectionPool(config?: Partial<DatabaseConfig>): Pool {
  const url = config?.url ?? getDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env to enable MySQL."
    );
  }

  const options = parseDatabaseUrl(url);
  if (config?.poolSize) {
    options.connectionLimit = config.poolSize;
  }
  if (config?.connectTimeoutMs) {
    options.connectTimeout = config.connectTimeoutMs;
  }

  return mysql.createPool(options);
}

export function getConnectionPool(): Pool {
  if (!pool) {
    pool = createConnectionPool();
  }
  return pool;
}

export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false;
  }

  try {
    const activePool = getConnectionPool();
    await activePool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
