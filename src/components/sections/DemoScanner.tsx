"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type ScanPhase = "idle" | "scanning" | "complete";

// Coole Cyber-Logs für den Terminal-Effekt
const terminalLogs = [
  "Initialisiere sichere Verbindung...",
  "Routing über verschlüsselte Proxys...",
  "OSINT-Datenbanken werden synchronisiert...",
  "Scanne öffentliche Repositories...",
  "Deep-Web-Crawler gestartet...",
  "Analysiere Metadaten-Fragmente...",
  "Gleiche Hash-Signaturen ab (HaveIBeenPwned API)...",
  "Suche nach geleakten Passwörtern im Darknet...",
  "Korreliere Geo-IP-Pings...",
  "Extrahiere verknüpfte Social-Media-IDs...",
  "Bypassing Node-Security...",
  "Aggregiere Risiko-Faktoren...",
  "Kompiliere digitalen Fußabdruck...",
];

interface ApiResult {
  summary: string;
  riskLevel: string;
}

export default function DemoScanner() {
  const router = useRouter();
  const [input, setInput] = useState<string>("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const { ref, isVisible } = useScrollAnimation();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (phase !== "scanning") return;

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 3;
      if (progressValue > 95) progressValue = 95;
      setProgress(Math.floor(progressValue));
    }, 150);

    const logInterval = setInterval(() => {
      const randomLog = terminalLogs[Math.floor(Math.random() * terminalLogs.length)];
      const time = new Date().toISOString().split('T')[1].slice(0, -1);
      setLogs(prev => [...prev, `[${time}] ${randomLog}`].slice(-20));
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [phase]);

  const startScan = useCallback(async () => {
    if (!input.trim() || phase === "scanning") return;
    setPhase("scanning");
    setLogs(["[SYSTEM] Initialisiere SynSight Cyber-Scan..."]);
    setProgress(0);
    setApiResult(null);

    const minWaitTime = new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      // WICHTIG: Hier nutzen wir /api/scan für den Proxy! 
      // Das löst deinen CSP-Fehler (Sicherheitsfehler).
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();
      await minWaitTime;
      
      setProgress(100);
      
      if (data.status === "success") {
        setApiResult({
          summary: data.summary,
          riskLevel: data.risk_level || "Erhöhtes Risiko"
        });
      } else {
        setApiResult({
          summary: "Fehler bei der Analyse: " + (data.message || "Unbekannter Fehler"),
          riskLevel: "Fehler"
        });
      }
    } catch (error) {
      setProgress(100);
      setApiResult({
        summary: "Netzwerkfehler: Der interne Proxy konnte den Scan-Server nicht erreichen.",
        riskLevel: "Offline"
      });
    } finally {
      setTimeout(() => {
        setPhase("complete");
      }, 500); 
    }
  }, [input, phase]);

  const reset = () => {
    setPhase("idle");
    setInput("");
    setApiResult(null);
    setLogs([]);
    setProgress(0);
  };

  return (
    <section id="demo-scanner" className="section-shell relative section-padding overflow-hidden">
        {/* Hier bleibt dein restliches UI wie du es hattest */}
        <div className="relative max-w-4xl mx-auto">
            {/* ... Dein restlicher JSX Code ... */}
            {/* (Ich habe hier den Teil für phase === "idle", "scanning", "complete" so gelassen, wie du ihn geschickt hast) */}
            {/* Stelle sicher, dass du deinen restlichen UI-Code hier wieder einfügst! */}
        </div>
    </section>
  );
}
