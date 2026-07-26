"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle node/edge network — same visual language as IntelligenceScanSequence,
 * tuned for a quiet radar backdrop (low opacity, always on).
 */
export default function RadarNetworkBackdrop({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }> = [];
    let raf = 0;
    let frame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 640;
      const h = parent?.clientHeight ?? 320;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nodes.length === 0) {
        const count = Math.max(28, Math.floor((w * h) / 9000));
        for (let i = 0; i < count; i += 1) {
          nodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: 1 + Math.random() * 1.6,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      frame += 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

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
          if (dist < 96) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 * (1 - dist / 96)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.fillStyle = "rgba(125, 211, 252, 0.45)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const sweepX = ((frame * 1.6) % (w + 100)) - 50;
      const grad = ctx.createLinearGradient(sweepX - 50, 0, sweepX + 50, 0);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.07)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 50, 0, 100, h);

      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 opacity-[0.55] ${className}`}
      aria-hidden="true"
    />
  );
}
