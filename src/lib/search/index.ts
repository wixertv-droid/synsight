import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";
import type { SearchProvider, SearchProviderId } from "@/lib/search/types";

export const SEARCH_PROVIDER_OPTIONS: Array<{
  id: SearchProviderId;
  label: string;
  available: boolean;
}> = [
  { id: "serpapi", label: "SerpAPI (Standard)", available: true },
  { id: "dataforseo", label: "DataForSEO", available: false },
  { id: "bing", label: "Bing Search", available: false },
  { id: "custom", label: "Custom Provider", available: false },
];

export function createSerpApiProvider(apiKey: string): SearchProvider {
  return new SerpApiProvider(apiKey);
}

/**
 * Factory — currently only SerpAPI is implemented.
 * Resolves the key via search-provider-service (lazy import avoids cycles).
 */
export async function getActiveSearchProvider(
  preferred: SearchProviderId = "serpapi"
): Promise<SearchProvider | null> {
  if (preferred !== "serpapi") {
    return null;
  }

  const { resolveSearchProviderApiKey } =
    await import("@/lib/services/search-provider-service");
  const apiKey = await resolveSearchProviderApiKey("serpapi");
  if (!apiKey) return null;
  return createSerpApiProvider(apiKey);
}
