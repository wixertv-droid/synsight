import { describe, expect, it } from "vitest";
import {
  createEmptySerpCheckpoint,
  isCandidateProcessed,
  markCandidateProcessed,
  remainingCompareCandidates,
  resetCheckpointForCompare,
  setSelectedImageUrls,
} from "@/lib/analysis/reverse-image/serp-checkpoint";

describe("reverse-image compare checkpoint", () => {
  it("resumes from unprocessed selected candidates only", () => {
    let checkpoint = createEmptySerpCheckpoint([]);
    checkpoint = {
      ...checkpoint,
      serpFetchComplete: true,
      phase: "discovery_complete",
      candidates: [
        {
          title: "A",
          imageUrl: "https://cdn.example/a.jpg",
          sourceUrl: null,
          sourceHost: "x",
          query: "q",
          position: 1,
        },
        {
          title: "B",
          imageUrl: "https://cdn.example/b.jpg",
          sourceUrl: null,
          sourceHost: "x",
          query: "q",
          position: 2,
        },
      ],
    };
    checkpoint = setSelectedImageUrls(checkpoint, [
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.jpg",
    ]);
    checkpoint = resetCheckpointForCompare(
      checkpoint,
      checkpoint.selectedImageUrls
    );
    checkpoint = markCandidateProcessed(
      checkpoint,
      "https://cdn.example/a.jpg"
    );

    expect(isCandidateProcessed(checkpoint, checkpoint.candidates[0])).toBe(
      true
    );
    expect(remainingCompareCandidates(checkpoint)).toHaveLength(1);
  });
});
