/**
 * Pure data model for the hero globe.
 *
 * Extracted out of `CyberGlobe.tsx` so the WebGL scene setup, the render
 * loop, and the HUD overlay can each depend only on the shapes they need
 * without touching Three.js. Nothing in this file imports `three`.
 */

export interface GlobeCoordinate {
  lat: number;
  lng: number;
}

export interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
}

export interface PointDatum extends GlobeCoordinate {
  color: string;
  radius: number;
  altitude: number;
}

export interface LabelDatum extends GlobeCoordinate {
  text: string;
  color: string;
}

export interface ScanLocation extends GlobeCoordinate {
  name: string;
}

export const networkLocations: GlobeCoordinate[] = [
  { lat: 52.52, lng: 13.405 },
  { lat: 51.5072, lng: -0.1276 },
  { lat: 48.8566, lng: 2.3522 },
  { lat: 40.4168, lng: -3.7038 },
  { lat: 41.9028, lng: 12.4964 },
  { lat: 50.1109, lng: 8.6821 },
  { lat: 30.0444, lng: 31.2357 },
  { lat: 6.5244, lng: 3.3792 },
  { lat: -1.2921, lng: 36.8219 },
  { lat: -26.2041, lng: 28.0473 },
  { lat: 25.2048, lng: 55.2708 },
  { lat: 40.7128, lng: -74.006 },
  { lat: -23.5505, lng: -46.6333 },
  { lat: 1.3521, lng: 103.8198 },
];

export const liveDataNodes: GlobeCoordinate[] = [
  ...networkLocations,
  ...Array.from({ length: 58 }, (_, index) => ({
    lat: -58 + ((index * 47 + 11) % 116),
    lng: -176 + ((index * 83 + 29) % 352),
  })),
];

export const scanLocations: ScanLocation[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "London", lat: 51.5072, lng: -0.1276 },
  { name: "Gera", lat: 50.8779, lng: 12.0812 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
];

export const arcs: ArcDatum[] = liveDataNodes.flatMap((location, index) => {
  const next = liveDataNodes[(index + 7) % liveDataNodes.length];
  const cross = liveDataNodes[(index + 19) % liveDataNodes.length];
  return [
    {
      startLat: location.lat,
      startLng: location.lng,
      endLat: next.lat,
      endLng: next.lng,
      color: ["rgba(36,111,210,.2)", "rgba(112,231,255,.8)"],
    },
    {
      startLat: location.lat,
      startLng: location.lng,
      endLat: cross.lat,
      endLng: cross.lng,
      color: ["rgba(21,74,167,.16)", "rgba(41,182,246,.48)"],
    },
    {
      startLat: cross.lat,
      startLng: cross.lng,
      endLat: location.lat,
      endLng: location.lng,
      color: ["rgba(32,91,196,.12)", "rgba(126,233,255,.58)"],
    },
  ];
});

export const points: PointDatum[] = [
  ...liveDataNodes.map((location, index) => ({
    ...location,
    color: index % 4 === 0 ? "#b8f5ff" : "#52d4ff",
    radius: index % 7 === 0 ? 0.4 : 0.2,
    altitude: index % 5 === 0 ? 0.017 : 0.011,
  })),
  {
    lat: -18.5,
    lng: -8.2,
    color: "#ffb04d",
    radius: 0.62,
    altitude: 0.018,
  },
];

export const labels: LabelDatum[] = [
  {
    lat: 52.52,
    lng: 13.405,
    text: "IDENTITY CLONE FOUND",
    color: "rgba(126,233,255,.9)",
  },
  {
    lat: 51.5072,
    lng: -0.1276,
    text: "BREACH VORTEX DETECTED",
    color: "rgba(255,137,108,.9)",
  },
];

export const hotspotRings: GlobeCoordinate[] = [
  { lat: -18.5, lng: -8.2 },
  { lat: 48.8566, lng: 2.3522 },
];
