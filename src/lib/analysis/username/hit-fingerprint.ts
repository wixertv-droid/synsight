/** Stable fingerprint for a username hit — works in Edge/browser and Node. */
export function usernameHitFingerprint(input: {
  platform: string;
  profileUrl: string | null;
  title?: string;
}): string {
  const raw = `${input.platform}|${input.profileUrl ?? ""}|${input.title ?? ""}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // unsigned hex, pad for stability
  return (hash >>> 0).toString(16).padStart(8, "0") + raw.length.toString(16);
}
