"use client";

import { useEffect, useRef } from "react";

/**
 * Same living entity-graph canvas used in the OSINT Recon Matrix
 * (`IntelligenceScanSequence`) — node swarm + proximity edges + sweep.
 */
export default function EntityGraphCanvas({
  className = "",
  height = 140,
  nodeCount = 42,
  running = true,
}: {
  className?: string;
  height?: number;
  nodeCount?: number;
  running?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; r: number }>
  >([]);

  useEffect(() => {
    if (!running) {
      nodesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 320;
      const h = height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodesRef.current.length === 0) {
        nodesRef.current = Array.from({ length: nodeCount }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.15,
          vy: (Math.random() - 0.5) * 1.15,
          r: 1.2 + Math.random() * 2.2,
        }));
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      frame += 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const nodes = nodesRef.current;
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.22 * (1 - dist / 90)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.fillStyle = "rgba(125, 211, 252, 0.9)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const sweepX = ((frame * 4) % (w + 80)) - 40;
      const grad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.14)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 40, 0, 80, h);

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [running, height, nodeCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full ${className}`}
      aria-hidden="true"
    />
  );
}
