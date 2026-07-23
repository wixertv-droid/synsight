/**
 * Search provider abstraction — Google analysis talks only to this interface.
 */

export type SearchProviderId = "serpapi" | "dataforseo" | "bing" | "custom";

export interface NormalizedSearchHit {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  source: string;
  position?: number;
  raw?: unknown;
}

export interface SearchProviderHealth {
  ok: boolean;
  provider: SearchProviderId;
  latencyMs: number;
  message: string;
  detail?: string;
  apiVersion?: string | null;
  googleSearchOnline?: boolean;
}

export interface SearchProviderSearchOptions {
  num?: number;
  language?: string;
  country?: string;
}

export interface SearchProvider {
  readonly id: SearchProviderId;
  readonly label: string;
  search(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]>;
  searchImages(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]>;
  searchNews(
    query: string,
    options?: SearchProviderSearchOptions
  ): Promise<NormalizedSearchHit[]>;
  healthCheck(): Promise<SearchProviderHealth>;
  normalizeResults(raw: unknown): NormalizedSearchHit[];
}
