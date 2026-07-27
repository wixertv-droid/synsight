import { describe, expect, it } from "vitest";
import {
  createEmptySerpCheckpoint,
  isCandidateProcessed,
  markCandidateProcessed,
  markQueryFetched,
  remainingCandidates,
  scanWorkRemaining,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
import type { SerpImageCandidate } from "@/lib/analysis/reverse-image/serpapi-images";

function candidate(url: string, query = "test"): SerpImageCandidate {
  return {
    title: "Example",
    imageUrl: url,
    sourceUrl: "https://example.com/page",
    sourceHost: "example.com",
    query,
    position: 1,
  };
}

describe("reverse-image serp checkpoint", () => {
  it("tracks fetched queries without duplicate SerpAPI calls", () => {
    const checkpoint = createEmptySerpCheckpoint([
      { id: "name", label: "Name", query: '"Max"' },
      { id: "user-0", label: "User", query: '"max99"' },
    ]);

    const afterFirst = markQueryFetched(
      checkpoint,
      "name",
      [candidate("https://cdn.example/a.jpg")],
      12
    );
    expect(afterFirst.completedQueryIds).toEqual(["name"]);
    expect(afterFirst.serpFetchComplete).toBe(false);

    const afterSecond = markQueryFetched(
      afterFirst,
      "user-0",
      [candidate("https://cdn.example/b.jpg")],
      12
    );
    expect(afterSecond.completedQueryIds).toEqual(["name", "user-0"]);
    expect(afterSecond.serpFetchComplete).toBe(true);
    expect(afterSecond.candidates).toHaveLength(2);
  });

  it("dedupes candidates by image URL", () => {
    let checkpoint = createEmptySerpCheckpoint([
      { id: "name", label: "Name", query: '"Max"' },
    ]);
    checkpoint = markQueryFetched(
      checkpoint,
      "name",
      [
        candidate("https://cdn.example/a.jpg"),
        candidate("https://cdn.example/a.jpg"),
      ],
      12
    );
    expect(checkpoint.candidates).toHaveLength(1);
  });

  it("resumes from unprocessed candidates only", () => {
    let checkpoint = createEmptySerpCheckpoint([
      { id: "name", label: "Name", query: '"Max"' },
    ]);
    checkpoint = markQueryFetched(
      checkpoint,
      "name",
      [
        candidate("https://cdn.example/a.jpg"),
        candidate("https://cdn.example/b.jpg"),
        candidate("https://cdn.example/c.jpg"),
      ],
      12
    );
    checkpoint = markCandidateProcessed(
      checkpoint,
      "https://cdn.example/a.jpg"
    );
    checkpoint = markCandidateProcessed(
      checkpoint,
      "https://cdn.example/b.jpg"
    );

    expect(
      isCandidateProcessed(checkpoint, candidate("https://cdn.example/a.jpg"))
    ).toBe(true);
    expect(remainingCandidates(checkpoint)).toHaveLength(1);
    expect(scanWorkRemaining(checkpoint)).toBe(true);

    checkpoint = markCandidateProcessed(
      checkpoint,
      "https://cdn.example/c.jpg"
    );
    expect(scanWorkRemaining(checkpoint)).toBe(false);
  });
});
