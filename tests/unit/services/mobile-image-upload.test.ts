import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories", () => {
  const tokens = new Map<
    number,
    {
      id: number;
      userId: number;
      tokenHash: string;
      tokenType: string;
      expiresAt: string;
      usedAt: string | null;
    }
  >();
  let nextId = 1;
  return {
    getUserTokenRepository: () => ({
      async create(input: {
        userId: number;
        tokenHash: string;
        tokenType: string;
        expiresAt: string;
      }) {
        const id = nextId++;
        const row = { id, ...input, usedAt: null };
        tokens.set(id, row);
        return row;
      },
      async findValid(tokenHash: string, tokenType: string) {
        return (
          [...tokens.values()].find(
            (token) =>
              token.tokenHash === tokenHash &&
              token.tokenType === tokenType &&
              !token.usedAt &&
              new Date(token.expiresAt) > new Date()
          ) ?? null
        );
      },
      async revokeForUser(userId: number, tokenType: string) {
        for (const token of tokens.values()) {
          if (token.userId === userId && token.tokenType === tokenType) {
            token.usedAt = new Date().toISOString();
          }
        }
      },
    }),
  };
});

vi.mock("@/lib/services/identity-service", () => ({
  getIdentityForUser: vi.fn(async () => ({
    images: [{ imageType: "front" }],
  })),
}));

import {
  createMobileImageUploadSession,
  resolveMobileUploadSession,
} from "@/lib/services/mobile-image-upload-service";

describe("mobile image upload sessions", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://synsight.de";
  });

  it("creates a QR session URL and resolves slot status", async () => {
    const session = await createMobileImageUploadSession(42);
    expect(session.uploadUrl).toContain("https://synsight.de/m/upload?t=");
    expect(session.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const resolved = await resolveMobileUploadSession(session.token);
    expect(resolved?.userId).toBe(42);
    expect(resolved?.slots.front).toBe(true);
    expect(resolved?.slots.angled).toBe(false);
  });

  it("rejects short or unknown tokens", async () => {
    await expect(resolveMobileUploadSession("short")).resolves.toBeNull();
    await expect(
      resolveMobileUploadSession("a".repeat(40))
    ).resolves.toBeNull();
  });
});
