/** Mask identifiers for UI/storage — never store full secrets. */

export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

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
