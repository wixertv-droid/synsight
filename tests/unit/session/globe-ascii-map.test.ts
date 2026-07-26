import { describe, expect, it } from "vitest";
import {
  GLOBE_MAP_HEIGHT,
  GLOBE_MAP_WIDTH,
  getGlobeAsciiMap,
  isLandCell,
} from "@/components/session/globe-ascii-map";

describe("globe ascii map", () => {
  it("is 120x45 with land cells", () => {
    const map = getGlobeAsciiMap();
    expect(map).toHaveLength(GLOBE_MAP_HEIGHT);
    expect(map[0]).toHaveLength(GLOBE_MAP_WIDTH);
    let land = 0;
    for (let y = 0; y < GLOBE_MAP_HEIGHT; y++) {
      for (let x = 0; x < GLOBE_MAP_WIDTH; x++) {
        if (isLandCell(map, x, y)) land += 1;
      }
    }
    expect(land).toBeGreaterThan(200);
  });
});
