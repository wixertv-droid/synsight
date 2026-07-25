/**
 * Resolve a post-login redirect from `?from=` without open redirects.
 */
export function safeInternalRedirect(
  from: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!from) return fallback;
  const value = from.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  // Block protocol-relative and external-looking paths
  if (/^\/[a-z]+:/i.test(value)) return fallback;
  return value;
}
