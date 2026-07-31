"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "./boot-sequence.css";

const CyberGlobe = dynamic(
  () => import("@/components/hero/CyberGlobe").then((mod) => mod.default),
  { ssr: false }
);

export interface BootSequenceProps {
  onComplete: () => void;
}

/**
 * Post-login boot: home CyberGlobe (centered) + SYN|SIGHT decrypt/progress.
 * After the brand drops from center to bottom, wait 0.5s then reveal dashboard.
 * Side panels / canvas globe removed.
 */
export default function BootSequence({ onComplete }: BootSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

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

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];

    const HACKER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*<>[]{}|/\\";
    let iterations = 0;
    const maxIterations = 2000 / 40;
    const decryptInterval = setInterval(() => {
      brandSyn.innerText = Array.from({ length: 3 }, (_, i) =>
        i < (iterations / maxIterations) * 3
          ? "SYN"[i]
          : HACKER_CHARS[Math.floor(Math.random() * HACKER_CHARS.length)]
      ).join("");
      brandSight.innerText = Array.from({ length: 5 }, (_, i) =>
        i < (iterations / maxIterations) * 5
          ? "SIGHT"[i]
          : HACKER_CHARS[Math.floor(Math.random() * HACKER_CHARS.length)]
      ).join("");
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
        // Drop brand from center to bottom, then wait 0.5s → dashboard.
        timeouts.push(
          setTimeout(() => {
            bootUI.classList.add("finished");
            timeouts.push(setTimeout(onComplete, 1000 + 500));
            // 1s CSS transform (.finished) + 0.5s hold
          }, 400)
        );
      }
    }, 40);

    return () => {
      clearInterval(bootInterval);
      clearInterval(decryptInterval);
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [onComplete]);

  return (
    <div className="boot-container" ref={containerRef}>
      <div className="ambient-glow" />
      <div className="globe-wrapper boot-cyber-globe" id="globe-system">
        <CyberGlobe variant="centered" />
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
