import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPlatformBooted,
  hasPlatformBooted,
  markPlatformBooted,
  SYNSIGHT_BOOTED_KEY,
} from "@/lib/session/platform-boot";

function installMemorySessionStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: memory,
  });
  return memory;
}

describe("platform boot session key", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = installMemorySessionStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  it("starts unbooted and marks booted", () => {
    expect(hasPlatformBooted()).toBe(false);
    markPlatformBooted();
    expect(storage.getItem(SYNSIGHT_BOOTED_KEY)).toBe("true");
    expect(hasPlatformBooted()).toBe(true);
  });

  it("clears boot flag on logout", () => {
    markPlatformBooted();
    clearPlatformBooted();
    expect(hasPlatformBooted()).toBe(false);
  });
});
