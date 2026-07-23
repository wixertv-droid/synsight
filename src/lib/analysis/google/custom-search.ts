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

/**
 * Live Google search via the active SearchProvider (SerpAPI).
 */
export async function isGoogleSearchConfigured(): Promise<boolean> {
  return isSearchProviderConfigured("serpapi");
}

export async function fetchGoogleSearch(
  query: string
): Promise<GoogleSearchItem[]> {
  return searchViaActiveProvider(query);
}
