"use client";

import { useEffect, useRef } from "react";

const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789<>[]{}|/\\*+=#";

/**
 * Classic Matrix rain — only on the right gutter, faint, top → bottom.
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
    let drops: number[] = [];
    let width = 0;
    let height = 0;
    const fontSize = 14;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      width = canvas.clientWidth || 180;
      height = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const colCount = Math.max(6, Math.floor(width / fontSize));
      drops = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * -40)
      );
    };

    const draw = () => {
      if (disposed) return;

      // Trail fade — keeps falling columns readable
      ctx.fillStyle = "rgba(3, 8, 14, 0.18)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

      for (let i = 0; i < drops.length; i += 1) {
        const x = i * fontSize;
        const y = drops[i]! * fontSize;
        const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0";

        // Bright head
        ctx.fillStyle = "rgba(190, 255, 210, 0.55)";
        ctx.fillText(char, x, y);

        // Soft body trail above
        ctx.fillStyle = "rgba(40, 200, 90, 0.28)";
        const trail = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "1";
        ctx.fillText(trail, x, y - fontSize);

        ctx.fillStyle = "rgba(20, 140, 60, 0.16)";
        const deeper = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0";
        ctx.fillText(deeper, x, y - fontSize * 2);

        if (y > height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -20);
        } else {
          drops[i] = drops[i]! + 1;
        }
      }

      if (!prefersReduced) {
        raf = window.requestAnimationFrame(draw);
      }
    };

    resize();
    // Seed a dark base so first frames aren't blank
    ctx.fillStyle = "rgba(3, 8, 14, 1)";
    ctx.fillRect(0, 0, width, height);
    draw();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[9.5rem] overflow-hidden xl:block 2xl:w-[11rem] ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full opacity-[0.55]" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#03070e]/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#03070e]/40 via-transparent to-[#03070e]/50" />
    </div>
  );
}
