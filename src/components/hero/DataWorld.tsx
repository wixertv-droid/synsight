"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  depth: number;
  speed: number;
  phase: number;
}

interface GlobeNode {
  latitude: number;
  longitude: number;
  phase: number;
  intensity: number;
}

interface NetworkEdge {
  from: number;
  to: number;
  phase: number;
  channel: "cyan" | "blue";
}

interface DataPacket {
  edge: number;
  offset: number;
  speed: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

const popupMessages = [
  {
    title: "VERKNÜPFTE KONTEN",
    detail: "E-MAIL / SICHER  ·  TELEFON / LECK",
    tone: "warning",
  },
  {
    title: "DATENLECK-TRACE ID",
    detail: "SEVERE LEAKED SEGMENT / PRIORITÄT 01",
    tone: "danger",
  },
  {
    title: "DIGITALER FUSSABDRUCK-SCAN",
    detail: "PHASE 2 ACTIVE  ·  84% KORRELIERT",
    tone: "active",
  },
] as const;

function createGlobeNetwork(latitudeBands: number, longitudeBands: number) {
  const nodes: GlobeNode[] = [];
  const edges: NetworkEdge[] = [];

  for (let latitudeIndex = 0; latitudeIndex < latitudeBands; latitudeIndex++) {
    const latitude =
      -76 + (latitudeIndex / Math.max(1, latitudeBands - 1)) * 152;
    for (
      let longitudeIndex = 0;
      longitudeIndex < longitudeBands;
      longitudeIndex++
    ) {
      const index = latitudeIndex * longitudeBands + longitudeIndex;
      const jitter = Math.sin(index * 12.9898) * 2.4;
      nodes.push({
        latitude: latitude + jitter * 0.32,
        longitude:
          -180 + (longitudeIndex / longitudeBands) * 360 + jitter,
        phase: (index * 1.618) % (Math.PI * 2),
        intensity: 0.55 + ((index * 37) % 45) / 100,
      });

      const east =
        latitudeIndex * longitudeBands +
        ((longitudeIndex + 1) % longitudeBands);
      edges.push({
        from: index,
        to: east,
        phase: index * 0.37,
        channel: index % 3 === 0 ? "blue" : "cyan",
      });

      if (latitudeIndex < latitudeBands - 1) {
        const north = (latitudeIndex + 1) * longitudeBands + longitudeIndex;
        edges.push({
          from: index,
          to: north,
          phase: index * 0.53,
          channel: index % 4 === 0 ? "blue" : "cyan",
        });
        if (index % 4 === 0) {
          edges.push({
            from: index,
            to:
              (latitudeIndex + 1) * longitudeBands +
              ((longitudeIndex + 1) % longitudeBands),
            phase: index * 0.71,
            channel: "blue",
          });
        }
      }
    }
  }

  const packets: DataPacket[] = edges
    .filter((_, index) => index % 9 === 0)
    .map((_, index) => ({
      edge: index * 9,
      offset: (index * 0.173) % 1,
      speed: 0.000035 + (index % 5) * 0.000006,
    }));

  return { nodes, edges, packets };
}

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
    let globeNodes: GlobeNode[] = [];
    let networkEdges: NetworkEdge[] = [];
    let dataPackets: DataPacket[] = [];

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
      const network = createGlobeNetwork(
        width < 768 ? 8 : 12,
        width < 768 ? 12 : 18
      );
      globeNodes = network.nodes;
      networkEdges = network.edges;
      dataPackets = network.packets;
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

      const projectedNodes = globeNodes.map((node) =>
        project(
          node.latitude,
          node.longitude,
          rotation,
          cx,
          cy,
          radius
        )
      );
      const scanLongitude = reducedMotion
        ? 24
        : ((time * 0.018) % 360) - 180;

      // Focused AI scan plane sweeping across the globe.
      const drawScanMeridian = (lineWidth: number, alpha: number) => {
        ctx.beginPath();
        let drawing = false;
        for (let latitude = -88; latitude <= 88; latitude += 3) {
          const point = project(
            latitude,
            scanLongitude,
            rotation,
            cx,
            cy,
            radius
          );
          if (point.depth > 0) {
            if (!drawing) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
            drawing = true;
          } else {
            drawing = false;
          }
        }
        ctx.strokeStyle = `rgba(112, 231, 255, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };
      drawScanMeridian(radius * 0.085, 0.035);
      drawScanMeridian(radius * 0.028, 0.08);
      drawScanMeridian(1.15, 0.62);

      // Dense, pulsing cyan/deep-blue network mesh.
      networkEdges.forEach((edge, index) => {
        const from = projectedNodes[edge.from];
        const to = projectedNodes[edge.to];
        if (!from || !to || from.depth <= 0 || to.depth <= 0) return;
        const depth = Math.min(from.depth, to.depth);
        const pulse =
          0.58 + Math.sin(time * 0.0012 + edge.phase) * 0.34;
        const alpha = (0.035 + depth * 0.105) * pulse;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle =
          edge.channel === "cyan"
            ? `rgba(76, 207, 246, ${alpha})`
            : `rgba(23, 78, 174, ${alpha * 1.2})`;
        ctx.lineWidth = index % 7 === 0 ? 0.85 : 0.48;
        ctx.stroke();
      });

      // Light packets continuously traveling along network connections.
      if (!reducedMotion) {
        dataPackets.forEach((packet, index) => {
          const edge = networkEdges[packet.edge];
          if (!edge) return;
          const from = projectedNodes[edge.from];
          const to = projectedNodes[edge.to];
          if (!from || !to || from.depth <= 0.08 || to.depth <= 0.08) return;
          const travel = (time * packet.speed + packet.offset) % 1;
          const x = from.x + (to.x - from.x) * travel;
          const y = from.y + (to.y - from.y) * travel;
          const depth = Math.min(from.depth, to.depth);
          ctx.beginPath();
          ctx.arc(x, y, 3.8 + depth * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(75, 197, 245, ${0.025 + depth * 0.055})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, index % 4 === 0 ? 1.5 : 1.05, 0, Math.PI * 2);
          ctx.fillStyle =
            index % 3 === 0
              ? `rgba(135, 238, 255, ${0.5 + depth * 0.45})`
              : `rgba(44, 119, 226, ${0.5 + depth * 0.38})`;
          ctx.fill();
        });
      }

      // Dense star-field nodes. Points close to the scan plane are intensified.
      globeNodes.forEach((node, index) => {
        const point = projectedNodes[index];
        if (!point || point.depth <= 0) return;
        const angularDistance = Math.abs(
          ((((node.longitude - scanLongitude) % 360) + 540) % 360) - 180
        );
        const scanned = angularDistance < 10;
        const pulse =
          0.72 + Math.sin(time * 0.0018 + node.phase) * 0.28;
        const radiusBoost = scanned ? 1.3 : 0;
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          0.55 + point.depth * 1.05 + radiusBoost,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = scanned
          ? `rgba(196, 249, 255, ${0.7 + point.depth * 0.28})`
          : `rgba(105, 220, 252, ${(0.2 + point.depth * 0.62) * pulse * node.intensity})`;
        ctx.fill();
        if (scanned || index % 29 === 0) {
          ctx.beginPath();
          ctx.arc(
            point.x,
            point.y,
            3.2 + point.depth * 2.8 + radiusBoost,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `rgba(112, 231, 255, ${scanned ? 0.22 : 0.07})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      });
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

      // Contextual AI findings attached to live network nodes.
      if (width >= 900 && !reducedMotion) {
        popupMessages.forEach((message, popupIndex) => {
          const duration = 6200;
          const shiftedTime = time + popupIndex * 1850;
          const local = (shiftedTime % duration) / duration;
          if (local > 0.76) return;
          const fade =
            local < 0.12
              ? local / 0.12
              : local > 0.6
                ? (0.76 - local) / 0.16
                : 1;
          const cycle = Math.floor(shiftedTime / duration);
          let nodeIndex =
            (cycle * 47 + popupIndex * 71 + 13) % projectedNodes.length;
          for (let attempt = 0; attempt < projectedNodes.length; attempt++) {
            const candidate = projectedNodes[nodeIndex];
            if (candidate?.depth > 0.38) break;
            nodeIndex = (nodeIndex + 17) % projectedNodes.length;
          }
          const anchor = projectedNodes[nodeIndex];
          if (!anchor || anchor.depth <= 0.38) return;

          const cardWidth = message.tone === "danger" ? 208 : 194;
          const cardHeight = 49;
          const cardOnRight = anchor.x <= cx;
          const desiredX = cardOnRight
            ? anchor.x + 24
            : anchor.x - cardWidth - 24;
          const cardX = Math.max(12, Math.min(width - cardWidth - 12, desiredX));
          const cardY = Math.max(
            94,
            Math.min(height - cardHeight - 78, anchor.y - cardHeight / 2)
          );
          const lineEndX = cardOnRight ? cardX : cardX + cardWidth;
          const accent =
            message.tone === "danger"
              ? "251, 113, 133"
              : message.tone === "warning"
                ? "251, 191, 36"
                : "112, 231, 255";

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * 0.92;
          ctx.beginPath();
          ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accent}, .45)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(anchor.x, anchor.y);
          ctx.lineTo(
            cardOnRight ? anchor.x + 12 : anchor.x - 12,
            cardY + cardHeight / 2
          );
          ctx.lineTo(lineEndX, cardY + cardHeight / 2);
          ctx.strokeStyle = `rgba(${accent}, .28)`;
          ctx.lineWidth = 0.65;
          ctx.stroke();

          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 5);
          ctx.fillStyle = "rgba(4, 10, 18, .86)";
          ctx.fill();
          ctx.strokeStyle = `rgba(${accent}, .2)`;
          ctx.lineWidth = 0.7;
          ctx.stroke();

          ctx.fillStyle = `rgba(${accent}, .8)`;
          ctx.fillRect(cardX, cardY, 2, cardHeight);
          ctx.font = "600 8px ui-monospace, SFMono-Regular, monospace";
          ctx.fillStyle = "rgba(221, 244, 250, .82)";
          ctx.fillText(message.title, cardX + 12, cardY + 18);
          ctx.font = "500 6.8px ui-monospace, SFMono-Regular, monospace";
          ctx.fillStyle = `rgba(${accent}, .68)`;
          ctx.fillText(message.detail, cardX + 12, cardY + 35);
          ctx.restore();
        });
      }
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
