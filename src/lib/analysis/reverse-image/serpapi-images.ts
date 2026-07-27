import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";
import {
  recordSearchProviderRequest,
  resolveSearchProviderApiKey,
} from "@/lib/services/search-provider-service";

export interface SerpImageCandidate {
  title: string;
  imageUrl: string;
  sourceUrl: string | null;
  sourceHost: string;
  query: string;
  position: number;
  queryId?: string;
  queryGroup?: "name" | "alias" | "username";
  queryLabel?: string;
}

/** Default depth for reverse-image discovery (SerpAPI google_images pages). */
export const REVERSE_IMAGE_SERP_PAGES = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_PAGES ?? "3",
  10
);
export const REVERSE_IMAGE_SERP_NUM = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_NUM ?? "250",
  10
);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
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
          : 3),
      1
    ),
    5
  );
  const num = Math.min(
    Math.max(
      input.num ??
        (Number.isFinite(REVERSE_IMAGE_SERP_NUM)
          ? REVERSE_IMAGE_SERP_NUM
          : 250),
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
      };
      const imageUrl = (raw.original || hit.link || "").trim();
      const pageUrl = (raw.link || hit.link || "").trim() || null;
      return {
        title: hit.title,
        imageUrl,
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
        Accept: "image/*,*/*;q=0.8",
        "User-Agent":
          "SynSight-ReverseImage/1.0 (+https://synsight.de; security research)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength <= 512 || bytes.byteLength > 8 * 1024 * 1024) {
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
