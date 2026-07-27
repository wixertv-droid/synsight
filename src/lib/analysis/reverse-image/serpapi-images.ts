import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";
import {
  recordSearchProviderRequest,
  resolveSearchProviderApiKey,
} from "@/lib/services/search-provider-service";

export interface SerpImageCandidate {
  title: string;
  imageUrl: string;
  /** SerpAPI thumbnail — Fallback wenn Original-CDN blockt. */
  thumbnailUrl?: string | null;
  sourceUrl: string | null;
  sourceHost: string;
  query: string;
  position: number;
  queryId?: string;
  queryGroup?: "name" | "alias" | "username";
  queryLabel?: string;
}

/** Default depth — bewusst niedrig (jede Seite = 1 SerpAPI-Call). */
export const REVERSE_IMAGE_SERP_PAGES = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_PAGES ?? "2",
  10
);
export const REVERSE_IMAGE_SERP_NUM = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_NUM ?? "100",
  10
);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function looksLikeImageBytes(bytes: Buffer): boolean {
  if (bytes.byteLength < 12) return false;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  // WEBP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true;
  return false;
}

export async function fetchGoogleImageCandidates(input: {
  query: string;
  num?: number;
  pages?: number;
  userId?: number;
}): Promise<SerpImageCandidate[]> {
  const apiKey = await resolveSearchProviderApiKey("serpapi");
  if (!apiKey || !input.query.trim()) return [];

  const provider = new SerpApiProvider(apiKey);
  const started = Date.now();
  const referenceKey = `serpapi-google_images:${Date.now()}`;
  const pages = Math.min(
    Math.max(
      input.pages ??
        (Number.isFinite(REVERSE_IMAGE_SERP_PAGES)
          ? REVERSE_IMAGE_SERP_PAGES
          : 5),
      1
    ),
    5
  );
  const num = Math.min(
    Math.max(
      input.num ??
        (Number.isFinite(REVERSE_IMAGE_SERP_NUM)
          ? REVERSE_IMAGE_SERP_NUM
          : 400),
      1
    ),
    500
  );

  try {
    const hits = await provider.searchImages(input.query, {
      num,
      pages,
    });
    await recordSearchProviderRequest({
      provider: "serpapi",
      ok: true,
      latencyMs: Date.now() - started,
      apiVersion: "serpapi/google_images",
      eventType: "reverse_image_search",
      query: input.query,
      referenceKey,
      userId: input.userId ?? null,
      requestCount: pages,
      recordFinance: true,
    });

    return hits.map((hit, index) => {
      const raw = (hit.raw ?? {}) as {
        link?: string;
        original?: string;
        thumbnail?: string;
      };
      const imageUrl = (raw.original || hit.link || "").trim();
      const pageUrl = (raw.link || hit.link || "").trim() || null;
      const thumbnailUrl = (raw.thumbnail || "").trim() || null;
      return {
        title: hit.title,
        imageUrl,
        thumbnailUrl,
        sourceUrl: pageUrl,
        sourceHost: hostOf(pageUrl || imageUrl),
        query: input.query,
        position: hit.position ?? index + 1,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "image search failed";
    await recordSearchProviderRequest({
      provider: "serpapi",
      ok: false,
      latencyMs: Date.now() - started,
      errorMessage: message,
      eventType: "reverse_image_search_error",
      query: input.query,
      referenceKey,
      userId: input.userId ?? null,
      requestCount: pages,
      recordFinance: true,
    });
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function downloadPublicImage(url: string): Promise<Buffer | null> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }
  try {
    const response = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Referer: "https://www.google.com/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength <= 256 || bytes.byteLength > 12 * 1024 * 1024) {
      return null;
    }
    const declaredImage = contentType.startsWith("image/");
    const opaqueBinary =
      !contentType ||
      contentType === "application/octet-stream" ||
      contentType === "binary/octet-stream";
    if (!declaredImage && !opaqueBinary && !looksLikeImageBytes(bytes)) {
      return null;
    }
    if (!declaredImage && !looksLikeImageBytes(bytes)) {
      return null;
    }
    return bytes;
  } catch {
    return null;
  }
}

export function isReverseImageSearchConfigured(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}
