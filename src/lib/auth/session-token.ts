/**
 * Signed session tokens using the Web Crypto API (`crypto.subtle`).
 *
 * This module intentionally avoids Node-only APIs (e.g. `node:crypto`,
 * `Buffer`) so the exact same code can run both in the Edge runtime
 * (`src/middleware.ts`) and the Node runtime (Route Handlers, Server
 * Components) without duplication.
 *
 * The token format is `base64url(payload).base64url(hmacSignature)` — a
 * minimal, dependency-free stand-in for a JWT. It is sufficient for the
 * development-only auth flow in `dev-provider.ts`; a production identity
 * provider may replace this with a signed JWT library or opaque
 * database-backed sessions without changing callers of `getCurrentUser()`.
 */

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "development-only-insecure-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.warn(
    "[synsight] SESSION_SECRET is not set. Using an insecure development " +
      "fallback secret in production is unsafe — configure a real secret " +
      "before shipping real authentication."
  );
}

export interface SessionPayload {
  /** Subject — the authenticated user's id. */
  sub: string;
  displayName: string;
  email: string;
  role: "admin" | "demo";
  /** Issued-at, unix seconds. */
  iat: number;
  /** Expires-at, unix seconds. */
  exp: number;
}

let cachedKey: Promise<CryptoKey> | null = null;

function getSigningKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return cachedKey;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createSessionToken(
  payload: Pick<SessionPayload, "sub" | "displayName" | "email" | "role">,
  maxAgeSeconds: number
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + maxAgeSeconds,
  };

  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify(fullPayload))
  );
  const key = await getSigningKey();
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  );
  return `${body}.${toBase64Url(signatureBytes)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await getSigningKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      new TextEncoder().encode(body)
    );
    if (!isValid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
