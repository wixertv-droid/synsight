import type { ScanQueries } from "@/components/sections/DemoScanner/types";

function hostnameFrom(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return (new URL(withProto).hostname || raw).replace(/^www\./i, "");
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/^www\./i, "");
  }
}

/**
 * Normalize landing-form inputs before building the Contabo module plan.
 * - domain: hostname only (no https://)
 * - url: ensure https://
 * - if only URL given, also derive domain for theHarvester
 */
export function normalizeScanQueries(input: ScanQueries): ScanQueries {
  const out: ScanQueries = {};

  if (input.email?.trim()) out.email = input.email.trim().toLowerCase();
  if (input.username?.trim()) out.username = input.username.trim();
  if (input.phone?.trim()) out.phone = input.phone.trim().replace(/\s+/g, "");
  if (input.name?.trim()) out.name = input.name.trim();

  if (input.url?.trim()) {
    const url = input.url.trim();
    out.url = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  if (input.domain?.trim()) {
    out.domain = hostnameFrom(input.domain);
  } else if (out.url) {
    out.domain = hostnameFrom(out.url);
  }

  return out;
}
