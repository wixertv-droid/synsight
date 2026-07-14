/**
 * Small numeric/geometry helpers for the hero globe animation. Pure
 * functions only — no Three.js imports, no DOM access — so they stay easy
 * to unit test independently of the WebGL scene setup in `CyberGlobe.tsx`.
 */

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
