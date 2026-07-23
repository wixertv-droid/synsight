import type {
  NormalizedSearchHit,
  SearchProvider,
  SearchProviderHealth,
  SearchProviderSearchOptions,
} from "@/lib/search/types";

interface SerpOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  source?: string;
}

interface SerpApiResponse {
  search_metadata?: {
    id?: string;
    status?: string;
    json_endpoint?: string;
    created_at?: string;
    processed_at?: string;
    google_url?: string;
    raw_html_file?: string;
    total_time_taken?: number;
  };
  search_parameters?: {
    engine?: string;
    q?: string;
  };
  organic_results?: SerpOrganicResult[];
  images_results?: Array<{
    position?: number;
    title?: string;
    link?: string;
    original?: string;
    source?: string;
    thumbnail?: string;
  }>;
  news_results?: Array<{
    position?: number;
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
  }>;
  error?: string;
}

function hostnameOf(link: string): string {
  try {
    return new URL(link).hostname;
  } catch {
    return "google";
  }
}

/**
 * SerpAPI Google Search provider.
 * Docs: https://serpapi.com/search-api
 */
export class SerpApiProvider implements SearchProvider {
  readonly id = "serpapi" as const;
  readonly label = "SerpAPI";

  constructor(private readonly apiKey: string) {}

  normalizeResults(raw: unknown): NormalizedSearchHit[] {
    const body = raw as SerpApiResponse;
    const organic = Array.isArray(body.organic_results)
      ? body.organic_results
      : [];

    const hits: NormalizedSearchHit[] = [];
    for (let index = 0; index < organic.length; index += 1) {
      const item = organic[index];
      const link = (item.link ?? "").trim();
      const title = (item.title ?? "").trim();
      if (!link || !title) continue;
      hits.push({
        title,
        link,
        snippet: (item.snippet ?? "").trim() || "—",
        displayLink:
          (item.displayed_link ?? item.source ?? hostnameOf(link)).trim() ||
          hostnameOf(link),
        source: item.source?.trim() || hostnameOf(link),
        position: item.position ?? index + 1,
        raw: item,
      });
    }
    return hits;
  }

  private async request(
    params: Record<string, string>
  ): Promise<{ body: SerpApiResponse; latencyMs: number }> {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("engine", params.engine || "google");
    for (const [key, value] of Object.entries(params)) {
      if (key === "engine") continue;
      if (value) url.searchParams.set(key, value);
    }

    const started = Date.now();
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    const body = (await response.json().catch(() => ({}))) as SerpApiResponse;

    if (!response.ok) {
      throw new Error(body.error || `SerpAPI HTTP ${response.status}`);
    }
    if (body.error) {
      throw new Error(body.error);
    }

    return { body, latencyMs };
  }

  async search(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]> {
    if (!query.trim()) return [];
    const { body } = await this.request({
      engine: "google",
      q: query.trim(),
      num: String(Math.min(Math.max(options?.num ?? 10, 1), 20)),
      hl: options?.language || "de",
      gl: options?.country || "de",
    });
    return this.normalizeResults(body);
  }

  async searchImages(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]> {
    if (!query.trim()) return [];
    const { body } = await this.request({
      engine: "google_images",
      q: query.trim(),
      num: String(Math.min(Math.max(options?.num ?? 10, 1), 20)),
      hl: options?.language || "de",
      gl: options?.country || "de",
    });
    const images = Array.isArray(body.images_results)
      ? body.images_results
      : [];
    const hits: NormalizedSearchHit[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      const link = (item.original || item.link || "").trim();
      const title = (item.title || "").trim() || `Bild ${index + 1}`;
      if (!link) continue;
      hits.push({
        title,
        link,
        snippet: item.source || "Bildtreffer",
        displayLink: item.source || hostnameOf(link),
        source: item.source || hostnameOf(link),
        position: item.position ?? index + 1,
        raw: item,
      });
    }
    return hits;
  }

  async searchNews(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]> {
    if (!query.trim()) return [];
    const { body } = await this.request({
      engine: "google_news",
      q: query.trim(),
      hl: options?.language || "de",
      gl: options?.country || "de",
    });
    const news = Array.isArray(body.news_results) ? body.news_results : [];
    const hits: NormalizedSearchHit[] = [];
    for (let index = 0; index < news.length; index += 1) {
      const item = news[index];
      const link = (item.link || "").trim();
      const title = (item.title || "").trim();
      if (!link || !title) continue;
      hits.push({
        title,
        link,
        snippet: (item.snippet || "").trim() || "—",
        displayLink: item.source || hostnameOf(link),
        source: item.source || hostnameOf(link),
        position: item.position ?? index + 1,
        raw: item,
      });
    }
    return hits;
  }

  async healthCheck(): Promise<SearchProviderHealth> {
    const started = Date.now();
    try {
      const { body, latencyMs } = await this.request({
        engine: "google",
        q: "SynSight",
        num: "3",
        hl: "de",
        gl: "de",
      });
      const hits = this.normalizeResults(body);
      const apiVersion =
        body.search_metadata?.status ||
        (typeof body.search_metadata?.total_time_taken === "number"
          ? `serpapi/${body.search_metadata.total_time_taken}s`
          : "serpapi");

      return {
        ok: true,
        provider: "serpapi",
        latencyMs,
        message: "Verbindung erfolgreich",
        detail: `${hits.length} Probe-Treffer`,
        apiVersion,
        googleSearchOnline: true,
      };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      const invalidKey = /invalid api key|unauthorized|forbidden/i.test(detail);
      const rateLimit = /rate limit|too many requests|429/i.test(detail);
      return {
        ok: false,
        provider: "serpapi",
        latencyMs: Date.now() - started,
        message: invalidKey
          ? "Ungültiger API-Key"
          : rateLimit
            ? "Rate Limit erreicht"
            : /fetch|network|enotfound|econnrefused/i.test(detail)
              ? "API nicht erreichbar"
              : "Unbekannter Fehler",
        detail,
        googleSearchOnline: false,
      };
    }
  }
}
