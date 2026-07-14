"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

type Phase = "logo" | "initializing" | "online" | "exit";

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState<Phase>("logo");
  const [progress, setProgress] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  const fullTextInitializing = "INITIALIZING SYNIGHT AI CORE";
  const fullTextOnline = "DIGITAL IDENTITY PROTECTION SYSTEM ONLINE";

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("initializing"), 1200));
    timers.push(setTimeout(() => setPhase("online"), 3800));
    timers.push(setTimeout(() => setPhase("exit"), 5800));
    timers.push(setTimeout(() => onComplete(), 6500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    if (phase === "initializing") {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= fullTextInitializing.length) {
          setDisplayText(fullTextInitializing.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }
    if (phase === "online") {
      setDisplayText("");
      let i = 0;
      const interval = setInterval(() => {
        if (i <= fullTextOnline.length) {
          setDisplayText(fullTextOnline.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 35);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.5, 100));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center loading-grid bg-space-black transition-opacity duration-700 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* HUD corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyber-blue/30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyber-blue/30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyber-blue/30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyber-blue/30" />

      {/* Side HUD data */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 font-mono text-[10px] text-cyber-blue/40">
        <span>SYS.STATUS: BOOT</span>
        <span>CORE: v4.2.1</span>
        <span>NEURAL: ACTIVE</span>
        <span>SCAN: READY</span>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 font-mono text-[10px] text-cyber-blue/40 text-right">
        <span>LAT: 12ms</span>
        <span>MEM: 98.7%</span>
        <span>NET: SECURE</span>
        <span>ID: PROTECT</span>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Logo + Scanner */}
        <div className="relative">
          {/* Outer scanner rings */}
          <div className="absolute inset-0 -m-12">
            <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(0,191,255,0.1)"
                strokeWidth="1"
                className="scanner-ring"
              />
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke="rgba(0,255,255,0.15)"
                strokeWidth="0.5"
                strokeDasharray="8 12"
                className="animate-rotate-slow"
                style={{ transformOrigin: "center" }}
              />
              <circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="rgba(0,191,255,0.3)"
                strokeWidth="1"
                strokeDasharray="120 200"
                className="animate-rotate-slow"
                style={{
                  transformOrigin: "center",
                  animationDirection: "reverse",
                  animationDuration: "8s",
                }}
              />
              {/* Data lines radiating */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1="100"
                  y1="100"
                  x2={100 + 85 * Math.cos((angle * Math.PI) / 180)}
                  y2={100 + 85 * Math.sin((angle * Math.PI) / 180)}
                  stroke="rgba(0,191,255,0.2)"
                  strokeWidth="0.5"
                  className="data-line"
                  style={{ animationDelay: `${angle * 10}ms` }}
                />
              ))}
            </svg>
          </div>

          {/* Logo */}
          <div
            className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
              phase === "logo" ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }`}
            style={{
              animation:
                phase === "logo" ? "none" : "fade-in 1.2s ease-out forwards",
            }}
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-cyber-blue/40 flex items-center justify-center glow-border bg-space-panel/80">
              <svg viewBox="0 0 48 48" className="w-12 h-12 md:w-14 md:h-14">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#00BFFF"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <circle cx="24" cy="24" r="8" fill="#00BFFF" opacity="0.8" />
                <circle cx="24" cy="24" r="3" fill="#00FFFF" />
                <line
                  x1="24"
                  y1="4"
                  x2="24"
                  y2="14"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="24"
                  y1="34"
                  x2="24"
                  y2="44"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="4"
                  y1="24"
                  x2="14"
                  y2="24"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1="34"
                  y1="24"
                  x2="44"
                  y2="24"
                  stroke="#00FFFF"
                  strokeWidth="1"
                  opacity="0.5"
                />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-[0.3em] text-white glow-text">
              SYN<span className="text-cyber-blue">SIGHT</span>
            </h1>
          </div>
        </div>

        {/* Status text */}
        <div className="h-8 flex items-center">
          {(phase === "initializing" || phase === "online" || phase === "exit") && (
            <p className="font-mono text-xs md:text-sm text-cyber-cyan tracking-widest">
              {displayText}
              <span
                className={`inline-block w-2 ${showCursor ? "opacity-100" : "opacity-0"}`}
              >
                _
              </span>
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-48 md:w-64 h-[2px] bg-space-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="font-mono text-[10px] text-cyber-blue/30 tracking-wider">
          {Math.round(progress)}% SYSTEM INITIALIZATION
        </p>
      </div>
    </div>
  );
}
