/** Stable fingerprint for analysis hits — works in browser and Node. */
export function analysisHitFingerprint(input: {
  module: string;
  url: string | null | undefined;
  platform?: string | null;
  title?: string | null;
}): string {
  const raw = `${input.module}|${input.platform ?? ""}|${input.url ?? ""}|${input.title ?? ""}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0") + raw.length.toString(16);
}

/** @deprecated use analysisHitFingerprint */
export function usernameHitFingerprint(input: {
  platform: string;
  profileUrl: string | null;
  title?: string;
}): string {
  return analysisHitFingerprint({
    module: "username_intelligence",
    url: input.profileUrl,
    platform: input.platform,
    title: input.title,
  });
}
