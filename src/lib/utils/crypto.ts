/**
 * Server-side cryptographic helpers for session token hashing and IDs.
 */
import { createHash, randomUUID } from "node:crypto";

export function createSessionId(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
