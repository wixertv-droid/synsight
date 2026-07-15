import {
  createCipheriv,
  createHash,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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

export function assertAllowedImage(file: {
  type: string;
  name: string;
  size: number;
}): void {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.has(ext)) {
    throw new Error("Nur JPG, JPEG, PNG, WEBP oder HEIC sind erlaubt.");
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Die Bilddatei darf höchstens 8 MB groß sein.");
  }
}

export async function processAndStoreProfileImage(input: {
  userId: number;
  imageType: ProcessedProfileImage["imageType"];
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<ProcessedProfileImage> {
  assertAllowedImage({
    type: input.mimeType,
    name: input.fileName,
    size: input.bytes.byteLength,
  });

  const imageId = randomUUID();
  const relativeDir = path.posix.join(
    "users",
    String(input.userId),
    "images",
    imageId
  );
  const absoluteDir = path.join(privateStorageRoot(), "images", relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const contentHash = createHash("sha256").update(input.bytes).digest("hex");
  const encryptedOriginal = encryptBuffer(input.bytes);

  const normalized = sharp(input.bytes, { failOn: "none" }).rotate();
  const analysisBuffer = await normalized
    .clone()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnailBuffer = await normalized
    .clone()
    .resize({
      width: 300,
      height: 300,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();

  const originalName = "original.bin";
  const analysisName = "analysis.webp";
  const thumbnailName = "thumbnail.webp";

  await Promise.all([
    writeFile(path.join(absoluteDir, originalName), encryptedOriginal),
    writeFile(path.join(absoluteDir, analysisName), analysisBuffer),
    writeFile(path.join(absoluteDir, thumbnailName), thumbnailBuffer),
  ]);

  const storagePath = path.posix.join(relativeDir, analysisName);

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
