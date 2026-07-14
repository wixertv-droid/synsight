/**
 * Database-layer types shared by the connection pool, Drizzle adapter,
 * and repository implementations. These describe infrastructure concerns
 * (pool config, adapter health) — not domain entities; those live in
 * `src/types/domain.ts`.
 */

export interface DatabaseConfig {
  url: string;
  /** Maximum pooled connections (default: 10). */
  poolSize?: number;
  /** Connection timeout in milliseconds (default: 10_000). */
  connectTimeoutMs?: number;
}

export type DatabaseDriver = "mysql";

export interface DatabaseHealth {
  configured: boolean;
  driver: DatabaseDriver | null;
  reachable: boolean;
  message: string;
}
