import { createHash } from "node:crypto";
import type { PlatformThreat } from "@/lib/dashboard/build-threats-from-reports";

/** Stable fingerprint of the current threat set (server-only). */
export function threatsInputFingerprint(threats: PlatformThreat[]): string {
  const payload = threats
    .map((t) => `${t.id}|${t.level}|${t.moduleKey}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 64);
}
