/**
 * Masking helpers for Digital Leak & Exposure.
 *
 * HARD RULE: Only password / hashed_password may be masked for UI + Gemini.
 * Email, phone, username, name, IP, identifier stay in cleartext.
 * maskEmail/maskPhone remain only for internal usage/audit logs — not for findings.
 */

/** Password/hash preview: first 3 + stars + last 2 (never full secret). */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 5) {
    return `${trimmed.slice(0, 1)}${"*".repeat(Math.max(2, trimmed.length - 1))}`;
  }
  const head = trimmed.slice(0, 3);
  const tail = trimmed.slice(-2);
  const middle = "*".repeat(Math.max(3, trimmed.length - 5));
  return `${head}${middle}${tail}`;
}

/** @deprecated for findings — only for api_usage_logs / finance meta */
export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

/** @deprecated for findings — only for api_usage_logs / finance meta */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 6) return "****";
  const prefix = digits.slice(0, Math.min(3, digits.length - 4));
  const suffix = digits.slice(-2);
  return `${prefix}${"*".repeat(Math.max(4, digits.length - prefix.length - 2))}${suffix}`;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
