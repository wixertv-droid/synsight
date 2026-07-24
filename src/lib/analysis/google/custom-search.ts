import {
  isSearchProviderConfigured,
  searchViaActiveProvider,
} from "@/lib/services/search-provider-service";

export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface FetchGoogleSearchOptions {
  /** When false, only provider metrics are updated (analysis records finance once). */
  recordFinance?: boolean;
  userId?: number | null;
  referenceKey?: string | null;
  /** SerpAPI engine — google (default) or bing */
  engine?: "google" | "bing";
}

/**
 * Live search via the active SearchProvider (SerpAPI Google/Bing).
 */
export async function isGoogleSearchConfigured(): Promise<boolean> {
  return isSearchProviderConfigured("serpapi");
}

export async function fetchGoogleSearch(
  query: string,
  options?: FetchGoogleSearchOptions
): Promise<GoogleSearchItem[]> {
  return searchViaActiveProvider(query, {
    recordFinance: options?.recordFinance,
    userId: options?.userId,
    referenceKey: options?.referenceKey,
    eventType: "search",
    engine: options?.engine ?? "google",
  });
}
