import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";
import {
  recordSearchProviderRequest,
  resolveSearchProviderApiKey,
} from "@/lib/services/search-provider-service";
import { enrichCandidateWithScore } from "@/lib/analysis/reverse-image/candidate-score";
import type {
  CandidateRiskBand,
  ImageKindHeuristic,
} from "@/lib/analysis/reverse-image/candidate-score";

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
  /** Heuristischer Relevanz-Score 0–100 */
  candidateScore?: number;
  imageKind?: ImageKindHeuristic;
  allowFaceCompare?: boolean;
  scoreReasons?: string[];
  riskBand?: CandidateRiskBand;
}

/**
 * Default-Max-Seiten wenn Plan keine `pages` setzt.
 * Adaptive Pagination stoppt früher bei wenigen Neu-Treffern.
 */
export const REVERSE_IMAGE_SERP_PAGES = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_PAGES ?? "3",
  10
);
export const REVERSE_IMAGE_SERP_NUM = Number.parseInt(
  process.env.REVERSE_IMAGE_SERP_NUM ?? "100",
  10
);
/** Stop weitere Seite wenn weniger als N neue URLs (nach Dedup). */
export const REVERSE_IMAGE_MIN_NEW_PER_PAGE = Number.parseInt(
  process.env.REVERSE_IMAGE_MIN_NEW_PER_PAGE ?? "15",
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
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
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

function mapHit(
  hit: {
    title: string;
    link: string;
    position?: number;
    raw?: unknown;
  },
  query: string,
  index: number
): SerpImageCandidate {
  const raw = (hit.raw ?? {}) as {
    link?: string;
    original?: string;
    thumbnail?: string;
  };
  const imageUrl = (raw.original || hit.link || "").trim();
  const pageUrl = (raw.link || hit.link || "").trim() || null;
  const thumbnailUrl = (raw.thumbnail || "").trim() || null;
  const base: SerpImageCandidate = {
    title: hit.title,
    imageUrl,
    thumbnailUrl,
    sourceUrl: pageUrl,
    sourceHost: hostOf(pageUrl || imageUrl),
    query,
    position: hit.position ?? index + 1,
  };
  return enrichCandidateWithScore(base);
}

/**
 * Adaptive Google-Images-Fetch:
 * Seite für Seite, stoppt wenn kaum neue URLs oder maxPages erreicht.
 * Finance: requestCount = tatsächlich geladene Seiten.
 */
export async function fetchGoogleImageCandidates(input: {
  query: string;
  num?: number;
  pages?: number;
  userId?: number;
  knownImageUrls?: Set<string>;
  minNewPerPage?: number;
}): Promise<{
  candidates: SerpImageCandidate[];
  pagesFetched: number;
}> {
  const apiKey = await resolveSearchProviderApiKey("serpapi");
  if (!apiKey || !input.query.trim()) {
    return { candidates: [], pagesFetched: 0 };
  }

  const provider = new SerpApiProvider(apiKey);
  const started = Date.now();
  const referenceKey = `serpapi-google_images:${Date.now()}`;
  const maxPages = Math.min(
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
          : 100),
      1
    ),
    100
  );
  const minNew =
    input.minNewPerPage ??
    (Number.isFinite(REVERSE_IMAGE_MIN_NEW_PER_PAGE)
      ? REVERSE_IMAGE_MIN_NEW_PER_PAGE
      : 15);

  const known = new Set(
    [...(input.knownImageUrls ?? [])].map((u) => u.trim().toLowerCase())
  );
  const candidates: SerpImageCandidate[] = [];
  let pagesFetched = 0;

  try {
    for (let ijn = 0; ijn < maxPages; ijn += 1) {
      const pageHits = await provider.searchImages(input.query, {
        num,
        ijn,
        knownImageUrls: known,
      });
      pagesFetched += 1;

      let newOnPage = 0;
      for (const hit of pageHits) {
        const mapped = mapHit(hit, input.query, candidates.length);
        if (!mapped.imageUrl) continue;
        const key = mapped.imageUrl.toLowerCase();
        if (known.has(key)) continue;
        known.add(key);
        candidates.push(mapped);
        newOnPage += 1;
      }

      if (pageHits.length === 0) break;
      // Seite 2+: stoppen wenn kaum Neuware
      if (ijn > 0 && newOnPage < minNew) break;
      if (newOnPage === 0) break;
    }

    await recordSearchProviderRequest({
      provider: "serpapi",
      ok: true,
      latencyMs: Date.now() - started,
      apiVersion: "serpapi/google_images",
      eventType: "reverse_image_search",
      query: input.query,
      referenceKey,
      userId: input.userId ?? null,
      requestCount: Math.max(1, pagesFetched),
      recordFinance: true,
    });

    return { candidates, pagesFetched };
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
      requestCount: Math.max(1, pagesFetched || 1),
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
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; SynSightBot/1.0; +https://synsight.de)",
      },
    });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!looksLikeImageBytes(bytes)) return null;
    if (bytes.byteLength < 64 || bytes.byteLength > 12_000_000) return null;
    return bytes;
  } catch {
    return null;
  }
}
