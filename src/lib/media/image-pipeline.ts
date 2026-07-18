import {
  createCipheriv,
  createHash,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  ANALYSIS_MAX_PIXELS,
  ANALYSIS_WEBP_QUALITY,
  MAX_UPLOAD_BYTES,
  THUMBNAIL_MAX_PIXELS,
  THUMBNAIL_WEBP_QUALITY,
} from "@/lib/media/image-limits";

export {
  ANALYSIS_MAX_PIXELS,
  ANALYSIS_WEBP_QUALITY,
  MAX_UPLOAD_BYTES,
  THUMBNAIL_MAX_PIXELS,
  THUMBNAIL_WEBP_QUALITY,
} from "@/lib/media/image-limits";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAGIC_MIME: Array<{ mime: string; test: (bytes: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    test: (bytes) => bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8,
  },
  {
    mime: "image/png",
    test: (bytes) =>
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (bytes) =>
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
  },
];

export interface ProcessedProfileImage {
  imageType: "front" | "left_profile" | "right_profile" | "angled";
  storagePath: string;
  originalPath: string;
  analysisPath: string;
  thumbnailPath: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
}

function getEncryptionKey(): Buffer {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.IMAGE_ENCRYPTION_KEY
  ) {
    throw new Error("IMAGE_ENCRYPTION_KEY is required in production.");
  }
  const secret =
    process.env.IMAGE_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "development-only-insecure-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptImageBuffer(payload: Buffer): Buffer {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function privateStorageRoot(): string {
  return (
    process.env.PRIVATE_STORAGE_ROOT ||
    path.join(process.cwd(), "storage", "private")
  );
}

export function resolvePrivateImagePath(
  userId: number,
  relativePath: string
): string {
  assertOwnedImagePath(userId, relativePath);
  return path.join(privateStorageRoot(), "images", relativePath);
}

export async function readStoredProfileImage(
  userId: number,
  relativePath: string
): Promise<Buffer> {
  return readFile(resolvePrivateImagePath(userId, relativePath));
}

export async function removeStoredProfileImage(
  userId: number,
  storagePath: string
): Promise<void> {
  const absolute = resolvePrivateImagePath(userId, storagePath);
  await rm(path.dirname(absolute), { recursive: true, force: true });
}

function sniffMime(bytes: Buffer, declared: string): string {
  const magic = MAGIC_MIME.find((entry) => entry.test(bytes))?.mime;
  if (magic) return magic;

  // HEIC/HEIF often need container parsing; allow only if sharp can decode later
  // and the client declared an allowed HEIF family type.
  if (
    declared === "image/heic" ||
    declared === "image/heif" ||
    declared === "image/heic-sequence"
  ) {
    return "image/heic";
  }

  throw new Error("Die Datei ist kein erlaubtes Bildformat.");
}

export function assertOwnedImagePath(
  userId: number,
  relativePath: string
): void {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.includes("\0")
  ) {
    throw new Error("Ungültiger Speicherpfad.");
  }
  const prefix = `users/${userId}/images/`;
  if (!normalized.startsWith(prefix)) {
    throw new Error("Ungültiger Speicherpfad.");
  }
}

export async function processAndStoreProfileImage(input: {
  userId: number;
  imageType: ProcessedProfileImage["imageType"];
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<ProcessedProfileImage> {
  if (
    input.bytes.byteLength <= 0 ||
    input.bytes.byteLength > MAX_UPLOAD_BYTES
  ) {
    throw new Error("Die Bilddatei darf höchstens 8 MB groß sein.");
  }

  const sniffed = sniffMime(input.bytes, input.mimeType);
  if (!ALLOWED_MIME.has(sniffed) && sniffed !== "image/heic") {
    throw new Error("Nur JPG, JPEG, PNG, WEBP oder HEIC sind erlaubt.");
  }

  // Verify decodability with sharp (rejects polyglot/non-image payloads).
  try {
    await sharp(input.bytes, { failOn: "error" }).metadata();
  } catch {
    throw new Error("Die Bilddatei konnte nicht verarbeitet werden.");
  }

  const imageId = randomUUID();
  const relativeDir = path.posix.join(
    "users",
    String(input.userId),
    "images",
    imageId
  );
  const absoluteDir = path.join(privateStorageRoot(), "images", relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const normalized = sharp(input.bytes, { failOn: "error" }).rotate();
  const analysisBuffer = await normalized
    .clone()
    .resize({
      width: ANALYSIS_MAX_PIXELS,
      height: ANALYSIS_MAX_PIXELS,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: ANALYSIS_WEBP_QUALITY, effort: 4 })
    .toBuffer();

  const thumbnailBuffer = await normalized
    .clone()
    .resize({
      width: THUMBNAIL_MAX_PIXELS,
      height: THUMBNAIL_MAX_PIXELS,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMBNAIL_WEBP_QUALITY, effort: 4 })
    .toBuffer();

  // Archive only the analysis-ready master (encrypted) — not multi‑MB phone originals.
  const contentHash = createHash("sha256").update(analysisBuffer).digest("hex");
  const encryptedOriginal = encryptBuffer(analysisBuffer);

  const originalName = "original.bin";
  const analysisName = "analysis.webp";
  const thumbnailName = "thumbnail.webp";

  await Promise.all([
    writeFile(path.join(absoluteDir, originalName), encryptedOriginal),
    writeFile(path.join(absoluteDir, analysisName), analysisBuffer),
    writeFile(path.join(absoluteDir, thumbnailName), thumbnailBuffer),
  ]);

  const storagePath = path.posix.join(relativeDir, analysisName);
  assertOwnedImagePath(input.userId, storagePath);

  return {
    imageType: input.imageType,
    storagePath,
    originalPath: path.posix.join(relativeDir, originalName),
    analysisPath: storagePath,
    thumbnailPath: path.posix.join(relativeDir, thumbnailName),
    contentHash,
    mimeType: "image/webp",
    byteSize: analysisBuffer.byteLength,
  };
}
