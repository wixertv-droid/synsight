/**
 * Verifies admin credentials + session persistence against live MariaDB.
 * Does not use Next.js cookie APIs (those require a request scope).
 *
 * Usage:
 *   DATABASE_URL=... SESSION_SECRET=... npx tsx scripts/verify-admin-login.ts
 */
import mysql from "mysql2/promise";
import { verifyPassword } from "../src/lib/auth/password";
import { SESSION_MAX_AGE_SECONDS } from "../src/lib/auth/config";
import { createSessionToken } from "../src/lib/auth/session-token";
import { closeConnectionPool } from "../src/lib/database/connection";
import {
  getSessionRepository,
  getUserRepository,
} from "../src/lib/repositories";
import { createSessionId, hashToken } from "../src/lib/utils/crypto";

async function main() {
  const users = getUserRepository();
  const record = await users.findByEmail("admin@synsight.local");
  if (!record) {
    console.error("LOGIN_FAIL: admin user not found");
    process.exitCode = 1;
    return;
  }

  const passwordOk = await verifyPassword(record.passwordHash, "admin");
  if (!passwordOk) {
    console.error("LOGIN_FAIL: password verify failed");
    process.exitCode = 1;
    return;
  }

  if (record.role !== "admin" || record.status !== "active") {
    console.error(
      `LOGIN_FAIL: expected active admin, got role=${record.role} status=${record.status}`
    );
    process.exitCode = 1;
    return;
  }

  const sessionId = createSessionId();
  const token = await createSessionToken(
    {
      sub: String(record.id),
      sid: sessionId,
      displayName: `${record.firstName} ${record.lastName}`,
      email: record.email,
      role: record.role,
    },
    SESSION_MAX_AGE_SECONDS
  );
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  await getSessionRepository().create({
    id: sessionId,
    userId: record.id,
    tokenHash: hashToken(token),
    ipAddress: "127.0.0.1",
    userAgent: "mariadb-integration-test",
    expiresAt,
  });

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const connection = await mysql.createConnection(url);
  try {
    const [rows] = await connection.query(
      `SELECT id, user_id, revoked_at IS NULL AS active
       FROM sessions WHERE id = ? LIMIT 1`,
      [sessionId]
    );
    console.log(
      JSON.stringify(
        {
          login: "success",
          email: record.email,
          role: record.role,
          sessionId,
          sessions: rows,
        },
        null,
        2
      )
    );
  } finally {
    await connection.end();
    await closeConnectionPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
