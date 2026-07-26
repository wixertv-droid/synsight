/**
 * Session keys for platform boot / shutdown sequences.
 * Boot overlay shows once per browser tab session after login.
 */
export const SYNSIGHT_BOOTED_KEY = "synsight_booted";

export function hasPlatformBooted(): boolean {
  try {
    return sessionStorage.getItem(SYNSIGHT_BOOTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markPlatformBooted(): void {
  try {
    sessionStorage.setItem(SYNSIGHT_BOOTED_KEY, "true");
  } catch {
    // Private mode / blocked storage
  }
}

export function clearPlatformBooted(): void {
  try {
    sessionStorage.removeItem(SYNSIGHT_BOOTED_KEY);
  } catch {
    // ignore
  }
}
