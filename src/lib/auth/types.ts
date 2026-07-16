export type UserRole = "admin" | "user";

/**
 * The authenticated identity used throughout the app. This intentionally
 * stays small and serializable so it can be embedded in a signed session
 * token and passed from Server Components to Client Components as a plain
 * prop.
 */
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}
