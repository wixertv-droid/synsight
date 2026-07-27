import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

export function privateStorageRoot(): string {
  return process.env.PRIVATE_STORAGE_ROOT?.trim() || "./storage/private";
}

function privateRoot(): string {
  return privateStorageRoot();
}

export function reverseImageUserRoot(userId: number): string {
  return path.join(privateRoot(), "reverse-image", "users", String(userId));
}

export function reverseImageScanRoot(userId: number, scanId: number): string {
  return path.join(reverseImageUserRoot(userId), `scan-${scanId}`);
}

export function reverseImageTempDir(userId: number, scanId: number): string {
  return path.join(reverseImageScanRoot(userId, scanId), "temp");
}

export function reverseImageMatchesDir(userId: number, scanId: number): string {
  return path.join(reverseImageScanRoot(userId, scanId), "Gefundene_Bilder");
}

export async function ensureReverseImageDirs(
  userId: number,
  scanId: number
): Promise<{ tempDir: string; matchesDir: string }> {
  const tempDir = reverseImageTempDir(userId, scanId);
  const matchesDir = reverseImageMatchesDir(userId, scanId);
  await mkdir(tempDir, { recursive: true });
  await mkdir(matchesDir, { recursive: true });
  return { tempDir, matchesDir };
}

export async function writeTempCandidate(
  userId: number,
  scanId: number,
  bytes: Buffer,
  ext = "jpg"
): Promise<string> {
  const tempDir = reverseImageTempDir(userId, scanId);
  await mkdir(tempDir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  const absolute = path.join(tempDir, fileName);
  await writeFile(absolute, bytes);
  return path.posix.join(
    "reverse-image",
    "users",
    String(userId),
    `scan-${scanId}`,
    "temp",
    fileName
  );
}

export async function deleteTempRelativePath(
  relativePath: string
): Promise<void> {
  const absolute = path.join(privateRoot(), relativePath);
  await rm(absolute, { force: true });
}

export async function persistMatchImage(input: {
  userId: number;
  scanId: number;
  hitId: string;
  bytes: Buffer;
}): Promise<{ storedPath: string; thumbnailPath: string }> {
  const matchesDir = reverseImageMatchesDir(input.userId, input.scanId);
  await mkdir(matchesDir, { recursive: true });

  const baseName = input.hitId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storedAbs = path.join(matchesDir, `${baseName}.webp`);
  const thumbAbs = path.join(matchesDir, `${baseName}_thumb.webp`);

  const normalized = await sharp(input.bytes, { failOn: "error" })
    .rotate()
    .webp({ quality: 82 })
    .toBuffer();
  const thumb = await sharp(normalized)
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();

  await writeFile(storedAbs, normalized);
  await writeFile(thumbAbs, thumb);

  const storedPath = path.posix.join(
    "reverse-image",
    "users",
    String(input.userId),
    `scan-${input.scanId}`,
    "Gefundene_Bilder",
    `${baseName}.webp`
  );
  const thumbnailPath = path.posix.join(
    "reverse-image",
    "users",
    String(input.userId),
    `scan-${input.scanId}`,
    "Gefundene_Bilder",
    `${baseName}_thumb.webp`
  );

  return { storedPath, thumbnailPath };
}

export async function readReverseImageFile(
  relativePath: string
): Promise<Buffer> {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    !normalized.startsWith("reverse-image/")
  ) {
    throw new Error("Ungültiger Bildpfad.");
  }
  return readFile(path.join(privateRoot(), normalized));
}

export async function cleanupTempDir(
  userId: number,
  scanId: number
): Promise<void> {
  await rm(reverseImageTempDir(userId, scanId), {
    recursive: true,
    force: true,
  });
}

export async function cleanupReverseImageScanStorage(
  userId: number,
  scanId: number
): Promise<void> {
  await rm(reverseImageScanRoot(userId, scanId), {
    recursive: true,
    force: true,
  });
}
