/**
 * Password hashing utilities using Argon2id.
 *
 * All user passwords must be stored as Argon2id hashes in
 * `users.password_hash`. Plaintext passwords must never be written to the
 * database or logs.
 */
import argon2 from "argon2";

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  plain: string
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, plain);
  } catch {
    return false;
  }
}

/**
 * Pre-computed Argon2id hash for the development admin user (`admin`).
 * Generated with the same parameters as `hashPassword()`.
 * Used by `database/seeds/001_admin_user.sql` and the programmatic seed.
 */
export const DEV_ADMIN_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$PrFVeH70yPNJ59suHjfHcA$GgSHI1UGZf57RVnVL/ujfq2YeL//MEqceOEdpkP5QEs";
