"use client";

import { useEffect, useRef } from "react";
import "./boot-sequence.css";

export interface BootSequenceProps {
  onComplete: () => void;
}

type Vec3 = { x: number; y: number; z: number };
type AtmosNode = Vec3 & { neighbors: AtmosNode[] };
type Signal = {
  current: AtmosNode;
  target: AtmosNode;
  progress: number;
  speed: number;
};

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // HTML Elements
    const canvas = container.querySelector(
      "#globe-canvas"
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    const globeWrapper = container.querySelector(
      "#globe-system"
    ) as HTMLElement;
    const bootUI = container.querySelector("#boot-ui") as HTMLElement;
    const brandSyn = container.querySelector("#brand-syn") as HTMLElement;
    const brandSight = container.querySelector("#brand-sight") as HTMLElement;
    const segments = container.querySelectorAll(".segment");
    const statusLabel = container.querySelector("#status-label") as HTMLElement;
    const percentLabel = container.querySelector(
      "#percentage-label"
    ) as HTMLElement;
    const hexStream = container.querySelector("#hex-stream") as HTMLElement;

    let animationFrameId = 0;
    const panelIntervals: Array<ReturnType<typeof setInterval>> = [];
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];

    // --- 1. GLOBE CANVAS ENGINE ---
    const earthASCII = [
      "                                                                                                                        ",
      "                                                ##                                                                      ",
      "             #######                         ########                                                                   ",
      "           ############                     ##########                                                                  ",
      "         ################                  ############                     #                                           ",
      "        ##################                ##############                  #####                                         ",
      "       ####################              ################               #########                                       ",
      "       #####################            ##################             ###########                                      ",
      "       #####################            ##################            #############                                     ",
      "        ####################           ###################           ###############                                    ",
      "         ###################           ####################          ###############                                    ",
      "           #################          #####################         ################                                    ",
      "            ################          #####################         ################                                    ",
      "             ###############          #####################        #################                                    ",
      "              ##############          #####################        #################                                    ",
      "               #############          #####################         ###############                       ##            ",
      "                ############          #####################          ##############                     ######          ",
      "                 ###########          ####################            ###########                     #########         ",
      "                  ##########           ###################             #########                     ###########        ",
      "                   #########           ##################               #######                     ############        ",
      "                    ########           #################                 #####                     #############        ",
      "                     #######           ################                                           ###############       ",
      "                      ######            ##############                                             #############        ",
      "                       #####             ############                                               ###########         ",
      "                        ####             ###########                                                 #########          ",
      "                         ###              #########                                                   #######           ",
      "                                          ########                                                     #####            ",
      "                                          #######                                                       ###             ",
      "                                           #####                                                                        ",
      "                                           ####                                                                         ",
    ];

    const width = 800;
    const height = 800;
    const RADIUS = 230;
    const ATMOS_RADIUS = 265;
    const earthNodes: Vec3[] = [];
    const atmosNodes: AtmosNode[] = [];
    const signals: Signal[] = [];
    let rotationY = 4.3;
    const rotationX = 0.25;

    const latLines = 60;
    const lonLines = 120;
    for (let lat = 0; lat <= latLines; lat++) {
      const phi = (lat / latLines) * Math.PI;
      let currentLonLines = Math.floor(lonLines * Math.sin(phi));
      if (currentLonLines < 1) currentLonLines = 1;
      for (let lon = 0; lon < currentLonLines; lon++) {
        const theta = (lon / currentLonLines) * 2 * Math.PI;
        const u = theta / (2 * Math.PI);
        const v = phi / Math.PI;
        const yGrid = Math.floor(v * earthASCII.length);
        const xGrid = Math.floor(u * earthASCII[0].length);
        if (earthASCII[yGrid] && earthASCII[yGrid][xGrid] === "#") {
          earthNodes.push({
            x: RADIUS * Math.sin(phi) * Math.cos(theta),
            y: RADIUS * Math.cos(phi),
            z: RADIUS * Math.sin(phi) * Math.sin(theta),
          });
        }
      }
    }

    for (let i = 0; i < 450; i++) {
      const phi = Math.acos(-1 + (2 * i) / 450);
      const theta = Math.sqrt(450 * Math.PI) * phi;
      atmosNodes.push({
        x: ATMOS_RADIUS * Math.sin(phi) * Math.cos(theta),
        y: ATMOS_RADIUS * Math.cos(phi),
        z: ATMOS_RADIUS * Math.sin(phi) * Math.sin(theta),
        neighbors: [],
      });
    }
    for (let i = 0; i < atmosNodes.length; i++) {
      for (let j = i + 1; j < atmosNodes.length; j++) {
        const dx = atmosNodes[i].x - atmosNodes[j].x;
        const dy = atmosNodes[i].y - atmosNodes[j].y;
        const dz = atmosNodes[i].z - atmosNodes[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 48) {
          atmosNodes[i].neighbors.push(atmosNodes[j]);
          atmosNodes[j].neighbors.push(atmosNodes[i]);
        }
      }
    }
    for (let i = 0; i < 250; i++) {
      const startNode =
        atmosNodes[Math.floor(Math.random() * atmosNodes.length)];
      signals.push({
        current: startNode,
        target:
          startNode.neighbors[
            Math.floor(Math.random() * startNode.neighbors.length)
          ] || startNode,
        progress: Math.random(),
        speed: 0.015 + Math.random() * 0.03,
      });
    }

    function project(p: Vec3) {
      const x1 = p.x * Math.cos(rotationY) - p.z * Math.sin(rotationY);
      const z1 = p.x * Math.sin(rotationY) + p.z * Math.cos(rotationY);
      const y1 = p.y;
      const y2 = y1 * Math.cos(rotationX) - z1 * Math.sin(rotationX);
      const z2 = y1 * Math.sin(rotationX) + z1 * Math.cos(rotationX);
      return { x: x1, y: y2, z: z2 };
    }

    function renderGlobe() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      rotationY -= 0.0015;

      for (let i = 0; i < earthNodes.length; i++) {
        const p = project(earthNodes[i]);
        if (p.z < 0) continue;
        const depth = (p.z + RADIUS) / (RADIUS * 2);
        ctx.fillStyle = `rgba(29, 210, 255, ${Math.max(0.2, depth)})`;
        ctx.beginPath();
        ctx.arc(width / 2 + p.x, height / 2 + p.y, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(29, 210, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const projectedAtmos = atmosNodes.map((n) => project(n));
      for (let i = 0; i < atmosNodes.length; i++) {
        if (projectedAtmos[i].z < -30) continue;
        for (let j = 0; j < atmosNodes[i].neighbors.length; j++) {
          const nIdx = atmosNodes.indexOf(atmosNodes[i].neighbors[j]);
          if (nIdx > i) {
            ctx.moveTo(
              width / 2 + projectedAtmos[i].x,
              height / 2 + projectedAtmos[i].y
            );
            ctx.lineTo(
              width / 2 + projectedAtmos[nIdx].x,
              height / 2 + projectedAtmos[nIdx].y
            );
          }
        }
      }
      ctx.stroke();

      for (let i = 0; i < signals.length; i++) {
        const sig = signals[i];
        sig.progress += sig.speed;
        if (sig.progress >= 1) {
          sig.current = sig.target;
          sig.target =
            sig.current.neighbors[
              Math.floor(Math.random() * sig.current.neighbors.length)
            ] || sig.current;
          sig.progress = 0;
        }
        const cX =
          sig.current.x + (sig.target.x - sig.current.x) * sig.progress;
        const cY =
          sig.current.y + (sig.target.y - sig.current.y) * sig.progress;
        const cZ =
          sig.current.z + (sig.target.z - sig.current.z) * sig.progress;
        const p = project({ x: cX, y: cY, z: cZ });
        if (p.z > 0) {
          ctx.fillStyle = "#fff";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#1dd2ff";
          ctx.beginPath();
          ctx.arc(
            width / 2 + p.x,
            height / 2 + p.y,
            i % 3 === 0 ? 2 : 1.2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      animationFrameId = requestAnimationFrame(renderGlobe);
    }
    renderGlobe();

    // --- 2. BOOT LOGIC ---
    const HACKER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let iterations = 0;
    const maxIterations = 2000 / 40;
    const decryptInterval = setInterval(() => {
      brandSyn.innerText = "SYN"
        .split("")
        .map((_, i) =>
          i < (iterations / maxIterations) * 3
            ? "SYN"[i]
            : HACKER_CHARS[Math.floor(Math.random() * HACKER_CHARS.length)]
        )
        .join("");
      brandSight.innerText = "SIGHT"
        .split("")
        .map((_, i) =>
          i < (iterations / maxIterations) * 5
            ? "SIGHT"[i]
            : HACKER_CHARS[Math.floor(Math.random() * HACKER_CHARS.length)]
        )
        .join("");
      if (iterations >= maxIterations) {
        clearInterval(decryptInterval);
        brandSyn.innerText = "SYN";
        brandSight.innerText = "SIGHT";
      }
      iterations++;
    }, 40);

    let progress = 0;
    const bootInterval = setInterval(() => {
      hexStream.innerText = `0x${Math.floor(Math.random() * 65535)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")}`;
      progress += Math.random() * 2 + 0.5;
      if (progress > 100) progress = 100;

      if (progress < 30) statusLabel.innerText = "INITIALIZING AI CORE...";
      else if (progress < 60)
        statusLabel.innerText = "ESTABLISHING SECURE MESH...";
      else if (progress < 85)
        statusLabel.innerText = "ROUTING ENCRYPTED PACKETS...";
      else statusLabel.innerText = "SYSTEM ONLINE.";

      percentLabel.innerText = progress.toFixed(1) + "%";
      const filledSegs = Math.floor((progress / 100) * 40);
      segments.forEach((seg, idx) => {
        if (idx < filledSegs) seg.classList.add("filled");
      });

      if (progress > 30) globeWrapper.classList.add("active");

      if (progress === 100) {
        clearInterval(bootInterval);
        timeouts.push(
          setTimeout(() => {
            bootUI.classList.add("finished");
            timeouts.push(
              setTimeout(() => {
                animatePanel(
                  1,
                  30,
                  "Status: Initialisiere Datenstrom...",
                  "Datenstrom aktiv (Verbindung stabil)",
                  "normal",
                  () => {
                    animatePanel(
                      2,
                      40,
                      "Verbindung: Suche sicheren Tunnel...",
                      "Tunnel etabliert (AES-256 Quantum)",
                      "normal",
                      () => {
                        animatePanel(
                          3,
                          50,
                          "Scanne: Analysiere Vektoren...",
                          "Angriff blockiert (System gesichert)",
                          "alertToSuccess",
                          () => {
                            container
                              .querySelectorAll(".hotspot")
                              .forEach((h) => h.classList.add("visible"));
                            timeouts.push(setTimeout(onComplete, 2500));
                          }
                        );
                      }
                    );
                  }
                );
              }, 800)
            );
          }, 400)
        );
      }
    }, 40);

    function animatePanel(
      id: number,
      speed: number,
      sText: string,
      eText: string,
      type: string,
      cb: () => void
    ) {
      const panel = container.querySelector(`#panel-${id}`) as HTMLElement;
      const headEl = container.querySelector(`#p${id}-header`) as HTMLElement;
      const tEl = container.querySelector(`#p${id}-text`) as HTMLElement;
      const pEl = container.querySelector(`#p${id}-percent`) as HTMLElement;
      const bEl = container.querySelector(`#p${id}-bar`) as HTMLElement;

      panel.classList.add("visible");
      tEl.innerText = sText;
      if (type === "alertToSuccess") {
        headEl.classList.add("alert-header");
        pEl.className = "red-text";
        bEl.classList.add("alert-fill");
        tEl.style.color = "#fff";
        const line = container.querySelector(
          ".line-mr line"
        ) as SVGLineElement | null;
        if (line) line.style.stroke = "#ff2a55";
      }
      let p = 0;
      const intv = setInterval(() => {
        p += Math.random() * 4 + 1;
        if (p >= 100) {
          p = 100;
          clearInterval(intv);
          tEl.innerText = eText;
          if (type === "alertToSuccess") {
            headEl.classList.replace("alert-header", "success-header");
            pEl.className = "green-text";
            pEl.innerText = "Sicher (Blockiert)";
            bEl.classList.replace("alert-fill", "success-fill");
            tEl.style.color = "#00ff88";
            const line = container.querySelector(
              ".line-mr line"
            ) as SVGLineElement | null;
            if (line) line.style.stroke = "#00ff88";
            const tSpot = container.querySelector(
              "#threat-hotspot"
            ) as HTMLElement | null;
            if (tSpot) tSpot.style.boxShadow = "0 0 15px 3px #00ff88";
            container
              .querySelector("#threat-pulse")
              ?.classList.replace("alert-pulse", "success-pulse");
            container
              .querySelector("#threat-label")
              ?.classList.replace("alert-label", "success-label");
            const threatLabel = container.querySelector(
              "#threat-label"
            ) as HTMLElement | null;
            if (threatLabel) threatLabel.innerText = "THREAT NEUTRALIZED";
          } else {
            tEl.style.color = "#1dd2ff";
            pEl.innerText = "Verbunden";
          }
          bEl.style.width = "100%";
          timeouts.push(setTimeout(cb, 600));
        } else {
          bEl.style.width = p + "%";
          pEl.innerText =
            type === "alertToSuccess"
              ? `Gefahr: ${Math.floor(p)}%`
              : `${Math.floor(p)}%`;
        }
      }, speed);
      panelIntervals.push(intv);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(bootInterval);
      clearInterval(decryptInterval);
      panelIntervals.forEach((id) => clearInterval(id));
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [onComplete]);

  return (
    <div className="boot-container" ref={containerRef}>
      <div className="ambient-glow" />
      <div className="globe-wrapper" id="globe-system">
        <canvas id="globe-canvas" width="800" height="800" />
        <div className="hotspot node-eu">
          <div className="pulse" />
          <div className="hotspot-label">DEHASHED NODE ONLINE</div>
        </div>
        <div className="hotspot node-us">
          <div className="pulse" />
          <div className="hotspot-label">SERP MATRIX SECURE</div>
        </div>
        <div className="hotspot node-asia" id="threat-hotspot">
          <div className="pulse alert-pulse" id="threat-pulse" />
          <div className="hotspot-label alert-label" id="threat-label">
            THREAT DETECTED
          </div>
        </div>
      </div>

      <div className="ui-panel panel-top-left" id="panel-1">
        <div className="panel-header" id="p1-header">
          DATENSTROM-ANALYSE
        </div>
        <div className="panel-body">
          <span id="p1-text" />
          <br />
          Netzwerk:{" "}
          <span className="cyan-text" id="p1-percent">
            0%
          </span>
          <div className="panel-progress-bg">
            <div className="panel-progress-fill" id="p1-bar" />
          </div>
        </div>
        <svg className="connect-line line-tl" aria-hidden="true">
          <line x1="0" y1="100%" x2="100%" y2="100%" />
        </svg>
      </div>

      <div className="ui-panel panel-mid-left" id="panel-2">
        <div className="panel-header" id="p2-header">
          SERVER-ROUTING
        </div>
        <div className="panel-body">
          <span id="p2-text" />
          <br />
          AES-256:{" "}
          <span className="cyan-text" id="p2-percent">
            0%
          </span>
          <div className="panel-progress-bg">
            <div className="panel-progress-fill" id="p2-bar" />
          </div>
        </div>
        <svg className="connect-line line-ml" aria-hidden="true">
          <line x1="0" y1="50%" x2="100%" y2="50%" />
        </svg>
      </div>

      <div className="ui-panel panel-mid-right" id="panel-3">
        <div className="panel-header" id="p3-header">
          BEDROHUNGS-VECTOR
        </div>
        <div className="panel-body">
          <span id="p3-text" />
          <br />
          Status:{" "}
          <span className="red-text" id="p3-percent">
            0%
          </span>
          <div className="panel-progress-bg">
            <div className="panel-progress-fill" id="p3-bar" />
          </div>
        </div>
        <svg className="connect-line line-mr" aria-hidden="true">
          <line x1="100%" y1="50%" x2="0%" y2="50%" />
        </svg>
      </div>

      <div className="boot-interface" id="boot-ui">
        <div className="brand-wrapper">
          <span id="brand-syn" />
          <span id="brand-sight" />
        </div>
        <div className="sub-brand">AI SECURITY STATUS</div>
        <div className="cyber-loader">
          <div className="loader-header">
            <span id="status-label">ESTABLISHING UPLINK...</span>
            <span id="hex-stream">0x0000</span>
          </div>
          <div className="segmented-bar-container">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="segment" />
            ))}
          </div>
          <div className="loader-footer">
            <span className="auth-tag">ADMIN ACCOUNT</span>
            <span id="percentage-label">0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { BootSequence as BootScreen };
