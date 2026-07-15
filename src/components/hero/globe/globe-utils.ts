/**
 * Small numeric/geometry helpers for the hero globe animation. Pure
 * functions only — no Three.js imports, no DOM access — so they stay easy
 * to unit test independently of the WebGL scene setup in `CyberGlobe.tsx`.
 */

import { polygonToCells } from "h3-js";
import type {
  ArcDatum,
  GlobeCoordinate,
  LabelDatum,
  PointDatum,
  ScanLocation,
} from "@/components/hero/globe/globe-data";

/**
 * Distributes `count` points roughly evenly across a spherical shell using
 * a Fibonacci sphere layout, returning a flat `[x, y, z, x, y, z, ...]`
 * array ready for a Three.js `BufferAttribute`.
 */
export function createHaloParticles(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const phi = Math.acos(2 * ((index + 0.5) / count) - 1);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    const radius = 108 + ((index * 17) % 18);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
}

/** True when lat/lng are finite numbers inside the geographic bounds. */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function sanitizeCoordinates<T extends GlobeCoordinate>(
  entries: T[] | null | undefined
): T[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => isValidLatLng(entry?.lat, entry?.lng));
}

export function sanitizePoints(
  entries: PointDatum[] | null | undefined
): PointDatum[] {
  return sanitizeCoordinates(entries).filter(
    (entry) =>
      Number.isFinite(entry.radius) &&
      Number.isFinite(entry.altitude) &&
      entry.radius > 0
  );
}

export function sanitizeArcs(entries: ArcDatum[] | null | undefined): ArcDatum[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      isValidLatLng(entry?.startLat, entry?.startLng) &&
      isValidLatLng(entry?.endLat, entry?.endLng)
  );
}

export function sanitizeLabels(
  entries: LabelDatum[] | null | undefined
): LabelDatum[] {
  return sanitizeCoordinates(entries).filter(
    (entry) => typeof entry.text === "string" && entry.text.length > 0
  );
}

export function sanitizeScanLocations(
  entries: ScanLocation[] | null | undefined
): ScanLocation[] {
  return sanitizeCoordinates(entries);
}

type GeoPosition = [number, number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];

function isValidPosition(position: unknown): position is GeoPosition {
  if (!Array.isArray(position) || position.length < 2) return false;
  const [lng, lat] = position;
  return isValidLatLng(lat, lng);
}

/** Reject rings that jump across the antimeridian — those crash h3-js. */
function ringCrossesAntimeridian(ring: GeoRing): boolean {
  for (let index = 1; index < ring.length; index++) {
    if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) {
      return true;
    }
  }
  return false;
}

function sanitizeRing(ring: unknown): GeoRing | null {
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const cleaned: GeoRing = [];
  for (const position of ring) {
    if (!isValidPosition(position)) return null;
    cleaned.push([position[0], position[1]]);
  }
  if (ringCrossesAntimeridian(cleaned)) return null;
  return cleaned;
}

function sanitizePolygon(polygon: unknown): GeoPolygon | null {
  if (!Array.isArray(polygon) || polygon.length === 0) return null;
  const rings: GeoPolygon = [];
  for (const ring of polygon) {
    const cleaned = sanitizeRing(ring);
    if (!cleaned) {
      // Outer ring must be valid; skip holes that fail.
      if (rings.length === 0) return null;
      continue;
    }
    rings.push(cleaned);
  }
  return rings.length > 0 ? rings : null;
}

function isAntarcticPolygon(polygon: GeoPolygon): boolean {
  let sum = 0;
  let count = 0;
  for (const ring of polygon) {
    for (const [, lat] of ring) {
      sum += lat;
      count += 1;
    }
  }
  return count > 0 && sum / count < -55;
}

/** Prove a GeoJSON polygon ring set survives h3-js (used by three-globe). */
function isH3CompatiblePolygon(polygon: GeoPolygon, resolution: number): boolean {
  try {
    polygonToCells(polygon, resolution, true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepare country GeoJSON for three-globe → h3-js `polygonToCells`.
 * Drops Antarctica, antimeridian-crossing shapes, invalid coordinates, and
 * any polygon that still throws `H3LibraryError` (code 1).
 */
export function sanitizeCountryFeatures(
  features: GeoJSON.Feature[] | null | undefined,
  resolution = 2
): GeoJSON.Feature[] {
  if (!Array.isArray(features)) return [];

  const sanitized: GeoJSON.Feature[] = [];

  for (const featureEntry of features) {
    const geometry = featureEntry?.geometry;
    if (!geometry) continue;

    if (geometry.type === "Polygon") {
      const polygon = sanitizePolygon(geometry.coordinates);
      if (
        !polygon ||
        isAntarcticPolygon(polygon) ||
        !isH3CompatiblePolygon(polygon, resolution)
      ) {
        continue;
      }
      sanitized.push({
        type: "Feature",
        properties: featureEntry.properties ?? {},
        geometry: { type: "Polygon", coordinates: polygon },
      });
      continue;
    }

    if (geometry.type === "MultiPolygon") {
      const polygons: GeoPolygon[] = [];
      for (const candidate of geometry.coordinates) {
        const polygon = sanitizePolygon(candidate);
        if (
          !polygon ||
          isAntarcticPolygon(polygon) ||
          !isH3CompatiblePolygon(polygon, resolution)
        ) {
          continue;
        }
        polygons.push(polygon);
      }
      if (polygons.length === 0) continue;

      if (polygons.length === 1) {
        sanitized.push({
          type: "Feature",
          properties: featureEntry.properties ?? {},
          geometry: { type: "Polygon", coordinates: polygons[0] },
        });
      } else {
        sanitized.push({
          type: "Feature",
          properties: featureEntry.properties ?? {},
          geometry: { type: "MultiPolygon", coordinates: polygons },
        });
      }
    }
  }

  return sanitized;
}
