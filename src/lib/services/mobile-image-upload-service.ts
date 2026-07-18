import QRCode from "qrcode";
import { getUserTokenRepository } from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";
import { getIdentityForUser } from "@/lib/services/identity-service";

const SESSION_TTL_MS = 15 * 60_000;

function resolveAppUrl(): string {
  const fromProcess = process.env.APP_URL?.trim();
  if (fromProcess) return fromProcess.replace(/\/$/, "");
  return "https://synsight.de";
}

function expiresAtMysql(msFromNow: number): string {
  return new Date(Date.now() + msFromNow)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

export async function createMobileImageUploadSession(userId: number): Promise<{
  token: string;
  uploadUrl: string;
  qrDataUrl: string;
  expiresAt: string;
}> {
  const tokens = getUserTokenRepository();
  await tokens.revokeForUser(userId, "mobile_upload");

  const token = createOpaqueToken();
  const expiresAt = expiresAtMysql(SESSION_TTL_MS);
  await tokens.create({
    userId,
    tokenHash: hashToken(token),
    tokenType: "mobile_upload",
    expiresAt,
  });

  const uploadUrl = `${resolveAppUrl()}/m/upload?t=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(uploadUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#041018",
      light: "#E8F7FF",
    },
  });

  return { token, uploadUrl, qrDataUrl, expiresAt };
}

export async function resolveMobileUploadSession(token: string): Promise<{
  userId: number;
  expiresAt: string;
  slots: Record<"front" | "left_profile" | "right_profile" | "angled", boolean>;
} | null> {
  const trimmed = token.trim();
  if (trimmed.length < 32) return null;

  const record = await getUserTokenRepository().findValid(
    hashToken(trimmed),
    "mobile_upload"
  );
  if (!record) return null;

  const identity = await getIdentityForUser(record.userId);
  const filled = new Set(
    identity?.images.map((image) => image.imageType) ?? []
  );

  return {
    userId: record.userId,
    expiresAt: record.expiresAt,
    slots: {
      front: filled.has("front"),
      left_profile: filled.has("left_profile"),
      right_profile: filled.has("right_profile"),
      angled: filled.has("angled"),
    },
  };
}
