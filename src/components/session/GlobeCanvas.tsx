"use client";

import { useEffect, useRef } from "react";
import {
  GLOBE_MAP_HEIGHT,
  GLOBE_MAP_WIDTH,
  getGlobeAsciiMap,
  isLandCell,
} from "@/components/session/globe-ascii-map";
import styles from "./GlobeCanvas.module.css";

interface GlobeCanvasProps {
  /** Reveal target hotspots after panel 3 goes green. */
  showHotspots?: boolean;
  className?: string;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface NetNode {
  lon: number;
  lat: number;
}

interface Edge {
  a: number;
  b: number;
}

interface Packet {
  edge: number;
  t: number;
  speed: number;
}

/** Brand colors — match CyberGlobe / BrandLogo */
const NEON_CYAN = "#70e7ff";

const LINK_MAX_PX = 56;
const NODE_COUNT = 96;
const PACKET_COUNT = 36;
const HOTSPOT_COUNT = 8;

function mapToLonLat(mapX: number, mapY: number): { lon: number; lat: number } {
  const lon = (mapX / GLOBE_MAP_WIDTH) * Math.PI * 2 - Math.PI;
  const lat = (0.5 - mapY / GLOBE_MAP_HEIGHT) * Math.PI * 0.92;
  return { lon, lat };
}

function project(
  lon: number,
  lat: number,
  rot: number,
  cx: number,
  cy: number,
  radius: number
): Vec3 & { visible: boolean } {
  const x3 = Math.cos(lat) * Math.cos(lon + rot);
  const y3 = Math.sin(lat);
  const z3 = Math.cos(lat) * Math.sin(lon + rot);
  return {
    x: cx + x3 * radius,
    y: cy - y3 * radius,
    z: z3,
    visible: z3 > -0.02,
  };
}

function pickLandNodes(map: string[]): NetNode[] {
  const land: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < GLOBE_MAP_HEIGHT; y++) {
    for (let x = 0; x < GLOBE_MAP_WIDTH; x++) {
      if (isLandCell(map, x, y)) land.push({ x, y });
    }
  }
  if (land.length === 0) return [];

  const nodes: NetNode[] = [];
  const step = Math.max(1, Math.floor(land.length / NODE_COUNT));
  for (let i = 0; i < land.length && nodes.length < NODE_COUNT; i += step) {
    const cell = land[i];
    const { lon, lat } = mapToLonLat(cell.x + 0.5, cell.y + 0.5);
    nodes.push({ lon, lat });
  }
  return nodes;
}

function buildEdges(
  projected: Array<(Vec3 & { visible: boolean }) | null>
): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i];
    if (!a || !a.visible || a.z < 0.15) continue;
    let links = 0;
    for (let j = i + 1; j < projected.length && links < 4; j++) {
      const b = projected[j];
      if (!b || !b.visible || b.z < 0.15) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 8 && dist < LINK_MAX_PX) {
        edges.push({ a: i, b: j });
        links += 1;
      }
    }
  }
  return edges;
}

/** Quadratic screen-space arc between two projected points (CyberGlobe-like). */
function strokeArc(
  ctx: CanvasRenderingContext2D,
  a: Vec3,
  b: Vec3,
  cx: number,
  cy: number,
  lift: number
) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = mx - cx;
  const dy = my - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ctrlX = mx + (dx / len) * lift;
  const ctrlY = my + (dy / len) * lift;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
  ctx.stroke();
}

function pointOnArc(
  a: Vec3,
  b: Vec3,
  cx: number,
  cy: number,
  lift: number,
  t: number
): { x: number; y: number } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = mx - cx;
  const dy = my - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ctrlX = mx + (dx / len) * lift;
  const ctrlY = my + (dy / len) * lift;
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * ctrlX + t * t * b.x,
    y: u * u * a.y + 2 * u * t * ctrlY + t * t * b.y,
  };
}

export default function GlobeCanvas({
  showHotspots = false,
  className = "",
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hotspotsRef = useRef(showHotspots);

  useEffect(() => {
    hotspotsRef.current = showHotspots;
  }, [showHotspots]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const context = canvasEl.getContext("2d");
    if (!context) return;
    const ctx = context;
    const canvas = canvasEl;

    const map = getGlobeAsciiMap();
    const nodes = pickLandNodes(map);
    const packets: Packet[] = [];
    let edges: Edge[] = [];
    let rot = 0.55;
    let raf = 0;
    let last = performance.now();

    const hotspotIdx = Array.from({ length: HOTSPOT_COUNT }, (_, i) =>
      Math.floor((i * nodes.length) / HOTSPOT_COUNT)
    );

    function resize() {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function ensurePackets() {
      while (packets.length < PACKET_COUNT && edges.length > 0) {
        packets.push({
          edge: Math.floor(Math.random() * edges.length),
          t: Math.random(),
          speed: 0.22 + Math.random() * 0.4,
        });
      }
    }

    function drawGraticule(
      cx: number,
      cy: number,
      radius: number,
      rotation: number
    ) {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(41, 182, 246, 0.16)";

      // Parallels
      for (let i = -2; i <= 2; i++) {
        const lat = (i / 3) * (Math.PI / 2) * 0.85;
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= 64; s++) {
          const lon = (s / 64) * Math.PI * 2 - Math.PI;
          const p = project(lon, lat, rotation, cx, cy, radius);
          if (!p.visible) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }

      // Meridians
      for (let i = 0; i < 12; i++) {
        const lon = (i / 12) * Math.PI * 2 - Math.PI;
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= 48; s++) {
          const lat = (0.5 - s / 48) * Math.PI;
          const p = project(lon, lat, rotation, cx, cy, radius);
          if (!p.visible) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rot += dt * 0.11;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(w, h) * 0.36;

      ctx.clearRect(0, 0, w, h);

      // Soft outer atmosphere (CyberGlobe atmosphereColor #29b6f6)
      const atmos = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.78,
        cx,
        cy,
        radius * 1.42
      );
      atmos.addColorStop(0, "rgba(41, 182, 246, 0.22)");
      atmos.addColorStop(0.45, "rgba(41, 182, 246, 0.08)");
      atmos.addColorStop(1, "rgba(3, 5, 10, 0)");
      ctx.fillStyle = atmos;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.42, 0, Math.PI * 2);
      ctx.fill();

      // Globe body
      const body = ctx.createRadialGradient(
        cx - radius * 0.25,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      body.addColorStop(0, "rgba(18, 36, 58, 0.95)");
      body.addColorStop(0.7, "rgba(8, 14, 26, 0.98)");
      body.addColorStop(1, "rgba(4, 8, 16, 1)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // Rim
      ctx.strokeStyle = "rgba(112, 231, 255, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      drawGraticule(cx, cy, radius, rot);

      // Hex-dot landmasses (like three-globe hexPolygonUseDots)
      for (let y = 0; y < GLOBE_MAP_HEIGHT; y++) {
        for (let x = 0; x < GLOBE_MAP_WIDTH; x++) {
          if (!isLandCell(map, x, y)) continue;
          // Dot density similar to hex margin
          if ((x + y) % 2 !== 0) continue;
          const { lon, lat } = mapToLonLat(x + 0.5, y + 0.5);
          const p = project(lon, lat, rot, cx, cy, radius);
          if (!p.visible || p.z < 0.08) continue;
          const alpha = 0.35 + p.z * 0.55;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgba(92, 220, 252, 0.92)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.15 + p.z * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      const projected = nodes.map((node) => {
        const p = project(node.lon, node.lat, rot, cx, cy, radius);
        return p.visible ? p : null;
      });

      edges = buildEdges(projected);
      ensurePackets();

      // Atmosphere network arcs
      ctx.lineWidth = 0.85;
      for (const edge of edges) {
        const a = projected[edge.a];
        const b = projected[edge.b];
        if (!a || !b) continue;
        const lift = 10 + Math.hypot(a.x - b.x, a.y - b.y) * 0.22;
        ctx.strokeStyle = "rgba(41, 182, 246, 0.22)";
        strokeArc(ctx, a, b, cx, cy, lift);
      }

      // Nodes
      for (const p of projected) {
        if (!p || p.z < 0.12) continue;
        ctx.fillStyle = NEON_CYAN;
        ctx.globalAlpha = 0.35 + p.z * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Dashed data packets along arcs
      for (const packet of packets) {
        if (edges.length === 0) break;
        packet.edge %= edges.length;
        packet.t += packet.speed * dt;
        if (packet.t > 1) {
          packet.t = 0;
          packet.edge = Math.floor(Math.random() * edges.length);
          packet.speed = 0.22 + Math.random() * 0.4;
        }
        const edge = edges[packet.edge];
        if (!edge) continue;
        const a = projected[edge.a];
        const b = projected[edge.b];
        if (!a || !b) continue;
        const lift = 10 + Math.hypot(a.x - b.x, a.y - b.y) * 0.22;
        const pos = pointOnArc(a, b, cx, cy, lift, packet.t);

        // Trail
        for (let s = 0; s < 5; s++) {
          const tt = Math.max(0, packet.t - s * 0.035);
          const trail = pointOnArc(a, b, cx, cy, lift, tt);
          ctx.fillStyle = `rgba(112, 231, 255, ${0.45 - s * 0.08})`;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, 2.2 - s * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 6);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        glow.addColorStop(0.35, "rgba(112, 231, 255, 0.85)");
        glow.addColorStop(1, "rgba(41, 182, 246, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hotspot rings (like three-globe rings)
      if (hotspotsRef.current) {
        const pulse = (now / 1700) % 1;
        for (const idx of hotspotIdx) {
          const p = projected[idx];
          if (!p || p.z < 0.2) continue;
          const r = 4 + pulse * 14;
          ctx.strokeStyle = `rgba(255, 138, 92, ${1 - pulse})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(112, 231, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Inner specular highlight
      const shine = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.4,
        0,
        cx - radius * 0.35,
        cy - radius * 0.4,
        radius * 0.55
      );
      shine.addColorStop(0, "rgba(112, 231, 255, 0.08)");
      shine.addColorStop(1, "rgba(112, 231, 255, 0)");
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className}`}
      aria-hidden
    />
  );
}
