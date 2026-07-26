/**
 * Build a 120×45 ASCII world map. '#' = land, ' ' = ocean.
 * Continents are stamped as soft ellipses (stable, no external assets).
 */
export const GLOBE_MAP_WIDTH = 120;
export const GLOBE_MAP_HEIGHT = 45;

type ContinentStamp = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const CONTINENTS: ContinentStamp[] = [
  // North America
  { cx: 28, cy: 14, rx: 16, ry: 9 },
  { cx: 22, cy: 22, rx: 8, ry: 6 },
  // South America
  { cx: 36, cy: 30, rx: 8, ry: 11 },
  // Europe
  { cx: 58, cy: 12, rx: 8, ry: 5 },
  // Africa
  { cx: 60, cy: 24, rx: 10, ry: 12 },
  // Asia
  { cx: 78, cy: 14, rx: 18, ry: 10 },
  { cx: 88, cy: 22, rx: 10, ry: 7 },
  // Australia
  { cx: 96, cy: 32, rx: 8, ry: 5 },
  // Greenland
  { cx: 42, cy: 6, rx: 5, ry: 4 },
];

function stampLand(
  grid: string[][],
  stamp: ContinentStamp,
  fillChance = 0.92
): void {
  for (let y = 0; y < GLOBE_MAP_HEIGHT; y++) {
    for (let x = 0; x < GLOBE_MAP_WIDTH; x++) {
      const nx = (x - stamp.cx) / stamp.rx;
      const ny = (y - stamp.cy) / stamp.ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) {
        // Soft edge noise for coastlines
        const edge = d > 0.72;
        const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const keep = edge
          ? hash % 100 < fillChance * 55
          : hash % 100 < fillChance * 100;
        if (keep) grid[y][x] = "#";
      }
    }
  }
}

let cachedMap: string[] | null = null;

export function getGlobeAsciiMap(): string[] {
  if (cachedMap) return cachedMap;
  const grid = Array.from({ length: GLOBE_MAP_HEIGHT }, () =>
    Array.from({ length: GLOBE_MAP_WIDTH }, () => " ")
  );
  for (const continent of CONTINENTS) {
    stampLand(grid, continent);
  }
  cachedMap = grid.map((row) => row.join(""));
  return cachedMap;
}

export function isLandCell(map: string[], x: number, y: number): boolean {
  const row = map[y];
  if (!row) return false;
  return row[x] === "#";
}
