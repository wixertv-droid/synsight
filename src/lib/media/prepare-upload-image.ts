import {
  ANALYSIS_MAX_PIXELS,
  CLIENT_UPLOAD_TARGET_BYTES,
  MAX_UPLOAD_BYTES,
} from "@/lib/media/image-limits";

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Dieses Bildformat konnte im Browser nicht gelesen werden. Bitte als JPG oder PNG speichern."
        )
      );
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Bildkompression fehlgeschlagen."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Resize + compress a reference photo in the browser so uploads stay under
 * reverse-proxy body limits while remaining usable for later face analysis.
 */
export async function prepareProfileImageForUpload(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") &&
    !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  ) {
    throw new Error("Nur Bilddateien sind erlaubt.");
  }

  // Already small enough — still normalize large dimensions when possible.
  const image = await loadImageElement(file);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale =
    longest > ANALYSIS_MAX_PIXELS ? ANALYSIS_MAX_PIXELS / longest : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Bildkompression nicht verfügbar.");
  }
  ctx.drawImage(image, 0, 0, width, height);

  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const preferWebp = probe
    .toDataURL("image/webp")
    .startsWith("data:image/webp");

  const mime = preferWebp ? "image/webp" : "image/jpeg";
  const extension = preferWebp ? "webp" : "jpg";
  let quality = 0.84;
  let blob = await canvasToBlob(canvas, mime, quality);

  while (blob.size > CLIENT_UPLOAD_TARGET_BYTES && quality > 0.55) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mime, quality);
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "Das Bild ist nach der Kompression noch zu groß. Bitte ein kleineres Foto wählen."
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "referenz";
  return new File([blob], `${baseName}.${extension}`, {
    type: mime,
    lastModified: Date.now(),
  });
}

export async function readImageUploadError(
  response: Response
): Promise<string> {
  if (response.status === 413) {
    return "Das Bild ist zu groß für den Server-Upload. Bitte erneut versuchen — die App komprimiert Fotos automatisch.";
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (body?.error?.message) return body.error.message;
    } catch {
      // fall through
    }
  }

  return "Bild-Upload fehlgeschlagen.";
}
