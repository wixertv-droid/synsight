import { describe, expect, it } from "vitest";
import {
  createOpaqueToken,
  createSessionId,
  hashToken,
} from "@/lib/utils/crypto";

describe("crypto helpers", () => {
  it("hashes tokens deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("creates opaque session ids and tokens", () => {
    expect(createSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(createOpaqueToken().length).toBeGreaterThan(20);
  });
});
