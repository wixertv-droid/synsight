"use client";

import { useEffect, useRef } from "react";

const GLYPHS =
  "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン<>[]{}|/\\";

/**
 * Very subtle matrix rain for report gutters — low opacity, side-masked.
 */
export default function MatrixCodeField({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    let columns: number[] = [];
    let width = 0;
    let height = 0;
    const fontSize = 12;

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent?.clientWidth ?? window.innerWidth;
      height = parent?.clientHeight ?? window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const colCount = Math.max(8, Math.floor(width / fontSize));
      columns = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * (height / fontSize))
      );
    };

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const draw = () => {
      if (disposed) return;
      ctx.fillStyle = "rgba(2, 6, 12, 0.12)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

      for (let i = 0; i < columns.length; i += 1) {
        const x = i * fontSize;
        const edge = width * 0.18;
        if (x > edge && x < width - edge) {
          columns[i] = 0;
          continue;
        }

        const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0";
        const y = columns[i]! * fontSize;
        ctx.fillStyle =
          Math.random() > 0.92
            ? "rgba(160, 240, 255, 0.22)"
            : "rgba(80, 180, 210, 0.11)";
        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i] = columns[i]! + 1;
        }
      }

      if (!prefersReduced) {
        raf = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-[0.35] [mask-image:linear-gradient(90deg,black_0%,black_14%,transparent_22%,transparent_78%,black_86%,black_100%)]"
      />
    </div>
  );
}
