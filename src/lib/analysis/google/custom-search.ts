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

export function isGoogleCustomSearchConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() &&
    process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim()
  );
}

/**
 * Executes a single Google Custom Search JSON API request.
 * Returns only fields delivered by the API — empty array when not configured or on error.
 */
export async function fetchGoogleCustomSearch(
  query: string
): Promise<GoogleCustomSearchItem[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();
  if (!apiKey || !cx || !query.trim()) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
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
      console.error(
        "[google-custom-search] HTTP",
        response.status,
        await response.text().catch(() => "")
      );
      return [];
    }

    const body = (await response.json()) as GoogleCustomSearchResult;
    return (body.items ?? []).map((item) => ({
      title: item.title?.trim() ?? "",
      link: item.link?.trim() ?? "",
      snippet: item.snippet?.trim() ?? "",
      displayLink: item.displayLink?.trim() ?? "",
    }));
  } catch (error) {
    console.error("[google-custom-search] fetch failed", error);
    return [];
  }
}
