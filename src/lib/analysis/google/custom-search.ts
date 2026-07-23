import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGoogleSearchCredentials,
} from "@/lib/services/api-credentials-service";

export interface GoogleCustomSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface GoogleCustomSearchResult {
  items: GoogleCustomSearchItem[];
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
  };
}

export async function isGoogleCustomSearchConfigured(): Promise<boolean> {
  return Boolean(await resolveGoogleSearchCredentials());
}

/**
 * Executes a single Google Custom Search JSON API request.
 * Credentials: Admin DB first, then env fallback.
 * Returns only fields delivered by the API — empty array when not configured or on error.
 */
export async function fetchGoogleCustomSearch(
  query: string
): Promise<GoogleCustomSearchItem[]> {
  const credentials = await resolveGoogleSearchCredentials();
  if (!credentials || !query.trim()) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", credentials.apiKey);
  url.searchParams.set("cx", credentials.engineId);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("safe", "active");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[google-custom-search] HTTP", response.status, detail);
      await markApiCredentialError(
        "google_custom_search",
        `HTTP ${response.status}: ${detail.slice(0, 200)}`
      );
      return [];
    }

    const body = (await response.json()) as GoogleCustomSearchResult;
    await markApiCredentialSuccess("google_custom_search");
    return (body.items ?? []).map((item) => ({
      title: item.title?.trim() ?? "",
      link: item.link?.trim() ?? "",
      snippet: item.snippet?.trim() ?? "",
      displayLink: item.displayLink?.trim() ?? "",
    }));
  } catch (error) {
    console.error("[google-custom-search] fetch failed", error);
    await markApiCredentialError(
      "google_custom_search",
      error instanceof Error ? error.message : "fetch failed"
    );
    return [];
  }
}
