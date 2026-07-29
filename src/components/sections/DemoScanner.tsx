"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

type ScanPhase = "idle" | "scanning" | "fullscreen_result" | "closing_crt" | "complete";

export default function DemoScanner() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [apiResult, setApiResult] = useState<{ summary: string; riskLevel: string } | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [progress, setProgress] = useState(0);

  // Animations-Logik für das HUD
  useEffect(() => {
    if (phase !== "scanning") return;
    let val = 0;
    const interval = setInterval(() => {
      val += Math.random() * 2;
      setProgress(Math.min(99, Math.floor(val)));
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  const startScan = useCallback(async () => {
    setPhase("scanning");
    setProgress(0);
    const minWait = new Promise(res => setTimeout(res, 5000));
    
    try {
      const data = await fetch("/api/scan", { method: "POST", body: JSON.stringify({ query: input })}).then(res => res.json());
      setRawData(data);
      setApiResult({ summary: data.summary, riskLevel: data.risk_level || "Erhöhtes Risiko" });
    } catch {
      setApiResult({ summary: "Verbindungsfehler.", riskLevel: "Offline" });
    } finally {
      setTimeout(() => setPhase("fullscreen_result"), 500);
    }
  }, [input]);

  const closeFullscreen = () => {
    setPhase("closing_crt");
    setTimeout(() => setPhase("complete"), 1500); // Längere CRT-Animation
  };

  return (
    <>
      <style jsx global>{`
        @keyframes crt-collapse {
          0% { transform: scale(1, 1); filter: brightness(1); }
          50% { transform: scale(1, 0.01); filter: brightness(3); opacity: 1; }
          70% { transform: scale(0.01, 0.01); filter: brightness(10); opacity: 1; }
          100% { transform: scale(0, 0); opacity: 0; }
        }
        .crt-off { animation: crt-collapse 1.5s cubic-bezier(0.5, 0, 0.1, 1) forwards; }
        .hud-grid { background-image: linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px); background-size: 40px 40px; }
      `}</style>

      {(phase === "scanning" || phase === "fullscreen_result" || phase === "closing_crt") && (
        <div className={`fixed inset-0 z-[999] bg-black flex items-center justify-center overflow-hidden ${phase === "closing_crt" ? "crt-off" : ""}`}>
          {/* Cyber Background Layer */}
          <div className="absolute inset-0 hud-grid opacity-50" />
          
          {/* Scanning Overlay */}
          {phase === "scanning" && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {/* Complex Rotating Rings */}
              <div className="relative w-[500px] h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 border-[0.5px] border-cyber-cyan/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-10 border-[1px] border-cyber-blue/50 rounded-full animate-[spin_reverse_15s_linear_infinite]" />
                <div className="absolute inset-20 border-[2px] border-cyber-cyan/80 rounded-full animate-[spin_5s_linear_infinite] shadow-[0_0_20px_#00ffff]" />
                <div className="text-6xl font-black text-white tracking-widest">{progress}%</div>
              </div>
              
              {/* Data Decryption Stream */}
              <div className="absolute bottom-20 w-3/4 h-20 text-[10px] text-cyber-cyan font-mono overflow-hidden opacity-60">
                {Array.from({length: 10}).map((_, i) => (
                    <div key={i} className="animate-pulse">STREAM_{Math.random().toString(36).substring(7).toUpperCase()}_VECTOR_LOCK: {Math.random().toFixed(4)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Result View */}
          {phase === "fullscreen_result" && (
            <div className="w-full max-w-4xl p-10 border border-cyber-cyan/20 bg-black/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,255,255,0.1)] animate-in zoom-in duration-700">
               <h1 className="text-4xl text-cyber-cyan font-bold mb-8 uppercase tracking-widest">Analyse-Bericht: {input}</h1>
               <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="text-white border-l-2 border-cyber-cyan pl-4">{apiResult?.summary}</div>
                    <div className="text-cyber-cyan text-sm">{apiResult?.riskLevel}</div>
                 </div>
                 <div className="text-[10px] text-gray-500 font-mono bg-black p-4 border border-white/10 max-h-60 overflow-y-auto">
                    {JSON.stringify(rawData, null, 2)}
                 </div>
               </div>
               <button onClick={closeFullscreen} className="mt-8 border border-red-500 text-red-500 px-6 py-2 hover:bg-red-500/10">System Offline</button>
            </div>
          )}
        </div>
      )}

      {/* Main UI (Idle / Complete) */}
      <section className="section-padding">
        {/* Hier den Rest deiner normalen UI beibehalten */}
        {phase === "idle" && (
             <div className="flex gap-4">
               <input className="bg-black border border-cyber-cyan p-4" onChange={(e) => setInput(e.target.value)} />
               <Button onClick={startScan}>GLOBAL SCAN</Button>
             </div>
        )}
      </section>
    </>
  );
}
