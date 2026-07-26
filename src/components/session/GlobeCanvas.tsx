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

interface Vec2 {
  x: number;
  y: number;
}

interface NetNode {
  mapX: number;
  mapY: number;
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

const LINK_MAX_PX = 48;
const NODE_COUNT = 72;
const PACKET_COUNT = 28;
const HOTSPOT_COUNT = 7;

function mapToLonLat(mapX: number, mapY: number): { lon: number; lat: number } {
  const lon = (mapX / GLOBE_MAP_WIDTH) * Math.PI * 2 - Math.PI;
  const lat = (0.5 - mapY / GLOBE_MAP_HEIGHT) * Math.PI;
  return { lon, lat };
}

function project(
  lon: number,
  lat: number,
  rot: number,
  cx: number,
  cy: number,
  radius: number
): { x: number; y: number; z: number; visible: boolean } {
  const x3 = Math.cos(lat) * Math.cos(lon + rot);
  const y3 = Math.sin(lat);
  const z3 = Math.cos(lat) * Math.sin(lon + rot);
  return {
    x: cx + x3 * radius,
    y: cy - y3 * radius,
    z: z3,
    visible: z3 > -0.05,
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
    nodes.push({ mapX: cell.x, mapY: cell.y, lon, lat });
  }
  return nodes;
}

function buildEdges(projected: Array<Vec2 | null>): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i];
    if (!a) continue;
    for (let j = i + 1; j < projected.length; j++) {
      const b = projected[j];
      if (!b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < LINK_MAX_PX) {
        edges.push({ a: i, b: j });
      }
    }
  }
  return edges;
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
    let rot = 0.35;
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
          speed: 0.18 + Math.random() * 0.35,
        });
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rot += dt * 0.12;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w * 0.5;
      const cy = h * 0.52;
      const radius = Math.min(w, h) * 0.34;

      ctx.clearRect(0, 0, w, h);

      // Atmosphere glow
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.2,
        cx,
        cy,
        radius * 1.35
      );
      glow.addColorStop(0, "rgba(29, 210, 255, 0.08)");
      glow.addColorStop(0.55, "rgba(14, 23, 38, 0.15)");
      glow.addColorStop(1, "rgba(7, 12, 20, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Globe disc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 16, 28, 0.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(29, 210, 255, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Land points (ASCII projection)
      ctx.fillStyle = "rgba(148, 178, 210, 0.55)";
      for (let y = 0; y < GLOBE_MAP_HEIGHT; y++) {
        for (let x = 0; x < GLOBE_MAP_WIDTH; x++) {
          if (!isLandCell(map, x, y)) continue;
          const { lon, lat } = mapToLonLat(x + 0.5, y + 0.5);
          const p = project(lon, lat, rot, cx, cy, radius);
          if (!p.visible || p.z < 0.05) continue;
          const alpha = 0.25 + p.z * 0.55;
          ctx.globalAlpha = alpha;
          ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.5, 1.5);
        }
      }
      ctx.globalAlpha = 1;

      // Project network nodes
      const projected: Array<Vec2 | null> = nodes.map((node) => {
        const p = project(node.lon, node.lat, rot, cx, cy, radius);
        if (!p.visible || p.z < 0.12) return null;
        return { x: p.x, y: p.y };
      });

      edges = buildEdges(projected);
      ensurePackets();

      // Atmosphere net
      ctx.lineWidth = 0.7;
      for (const edge of edges) {
        const a = projected[edge.a];
        const b = projected[edge.b];
        if (!a || !b) continue;
        ctx.strokeStyle = "rgba(29, 210, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Nodes
      for (const p of projected) {
        if (!p) continue;
        ctx.fillStyle = "rgba(29, 210, 255, 0.55)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Data packets
      for (const packet of packets) {
        if (edges.length === 0) break;
        packet.edge %= edges.length;
        packet.t += packet.speed * dt;
        if (packet.t > 1) {
          packet.t = 0;
          packet.edge = Math.floor(Math.random() * edges.length);
          packet.speed = 0.18 + Math.random() * 0.35;
        }
        const edge = edges[packet.edge];
        if (!edge) continue;
        const a = projected[edge.a];
        const b = projected[edge.b];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * packet.t;
        const y = a.y + (b.y - a.y) * packet.t;
        const pulse = ctx.createRadialGradient(x, y, 0, x, y, 4.5);
        pulse.addColorStop(0, "rgba(0, 255, 136, 0.95)");
        pulse.addColorStop(0.4, "rgba(29, 210, 255, 0.7)");
        pulse.addColorStop(1, "rgba(29, 210, 255, 0)");
        ctx.fillStyle = pulse;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hotspots after panel 3 secured
      if (hotspotsRef.current) {
        const pulse = 0.55 + Math.sin(now / 280) * 0.35;
        for (const idx of hotspotIdx) {
          const p = projected[idx];
          if (!p) continue;
          ctx.strokeStyle = `rgba(255, 42, 85, ${0.35 + pulse * 0.45})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(255, 42, 85, ${0.55 + pulse * 0.35})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

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
