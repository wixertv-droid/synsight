"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { feature } from "topojson-client";
import type {
  GeometryCollection,
  Topology,
} from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

interface GlobeCoordinate {
  lat: number;
  lng: number;
}

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
}

interface PointDatum extends GlobeCoordinate {
  color: string;
  radius: number;
  altitude: number;
}

interface LabelDatum extends GlobeCoordinate {
  text: string;
  color: string;
}

const panelCoordinates: GlobeCoordinate[] = [
  { lat: 52.52, lng: 13.405 },
  { lat: 48.8566, lng: 2.3522 },
  { lat: 31.2, lng: 24.5 },
  { lat: -18.5, lng: -8.2 },
];

const networkLocations = [
  { lat: 52.52, lng: 13.405 },
  { lat: 51.5072, lng: -0.1276 },
  { lat: 48.8566, lng: 2.3522 },
  { lat: 40.4168, lng: -3.7038 },
  { lat: 41.9028, lng: 12.4964 },
  { lat: 50.1109, lng: 8.6821 },
  { lat: 30.0444, lng: 31.2357 },
  { lat: 6.5244, lng: 3.3792 },
  { lat: -1.2921, lng: 36.8219 },
  { lat: -26.2041, lng: 28.0473 },
  { lat: 25.2048, lng: 55.2708 },
  { lat: 40.7128, lng: -74.006 },
  { lat: -23.5505, lng: -46.6333 },
  { lat: 1.3521, lng: 103.8198 },
];

const arcs: ArcDatum[] = networkLocations.flatMap((location, index) => {
  const next = networkLocations[(index + 1) % networkLocations.length];
  const cross = networkLocations[(index + 5) % networkLocations.length];
  return [
    {
      startLat: location.lat,
      startLng: location.lng,
      endLat: next.lat,
      endLng: next.lng,
      color: ["rgba(36,111,210,.2)", "rgba(112,231,255,.8)"],
    },
    {
      startLat: location.lat,
      startLng: location.lng,
      endLat: cross.lat,
      endLng: cross.lng,
      color: ["rgba(21,74,167,.16)", "rgba(41,182,246,.48)"],
    },
  ];
});

const points: PointDatum[] = [
  ...networkLocations.map((location, index) => ({
    ...location,
    color: index % 4 === 0 ? "#b8f5ff" : "#52d4ff",
    radius: index % 3 === 0 ? 0.42 : 0.28,
    altitude: 0.012,
  })),
  {
    lat: -18.5,
    lng: -8.2,
    color: "#ffb04d",
    radius: 0.62,
    altitude: 0.018,
  },
];

const labels: LabelDatum[] = [
  {
    lat: 52.52,
    lng: 13.405,
    text: "IDENTITY CLONE FOUND",
    color: "rgba(126,233,255,.9)",
  },
  {
    lat: 51.5072,
    lng: -0.1276,
    text: "BREACH VORTEX DETECTED",
    color: "rgba(255,137,108,.9)",
  },
];

type WorldTopology = Topology<{
  countries: GeometryCollection;
}>;

function createHaloParticles(count: number) {
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

export default function CyberGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const canvasHost = canvasRef.current;
    if (!root || !canvasHost) return;

    const topology = worldData as unknown as WorldTopology;
    const countries = feature(
      topology,
      topology.objects.countries
    ).features;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2000);
    camera.position.set(0, 0, 330);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvasHost.appendChild(renderer.domElement);

    const globe = new ThreeGlobe({
      waitForGlobeReady: true,
      animateIn: !reducedMotion,
    })
      .showGlobe(true)
      .showGraticules(true)
      .showAtmosphere(true)
      .atmosphereColor("#29b6f6")
      .atmosphereAltitude(0.19)
      .hexPolygonsData(countries)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.32)
      .hexPolygonUseDots(true)
      .hexPolygonDotResolution(3)
      .hexPolygonAltitude(0.006)
      .hexPolygonColor(() => "rgba(76, 207, 246, .72)")
      .pointsData(points)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor("color")
      .pointRadius("radius")
      .pointAltitude("altitude")
      .pointResolution(8)
      .pointsMerge(false)
      .arcsData(arcs)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor("color")
      .arcAltitudeAutoScale(0.24)
      .arcStroke(0.18)
      .arcDashLength(0.36)
      .arcDashGap(0.72)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(reducedMotion ? 0 : 3200)
      .ringsData([
        { lat: -18.5, lng: -8.2 },
        { lat: 48.8566, lng: 2.3522 },
      ])
      .ringLat("lat")
      .ringLng("lng")
      .ringAltitude(0.013)
      .ringColor(() => (t: number) =>
        `rgba(${t > 0.55 ? "255,138,92" : "112,231,255"},${1 - t})`
      )
      .ringMaxRadius(5.4)
      .ringPropagationSpeed(reducedMotion ? 0 : 1.8)
      .ringRepeatPeriod(reducedMotion ? 0 : 1700)
      .labelsData(labels)
      .labelLat("lat")
      .labelLng("lng")
      .labelText("text")
      .labelColor("color")
      .labelAltitude(0.035)
      .labelSize(0.72)
      .labelDotRadius(0.22)
      .labelIncludeDot(true)
      .labelResolution(3);

    globe.globeMaterial(
      new THREE.MeshPhongMaterial({
        color: 0x031321,
        emissive: 0x062b48,
        emissiveIntensity: 0.78,
        transparent: true,
        opacity: 0.82,
        shininess: 18,
      })
    );

    const globeGroup = new THREE.Group();
    globeGroup.add(globe);
    scene.add(globeGroup);

    const innerAura = new THREE.Mesh(
      new THREE.SphereGeometry(99.2, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x0878af,
        transparent: true,
        opacity: 0.075,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    globeGroup.add(innerAura);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x35c9f2,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
    });
    [
      { radius: 112, tiltX: 1.32, tiltY: 0.18 },
      { radius: 118, tiltX: 0.72, tiltY: -0.48 },
      { radius: 124, tiltX: 1.74, tiltY: 0.72 },
    ].forEach(({ radius, tiltX, tiltY }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.18, 4, 180),
        ringMaterial
      );
      ring.rotation.x = tiltX;
      ring.rotation.y = tiltY;
      globeGroup.add(ring);
    });

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(createHaloParticles(520), 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x7de8ff,
      size: 0.62,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloParticles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );
    globeGroup.add(haloParticles);

    scene.add(new THREE.AmbientLight(0x86dfff, 1.2));
    const keyLight = new THREE.DirectionalLight(0x9cecff, 3.4);
    keyLight.position.set(-160, 120, 220);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x0878ff, 6, 700);
    rimLight.position.set(180, -80, 160);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.34;
    controls.rotateSpeed = 0.42;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let active = true;
    let lastFrame = 0;

    const resize = () => {
      width = root.clientWidth;
      height = root.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      globeGroup.position.x = width >= 900 ? 72 : width >= 640 ? 25 : 0;
      camera.position.z = width < 640 ? 390 : 330;
    };

    const updateConnectors = () => {
      const rootRect = root.getBoundingClientRect();
      panelCoordinates.forEach((coordinate, index) => {
        const panel = panelRefs.current[index];
        const connector = connectorRefs.current[index];
        if (!panel || !connector) return;
        const coords = globe.getCoords(
          coordinate.lat,
          coordinate.lng,
          0.025
        );
        const point = new THREE.Vector3(coords.x, coords.y, coords.z);
        point.applyMatrix4(globe.matrixWorld).project(camera);
        const targetX = (point.x * 0.5 + 0.5) * width;
        const targetY = (-point.y * 0.5 + 0.5) * height;
        const panelRect = panel.getBoundingClientRect();
        const panelCenterX =
          panelRect.left - rootRect.left + panelRect.width / 2;
        const panelCenterY =
          panelRect.top - rootRect.top + panelRect.height / 2;
        const startX =
          targetX > panelCenterX
            ? panelRect.right - rootRect.left
            : panelRect.left - rootRect.left;
        connector.setAttribute("x1", `${startX}`);
        connector.setAttribute("y1", `${panelCenterY}`);
        connector.setAttribute("x2", `${targetX}`);
        connector.setAttribute("y2", `${targetY}`);
        const facingCamera = point.z < 1;
        connector.style.opacity = facingCamera ? "0.42" : "0.08";
      });
    };

    const render = (time: number) => {
      if (!active) return;
      if (time - lastFrame >= 32 || reducedMotion) {
        controls.update();
        haloParticles.rotation.y += reducedMotion ? 0 : 0.0007;
        haloParticles.rotation.x += reducedMotion ? 0 : 0.00015;
        globeGroup.children
          .filter((child) => child.type === "Mesh" && child !== innerAura)
          .forEach((ring, index) => {
            ring.rotation.z += reducedMotion ? 0 : 0.0003 + index * 0.00008;
          });
        scene.updateMatrixWorld();
        updateConnectors();
        renderer.render(scene, camera);
        lastFrame = time;
      }
      if (!reducedMotion) animationFrame = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting && !document.hidden;
      if (active && !reducedMotion) {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(render);
      }
    });
    visibilityObserver.observe(root);
    const onVisibilityChange = () => {
      active = !document.hidden;
      if (active && !reducedMotion) {
        animationFrame = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrame);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();
    render(0);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls.dispose();
      globeGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const setPanelRef = (index: number) => (node: HTMLDivElement | null) => {
    panelRefs.current[index] = node;
  };
  const setConnectorRef = (index: number) => (node: SVGLineElement | null) => {
    connectorRefs.current[index] = node;
  };

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      <div ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <svg className="pointer-events-none absolute inset-0 z-[3] hidden h-full w-full xl:block" aria-hidden="true">
        <defs>
          <filter id="connectorGlow">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {panelCoordinates.map((_, index) => (
          <line
            key={index}
            ref={setConnectorRef(index)}
            stroke={index === 3 ? "#ff8a5b" : "#70e7ff"}
            strokeWidth=".65"
            strokeDasharray="3 4"
            filter="url(#connectorGlow)"
          />
        ))}
      </svg>

      <div
        ref={setPanelRef(0)}
        className="globe-hud-panel globe-panel-top-left"
      >
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 flex-none text-cyber-cyan" fill="none" stroke="currentColor">
            <ellipse cx="12" cy="12" rx="9" ry="3.5" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <div>
            <p>DATENSTROM-ANALYSE AKTIV</p>
            <span>Status: Stabil</span>
          </div>
        </div>
      </div>

      <div
        ref={setPanelRef(1)}
        className="globe-hud-panel globe-panel-mid-left w-[248px]"
      >
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 flex-none text-cyber-cyan" fill="none" stroke="currentColor">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <div className="min-w-0 flex-1">
            <p>STANDORT-LEAK-BEREICH (Paris)</p>
            <span>Koordinaten: Lat 48.8 N, Lon 2.3 E</span>
            <span className="mt-3 block">Risk assessment:</span>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
              <i className="flex-1 bg-blue-700" />
              <i className="flex-1 bg-cyan-400" />
              <i className="flex-1 bg-orange-400" />
              <i className="relative flex-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.75)]">
                <b className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-white" />
              </i>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={setPanelRef(2)}
        className="globe-hud-panel globe-panel-mid-right"
      >
        <p>BEDROHUNGS-VEKTOR-VORSCHAU</p>
        <span>Sicherheitsstufe: Hoch</span>
        <span className="mt-2 block font-mono text-[7px] tracking-[.13em] text-cyber-cyan/65">
          [AKTIVE VERFOLGUNG]
        </span>
      </div>

      <div
        ref={setPanelRef(3)}
        className="globe-hud-panel globe-panel-bottom-right border-orange-300/20"
      >
        <p>SCAN-BESTÄTIGUNG: HOTSPOT IDENTIFIZIERT</p>
        <span>Sektor 7 G</span>
        <span className="mt-2 block text-orange-200/70">
          Sicherheits-Score: Kritisch
        </span>
      </div>

      <div className="absolute bottom-[5%] right-[5%] z-[4] hidden border-l border-cyber-cyan/25 pl-4 font-mono xl:block">
        <p className="text-[9px] tracking-[.2em] text-cyan-100/55">
          SYN-SIGHT GLOBAL MONITORING SYSTEM
        </p>
        <p className="mt-2 text-[7px] tracking-[.13em] text-white/25">
          Benutzer: RENE F | Pro Plan | Active Node: Gera, Thüringen
        </p>
      </div>
    </div>
  );
}
