import { describe, expect, it } from "vitest";
import { readImageUploadError } from "@/lib/media/prepare-upload-image";
import {
  ANALYSIS_MAX_PIXELS,
  CLIENT_UPLOAD_TARGET_BYTES,
  MAX_UPLOAD_BYTES,
} from "@/lib/media/image-limits";

describe("prepare upload image helpers", () => {
  it("keeps analysis-ready size limits under proxy-friendly upload targets", () => {
    expect(ANALYSIS_MAX_PIXELS).toBe(1600);
    expect(CLIENT_UPLOAD_TARGET_BYTES).toBeLessThanOrEqual(1024 * 1024);
    expect(CLIENT_UPLOAD_TARGET_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
  });

  it("maps 413 and JSON API errors for the UI", async () => {
    const tooLarge = await readImageUploadError(
      new Response("entity too large", { status: 413 })
    );
    expect(tooLarge).toMatch(/zu groß/i);

    const api = await readImageUploadError(
      new Response(
        JSON.stringify({
          success: false,
          error: { message: "Nur JPG erlaubt." },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    expect(api).toBe("Nur JPG erlaubt.");
  });
});
