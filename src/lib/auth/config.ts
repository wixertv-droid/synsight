/**
 * Central authentication configuration.
 *
 * Every constant here is deliberately isolated so a future migration to a
 * real identity provider only touches this file and `dev-provider.ts` —
 * `middleware.ts`, route handlers, and UI components read these constants
 * instead of hardcoding values.
 */

export const SESSION_COOKIE_NAME = "synsight_session";

/** Session lifetime in seconds (8 hours). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * DEVELOPMENT ONLY credentials.
 *
 * These allow reviewing the protected platform before a real
 * authentication provider and database exist. They must be removed once
 * `lib/auth/dev-provider.ts` is replaced with a real implementation.
 */
export const DEV_AUTH_USERNAME = "admin";
export const DEV_AUTH_PASSWORD = "admin";

/** Route prefixes guarded by `src/middleware.ts`. */
export const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/profile", "/settings"];
