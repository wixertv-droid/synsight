import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  ANALYSIS_MAX_PIXELS,
  MAX_UPLOAD_BYTES,
  THUMBNAIL_MAX_PIXELS,
  assertOwnedImagePath,
  decryptImageBuffer,
  processAndStoreProfileImage,
  resolvePrivateImagePath,
} from "@/lib/media/image-pipeline";

describe("profile image pipeline", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "synsight-images-"));
    process.env.PRIVATE_STORAGE_ROOT = root;
    process.env.IMAGE_ENCRYPTION_KEY =
      "unit-test-image-encryption-key-at-least-32";
  });

  afterEach(async () => {
    delete process.env.PRIVATE_STORAGE_ROOT;
    delete process.env.IMAGE_ENCRYPTION_KEY;
    await rm(root, { recursive: true, force: true });
  });

  it("encrypts original and creates bounded WebP variants", async () => {
    const source = await sharp({
      create: {
        width: 2200,
        height: 1800,
        channels: 3,
        background: { r: 20, g: 120, b: 180 },
      },
    })
      .jpeg({ quality: 92 })
      .toBuffer();

    const result = await processAndStoreProfileImage({
      userId: 42,
      imageType: "front",
      fileName: "face.jpg",
      mimeType: "image/jpeg",
      bytes: source,
    });

    const encrypted = await readFile(
      resolvePrivateImagePath(42, result.originalPath)
    );
    expect(encrypted.equals(source)).toBe(false);
    expect(decryptImageBuffer(encrypted).equals(source)).toBe(true);

    const analysis = await sharp(
      resolvePrivateImagePath(42, result.analysisPath)
    ).metadata();
    const thumbnail = await sharp(
      resolvePrivateImagePath(42, result.thumbnailPath)
    ).metadata();
    expect(analysis.format).toBe("webp");
    expect(
      Math.max(analysis.width ?? 0, analysis.height ?? 0)
    ).toBeLessThanOrEqual(ANALYSIS_MAX_PIXELS);
    expect(thumbnail.format).toBe("webp");
    expect(
      Math.max(thumbnail.width ?? 0, thumbnail.height ?? 0)
    ).toBeLessThanOrEqual(THUMBNAIL_MAX_PIXELS);
  });

  it("rejects oversized and non-image uploads", async () => {
    await expect(
      processAndStoreProfileImage({
        userId: 1,
        imageType: "front",
        fileName: "large.jpg",
        mimeType: "image/jpeg",
        bytes: Buffer.alloc(MAX_UPLOAD_BYTES + 1),
      })
    ).rejects.toThrow("höchstens 8 MB");

    await expect(
      processAndStoreProfileImage({
        userId: 1,
        imageType: "front",
        fileName: "fake.jpg",
        mimeType: "image/jpeg",
        bytes: Buffer.from("not an image"),
      })
    ).rejects.toThrow("kein erlaubtes Bildformat");
  });

  it("rejects paths outside the authenticated user storage", () => {
    expect(() =>
      assertOwnedImagePath(1, "users/2/images/id/thumbnail.webp")
    ).toThrow("Ungültiger Speicherpfad");
    expect(() =>
      assertOwnedImagePath(1, "../users/1/images/id/thumbnail.webp")
    ).toThrow("Ungültiger Speicherpfad");
  });
});
