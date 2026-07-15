"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import {
  arcs,
  hotspotRings,
  labels,
  liveDataNodes,
  points,
  scanLocations,
} from "@/components/hero/globe/globe-data";
import { createHaloParticles } from "@/components/hero/globe/globe-utils";
import GlobeHud from "@/components/hero/globe/GlobeHud";

type WorldTopology = Topology<{
  countries: GeometryCollection;
}>;

export default function CyberGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(SVGLineElement | null)[]>([]);
  const locationTitleRef = useRef<HTMLParagraphElement>(null);
  const locationDetailRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvasHost = canvasRef.current;
    if (!root || !canvasHost || typeof window === "undefined") return;

    // three-globe's ThreeDigest calls Array.forEach on each layer dataset.
    // Never pass undefined/null — empty arrays keep digest cycles safe.
    const safePoints = Array.isArray(points) ? points : [];
    const safeArcs = Array.isArray(arcs) ? arcs : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeRings = Array.isArray(hotspotRings) ? hotspotRings : [];
    const safeNodes = Array.isArray(liveDataNodes) ? liveDataNodes : [];
    const safeScanLocations = Array.isArray(scanLocations)
      ? scanLocations
      : [];

    let countries: GeoJSON.Feature[] = [];
    try {
      const topology = worldData as unknown as WorldTopology;
      const countryObject = topology?.objects?.countries;
      if (countryObject) {
        const collection = feature(topology, countryObject);
        const features = collection?.features;
        countries = Array.isArray(features)
          ? features.filter(
              (entry) =>
                entry?.geometry &&
                (entry.geometry.type === "Polygon" ||
                  entry.geometry.type === "MultiPolygon")
            )
          : [];
      }
    } catch {
      countries = [];
    }

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
    canvasHost.replaceChildren();
    canvasHost.appendChild(renderer.domElement);

    let globe: ThreeGlobe;
    try {
      globe = new ThreeGlobe({
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
        .hexPolygonColor(() => "rgba(92, 220, 252, .9)")
        .pointsData(safePoints)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor("color")
        .pointRadius("radius")
        .pointAltitude("altitude")
        .pointResolution(8)
        .pointsMerge(false)
        .arcsData(safeArcs)
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor("color")
        .arcAltitudeAutoScale(0.24)
        .arcStroke(0.18)
        .arcDashLength(0.2)
        .arcDashGap(0.48)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(reducedMotion ? 0 : 2350)
        .ringsData(safeRings)
        .ringLat("lat")
        .ringLng("lng")
        .ringAltitude(0.013)
        .ringColor(() => (t: number) =>
          `rgba(${t > 0.55 ? "255,138,92" : "112,231,255"},${1 - t})`
        )
        .ringMaxRadius(5.4)
        .ringPropagationSpeed(reducedMotion ? 0 : 1.8)
        .ringRepeatPeriod(reducedMotion ? 0 : 1700)
        .labelsData(safeLabels)
        .labelLat("lat")
        .labelLng("lng")
        .labelText("text")
        .labelColor("color")
        .labelAltitude(0.035)
        .labelSize(0.72)
        .labelDotRadius(0.22)
        .labelIncludeDot(true)
        .labelResolution(3);
    } catch {
      renderer.dispose();
      renderer.domElement.remove();
      return;
    }

    globe.globeMaterial(
      new THREE.MeshPhongMaterial({
        color: 0x031321,
        emissive: 0x062b48,
        emissiveIntensity: 1.05,
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
    const haloParticles = new THREE.Points(particleGeometry, particleMaterial);
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
    controls.autoRotateSpeed = 0.52;
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
      globeGroup.position.x = width >= 900 ? 68 : width >= 640 ? 22 : 0;
      const globeScale = width >= 900 ? 0.62 : width >= 640 ? 0.68 : 0.74;
      globeGroup.scale.setScalar(globeScale);
      camera.position.z = width < 640 ? 390 : 330;
    };

    const updateConnectors = (time: number) => {
      const rootRect = root.getBoundingClientRect();
      [0, 1, 2, 3].forEach((index) => {
        const panel = panelRefs.current[index];
        const connector = connectorRefs.current[index];
        if (!panel || !connector) return;
        if (window.getComputedStyle(panel).display === "none") {
          connector.style.opacity = "0";
          return;
        }

        const cycleDuration = 5400;
        const shiftedTime = time + index * 940;
        const cycle = Math.floor(shiftedTime / cycleDuration);
        const localPhase = (shiftedTime % cycleDuration) / cycleDuration;
        const fade =
          localPhase < 0.1
            ? localPhase / 0.1
            : localPhase > 0.78
              ? (0.94 - localPhase) / 0.16
              : 1;

        const availableNodes =
          index === 1 ? safeScanLocations : safeNodes;
        if (availableNodes.length === 0) {
          connector.style.opacity = "0";
          panel.style.opacity = "0";
          return;
        }
        let nodeIndex = (cycle * 23 + index * 17 + 5) % availableNodes.length;
        const worldPoint = new THREE.Vector3();
        let facingCamera = false;
        for (let attempt = 0; attempt < availableNodes.length; attempt++) {
          const candidate = availableNodes[nodeIndex];
          if (!candidate) break;
          const coords = globe.getCoords(candidate.lat, candidate.lng, 0.025);
          worldPoint.set(coords.x, coords.y, coords.z);
          worldPoint.applyMatrix4(globe.matrixWorld);
          const surfaceNormal = worldPoint
            .clone()
            .sub(globeGroup.position)
            .normalize();
          const cameraDirection = camera.position
            .clone()
            .sub(worldPoint)
            .normalize();
          facingCamera = surfaceNormal.dot(cameraDirection) > 0.08;
          if (facingCamera) break;
          nodeIndex = (nodeIndex + 1) % availableNodes.length;
        }

        if (index === 1) {
          const location =
            safeScanLocations[nodeIndex % safeScanLocations.length];
          if (location && locationTitleRef.current) {
            locationTitleRef.current.textContent = `STANDORT-LEAK-BEREICH (${location.name})`;
          }
          if (location && locationDetailRef.current) {
            locationDetailRef.current.textContent = `Koordinaten: Lat ${Math.abs(location.lat).toFixed(1)} ${location.lat >= 0 ? "N" : "S"}, Lon ${Math.abs(location.lng).toFixed(1)} ${location.lng >= 0 ? "E" : "W"}`;
          }
        }

        const point = worldPoint.clone().project(camera);
        const targetX = (point.x * 0.5 + 0.5) * width;
        const targetY = (-point.y * 0.5 + 0.5) * height;
        const panelRect = panel.getBoundingClientRect();
        const placeOnRight = index % 2 === 0;
        const offsetY = index < 2 ? -66 : 34;
        const desiredLeft = placeOnRight
          ? targetX + 46
          : targetX - panelRect.width - 46;
        const panelLeft = Math.max(
          width * 0.43,
          Math.min(width - panelRect.width - 18, desiredLeft)
        );
        const panelTop = Math.max(
          92,
          Math.min(height - panelRect.height - 86, targetY + offsetY)
        );
        panel.style.left = `${panelLeft}px`;
        panel.style.top = `${panelTop}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.opacity = `${
          facingCamera ? Math.max(0, Math.min(1, fade)) : 0
        }`;

        const updatedPanelRect = panel.getBoundingClientRect();
        const panelCenterX =
          updatedPanelRect.left - rootRect.left + updatedPanelRect.width / 2;
        const panelCenterY =
          updatedPanelRect.top - rootRect.top + updatedPanelRect.height / 2;
        const startX =
          targetX > panelCenterX
            ? updatedPanelRect.right - rootRect.left
            : updatedPanelRect.left - rootRect.left;
        connector.setAttribute("x1", `${startX}`);
        connector.setAttribute("y1", `${panelCenterY}`);
        connector.setAttribute("x2", `${targetX}`);
        connector.setAttribute("y2", `${targetY}`);
        connector.style.opacity = facingCamera
          ? `${Math.max(0, Math.min(0.42, fade * 0.42))}`
          : "0";
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
        updateConnectors(time);
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
      // Stop three-globe's internal ticker before disposing geometry —
      // otherwise ThreeDigest can forEach over cleared layer state.
      try {
        globe.pauseAnimation();
        (
          globe as ThreeGlobe & {
            _destructor?: () => void;
          }
        )._destructor?.();
      } catch {
        /* ignore teardown races during React Strict Mode remount */
      }
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
      if (renderer.domElement.parentNode === canvasHost) {
        canvasHost.removeChild(renderer.domElement);
      }
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
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />
      <GlobeHud
        setPanelRef={setPanelRef}
        setConnectorRef={setConnectorRef}
        locationTitleRef={locationTitleRef}
        locationDetailRef={locationDetailRef}
      />
    </div>
  );
}
