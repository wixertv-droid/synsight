"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  depth: number;
  speed: number;
  phase: number;
}

const networkPoints = [
  [-42, -72],
  [-18, -46],
  [8, -20],
  [34, 12],
  [51, 35],
  [22, 68],
  [-8, 92],
  [-32, 125],
  [4, 154],
  [46, 178],
  [15, 212],
  [-24, 245],
  [38, 278],
] as const;

export default function DataWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let animationId = 0;
    let running = true;
    let visible = true;
    let lastTime = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: width < 768 ? 34 : 72 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        depth: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.012 + 0.004,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const globePosition = (width: number, height: number) => {
      const mobile = width < 768;
      return {
        cx: width * (mobile ? 0.72 : 0.74),
        cy: height * (mobile ? 0.34 : 0.46),
        radius: Math.min(width, height) * (mobile ? 0.28 : 0.31),
      };
    };

    const project = (
      latitude: number,
      longitude: number,
      rotation: number,
      cx: number,
      cy: number,
      radius: number
    ) => {
      const lat = (latitude * Math.PI) / 180;
      const lon = (longitude * Math.PI) / 180 + rotation;
      const depth = Math.cos(lat) * Math.cos(lon);
      return {
        x: cx + radius * Math.cos(lat) * Math.sin(lon),
        y: cy - radius * Math.sin(lat),
        depth,
      };
    };

    const drawParticles = (width: number, height: number, time: number) => {
      particles.forEach((particle) => {
        particle.x -= particle.speed * particle.depth * (reducedMotion ? 0 : 1);
        if (particle.x < -4) particle.x = width + 4;
        const alpha =
          0.12 +
          particle.depth * 0.28 +
          Math.sin(time * 0.0007 + particle.phase) * 0.08;
        ctx.beginPath();
        ctx.arc(
          particle.x,
          particle.y,
          0.35 + particle.depth * 0.8,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(174, 231, 255, ${alpha})`;
        ctx.fill();
      });
    };

    const drawGlobe = (width: number, height: number, time: number) => {
      const { cx, cy, radius } = globePosition(width, height);
      const rotation = reducedMotion ? 0.35 : time * 0.000025;

      const halo = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.55,
        cx,
        cy,
        radius * 1.48
      );
      halo.addColorStop(0, "rgba(30, 164, 222, .09)");
      halo.addColorStop(0.55, "rgba(25, 122, 177, .055)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      const sphere = ctx.createRadialGradient(
        cx - radius * 0.34,
        cy - radius * 0.32,
        radius * 0.05,
        cx,
        cy,
        radius
      );
      sphere.addColorStop(0, "rgba(70, 185, 230, .16)");
      sphere.addColorStop(0.5, "rgba(10, 73, 112, .11)");
      sphere.addColorStop(0.9, "rgba(3, 20, 34, .38)");
      sphere.addColorStop(1, "rgba(2, 7, 13, .7)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphere;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      for (let latitude = -60; latitude <= 60; latitude += 20) {
        ctx.beginPath();
        for (let longitude = -180; longitude <= 180; longitude += 4) {
          const point = project(
            latitude,
            longitude,
            rotation,
            cx,
            cy,
            radius
          );
          if (longitude === -180) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = "rgba(112, 231, 255, .085)";
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      for (let longitude = 0; longitude < 180; longitude += 30) {
        ctx.beginPath();
        for (let latitude = -90; latitude <= 90; latitude += 3) {
          const point = project(
            latitude,
            longitude,
            rotation,
            cx,
            cy,
            radius
          );
          if (latitude === -90) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = "rgba(112, 231, 255, .075)";
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      const projectedNodes = networkPoints.map(([lat, lon]) =>
        project(lat, lon, rotation, cx, cy, radius)
      );

      projectedNodes.forEach((point, index) => {
        if (point.depth < 0) return;
        const next = projectedNodes[(index + 3) % projectedNodes.length];
        if (next.depth > 0) {
          const lift = Math.min(32, radius * 0.14);
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.quadraticCurveTo(
            (point.x + next.x) / 2,
            (point.y + next.y) / 2 - lift,
            next.x,
            next.y
          );
          ctx.strokeStyle = `rgba(85, 205, 247, ${0.08 + point.depth * 0.11})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        const pulse = 1 + Math.sin(time * 0.0015 + index) * 0.45;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.2 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 226, 255, ${0.38 + point.depth * 0.45})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 + pulse * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(80, 199, 241, ${0.07 + point.depth * 0.08})`;
        ctx.stroke();
      });

      if (!reducedMotion) {
        const scanY = cy - radius + ((time * 0.025) % (radius * 2));
        const halfWidth = Math.sqrt(
          Math.max(0, radius * radius - (scanY - cy) ** 2)
        );
        const scanGradient = ctx.createLinearGradient(
          cx - halfWidth,
          scanY,
          cx + halfWidth,
          scanY
        );
        scanGradient.addColorStop(0, "rgba(112, 231, 255, 0)");
        scanGradient.addColorStop(0.5, "rgba(112, 231, 255, .44)");
        scanGradient.addColorStop(1, "rgba(112, 231, 255, 0)");
        ctx.beginPath();
        ctx.moveTo(cx - halfWidth, scanY);
        ctx.lineTo(cx + halfWidth, scanY);
        ctx.strokeStyle = scanGradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(148, 230, 255, .28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.18);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.36, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(84, 194, 235, .13)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (time = 0) => {
      if (!running || !visible) return;
      if (!reducedMotion && time - lastTime < 32) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);
      drawParticles(width, height, time);
      drawGlobe(width, height, time);
      lastTime = time;
      if (!reducedMotion) animationId = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reducedMotion) {
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(draw);
      }
    });

    const onVisibilityChange = () => {
      running = !document.hidden;
      if (running && visible && !reducedMotion) {
        animationId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animationId);
      }
    };

    resize();
    observer.observe(canvas);
    draw(lastTime);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-90"
      aria-hidden="true"
    />
  );
}
