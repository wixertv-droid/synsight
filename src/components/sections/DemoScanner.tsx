"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";

interface ScanResult {
  summary: string;
  risk_level: string;
}

export default function DemoScanner() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const startScan = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      
      const data: ScanResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GlassCard className="p-6">
        {/* Eingabebereich wie am Anfang */}
        {!result && !loading && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Risiko-Check</h2>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E-Mail oder Name eingeben..."
              className="w-full p-3 bg-black border border-white/20 rounded text-white"
            />
            <Button onClick={startScan}>Scan starten</Button>
          </div>
        )}

        {/* Ladezustand */}
        {loading && (
          <div className="text-center p-10">
            <p>Analyse läuft...</p>
          </div>
        )}

        {/* Ergebnisbereich wie am Anfang */}
        {result && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Scan-Ergebnis</h2>
            <p>Risiko: {result.risk_level}</p>
            <p className="text-gray-300">{result.summary}</p>
            <Button onClick={() => setResult(null)}>Neue Suche</Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
