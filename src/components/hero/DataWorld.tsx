"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulse: number;
}

export default function DataWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let nodes: Node[] = [];
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initNodes();
    };

    const initNodes = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      nodes = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const drawEarth = (w: number, h: number) => {
      const cx = w * 0.72;
      const cy = h * 0.45;
      const r = Math.min(w, h) * 0.22;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, "rgba(0, 191, 255, 0.15)");
      gradient.addColorStop(0.5, "rgba(0, 100, 180, 0.08)");
      gradient.addColorStop(1, "rgba(0, 50, 100, 0.02)");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 191, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Latitude lines
      for (let i = -2; i <= 2; i++) {
        const latR = r * Math.cos((i * Math.PI) / 6);
        const latY = cy + (i * r) / 3;
        ctx.beginPath();
        ctx.ellipse(cx, latY, latR, latR * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.08)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Longitude lines
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + time * 0.001;
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          r * Math.abs(Math.cos(angle)),
          r,
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = "rgba(0, 255, 255, 0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Scanner sweep
      const scanAngle = time * 0.002;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, scanAngle, scanAngle + 0.4);
      ctx.closePath();
      const scanGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      scanGrad.addColorStop(0, "rgba(0, 255, 255, 0.15)");
      scanGrad.addColorStop(1, "rgba(0, 255, 255, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fill();

      return { cx, cy, r };
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      time++;

      const earth = drawEarth(w, h);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.02;

        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;

        const alpha = 0.3 + Math.sin(node.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 191, 255, ${alpha})`;
        ctx.fill();

        // Connect nearby nodes
        nodes.slice(i + 1).forEach((other) => {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 191, 255, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // Connect to earth
        const edx = node.x - earth.cx;
        const edy = node.y - earth.cy;
        const edist = Math.sqrt(edx * edx + edy * edy);
        if (edist < earth.r + 80) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          const angle = Math.atan2(edy, edx);
          const ex = earth.cx + Math.cos(angle) * earth.r;
          const ey = earth.cy + Math.sin(angle) * earth.r;
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.15 * (1 - edist / (earth.r + 80))})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // Floating panels
      const panels = [
        { x: w * 0.15, y: h * 0.2, w: 100, h: 60 },
        { x: w * 0.08, y: h * 0.65, w: 80, h: 45 },
        { x: w * 0.85, y: h * 0.75, w: 90, h: 50 },
      ];

      panels.forEach((panel, i) => {
        const floatY = Math.sin(time * 0.01 + i * 2) * 5;
        ctx.strokeStyle = "rgba(0, 191, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(panel.x, panel.y + floatY, panel.w, panel.h);

        ctx.fillStyle = "rgba(0, 191, 255, 0.03)";
        ctx.fillRect(panel.x, panel.y + floatY, panel.w, panel.h);

        // Mini data bars inside panels
        for (let b = 0; b < 4; b++) {
          const barH = 5 + Math.sin(time * 0.03 + b + i) * 8;
          ctx.fillStyle = `rgba(0, 255, 255, ${0.2 + b * 0.1})`;
          ctx.fillRect(
            panel.x + 10 + b * 18,
            panel.y + floatY + panel.h - 15 - barH,
            12,
            barH
          );
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-80"
      aria-hidden="true"
    />
  );
}
