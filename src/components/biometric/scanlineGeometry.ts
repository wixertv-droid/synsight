import type { BiometricView } from "./BiometricAnimations";

type Span = { y: number; left: number; right: number };

/**
 * Hologram silhouette spans — human bust proportions.
 * Neck ≈ 45–55% of head width (no chess-pawn stem).
 * Profile nose projection kept modest.
 */
const SPANS: Record<BiometricView, Span[]> = {
  front: [
    { y: 28, left: 92, right: 108 },
    { y: 38, left: 74, right: 126 },
    { y: 52, left: 62, right: 138 },
    { y: 68, left: 54, right: 146 },
    { y: 84, left: 48, right: 152 },
    { y: 98, left: 46, right: 154 },
    { y: 112, left: 48, right: 152 },
    { y: 126, left: 54, right: 146 },
    { y: 140, left: 64, right: 136 },
    { y: 152, left: 74, right: 126 },
    { y: 162, left: 84, right: 116 },
    /* thick neck — continuous with jaw, soft trapezius */
    { y: 172, left: 86, right: 114 },
    { y: 186, left: 84, right: 116 },
    { y: 200, left: 82, right: 118 },
    { y: 214, left: 78, right: 122 },
    { y: 228, left: 70, right: 130 },
  ],

  left_profile: [
    { y: 30, left: 98, right: 124 },
    { y: 42, left: 88, right: 132 },
    { y: 56, left: 82, right: 136 },
    { y: 70, left: 78, right: 138 },
    { y: 82, left: 74, right: 138 },
    /* modest nose */
    { y: 92, left: 68, right: 137 },
    { y: 100, left: 64, right: 136 },
    { y: 106, left: 66, right: 135 },
    { y: 114, left: 70, right: 132 },
    { y: 124, left: 72, right: 128 },
    { y: 134, left: 74, right: 124 },
    { y: 146, left: 80, right: 120 },
    { y: 156, left: 88, right: 118 },
    { y: 164, left: 92, right: 118 },
    /* thick neck */
    { y: 176, left: 90, right: 122 },
    { y: 192, left: 88, right: 124 },
    { y: 208, left: 86, right: 126 },
    { y: 222, left: 80, right: 130 },
    { y: 232, left: 72, right: 136 },
  ],

  right_profile: [
    { y: 30, left: 76, right: 102 },
    { y: 42, left: 68, right: 112 },
    { y: 56, left: 64, right: 118 },
    { y: 70, left: 62, right: 122 },
    { y: 82, left: 62, right: 126 },
    { y: 92, left: 63, right: 132 },
    { y: 100, left: 64, right: 136 },
    { y: 106, left: 65, right: 134 },
    { y: 114, left: 68, right: 130 },
    { y: 124, left: 72, right: 128 },
    { y: 134, left: 76, right: 126 },
    { y: 146, left: 80, right: 120 },
    { y: 156, left: 82, right: 112 },
    { y: 164, left: 82, right: 108 },
    { y: 176, left: 78, right: 110 },
    { y: 192, left: 76, right: 112 },
    { y: 208, left: 74, right: 114 },
    { y: 222, left: 70, right: 120 },
    { y: 232, left: 64, right: 128 },
  ],

  angled: [
    { y: 28, left: 100, right: 126 },
    { y: 40, left: 82, right: 142 },
    { y: 54, left: 66, right: 154 },
    { y: 70, left: 56, right: 160 },
    { y: 86, left: 50, right: 162 },
    { y: 102, left: 50, right: 158 },
    { y: 118, left: 54, right: 150 },
    { y: 132, left: 62, right: 142 },
    { y: 146, left: 72, right: 132 },
    { y: 158, left: 82, right: 124 },
    { y: 168, left: 90, right: 118 },
    { y: 178, left: 88, right: 120 },
    { y: 194, left: 86, right: 122 },
    { y: 210, left: 82, right: 126 },
    { y: 224, left: 74, right: 132 },
    { y: 232, left: 66, right: 138 },
  ],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function spanAt(
  spans: Span[],
  y: number
): { left: number; right: number } | null {
  if (y < spans[0].y || y > spans[spans.length - 1].y) return null;
  for (let i = 0; i < spans.length - 1; i++) {
    const a = spans[i];
    const b = spans[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y || 1);
      return {
        left: lerp(a.left, b.left, t),
        right: lerp(a.right, b.right, t),
      };
    }
  }
  return null;
}

export type ScanSegment = {
  y: number;
  x1: number;
  x2: number;
  opacity: number;
  weight: number;
};

function splitForFeatures(
  view: BiometricView,
  y: number,
  left: number,
  right: number
): Array<{ x1: number; x2: number; opacity: number; weight: number }> {
  const baseOpacity = 0.58 + Math.min(0.28, (right - left) / 240);

  if (view === "front" && y >= 94 && y <= 110) {
    return [
      { x1: left, x2: 86, opacity: baseOpacity * 0.72, weight: 0.85 },
      {
        x1: 93,
        x2: 107,
        opacity: Math.min(0.95, baseOpacity + 0.12),
        weight: 1.05,
      },
      { x1: 114, x2: right, opacity: baseOpacity * 0.72, weight: 0.85 },
    ];
  }

  if (view === "front" && y >= 150 && y <= 160) {
    return [
      {
        x1: left,
        x2: right,
        opacity: Math.min(0.95, baseOpacity + 0.1),
        weight: 1,
      },
    ];
  }

  if (
    (view === "left_profile" || view === "right_profile") &&
    y >= 90 &&
    y <= 108
  ) {
    return [
      {
        x1: left,
        x2: right,
        opacity: Math.min(0.96, baseOpacity + 0.16),
        weight: 1.08,
      },
    ];
  }

  return [{ x1: left, x2: right, opacity: baseOpacity, weight: 0.92 }];
}

export function buildHologramScanlines(
  view: BiometricView,
  step = 1.7
): ScanSegment[] {
  const spans = SPANS[view];
  const lines: ScanSegment[] = [];

  for (let y = spans[0].y; y <= spans[spans.length - 1].y; y += step) {
    const span = spanAt(spans, y);
    if (!span || span.right - span.left < 5) continue;

    for (const part of splitForFeatures(view, y, span.left, span.right)) {
      if (part.x2 - part.x1 < 2.5) continue;
      lines.push({
        y: Math.round(y * 10) / 10,
        x1: part.x1,
        x2: part.x2,
        opacity: part.opacity,
        weight: part.weight,
      });
    }
  }

  return lines;
}

export function buildSilhouettePath(view: BiometricView): string {
  const spans = SPANS[view];
  const leftPts = spans.map((s) => `${s.left.toFixed(1)},${s.y}`);
  const rightPts = [...spans]
    .reverse()
    .map((s) => `${s.right.toFixed(1)},${s.y}`);
  return `M${leftPts[0]} L${leftPts.slice(1).join(" L")} L${rightPts.join(" L")} Z`;
}
