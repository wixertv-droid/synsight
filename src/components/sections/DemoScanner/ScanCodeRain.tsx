"use client";

import { useEffect, useState } from "react";

const LOG_TEMPLATES = [
  "INITIALIZING SECURE SOCKET LAYER ... [OK]",
  "BYPASSING PROXY SHIELD & RESOLVING HOST ...",
  "HOLEHE: QUERYING 120+ VENDORS FOR ACCOUNT CORRELATION ...",
  "MAIGRET: SCANNING SOCIAL MATRICES & FORUM ARCHIVES ...",
  "SHERLOCK: CROSS-CHECKING HANDLE ENTITIES ACROSS DOMAINS ...",
  "PHONEINFOGA: PARSING CARRIER & HLR LOOKUP METRICS ...",
  "ESTABLISHING SECURE TUNNEL TO CONTABO BACKEND NODE [5002] ...",
  "EXTRACTING PUBLIC EXPOSURE METADATA & LEAK VECTORS ...",
  "COMPILING HEURISTIC RISK SCORE AND EXPOSURE VECTORS ...",
  "SYN|SIGHT CORE: GENERATING REAL-TIME INTELLIGENCE BRIEFING ...",
  "PARSING JSON PAYLOAD STREAM ... SUCCESS",
  "VERIFYING INTEGRITY OF TARGET IDENTIFIERS ... [SECURE]",
];

export default function ScanCodeRain() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const initialLogs = Array.from({ length: 25 }, (_, i) => {
      const template = LOG_TEMPLATES[i % LOG_TEMPLATES.length];
      const randomHex = Math.random()
        .toString(16)
        .substring(2, 8)
        .toUpperCase();
      return `[${randomHex}] ${template}`;
    });
    setLogs(initialLogs);

    const interval = setInterval(() => {
      setLogs((prev) => {
        const randomTemplate =
          LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
        const randomHex = Math.random()
          .toString(16)
          .substring(2, 8)
          .toUpperCase();
        const newLine = `[${randomHex}] ${randomTemplate}`;
        return [...prev.slice(1), newLine];
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="scan-code-rain pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-40">
      <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end px-6 py-8 font-mono text-[11px] leading-[1.7] text-emerald-400 [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_50%,rgba(0,0,0,0)_100%)]">
        <div className="flex flex-col space-y-1">
          {logs.map((log, index) => (
            <div
              key={index}
              className="whitespace-nowrap tracking-wider"
              style={{
                opacity: Math.max(0.15, index / logs.length),
              }}
            >
              {`> ${log}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
