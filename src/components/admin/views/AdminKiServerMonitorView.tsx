"use client";

import { useEffect, useRef, useState } from "react";
import type { Chart, ChartConfiguration } from "chart.js";
import type { KiServerStatusPayload } from "@/lib/admin/ki-server-status";

const MAX_POINTS = 20;
const POLL_MS = 1_000;
const NEON = "#00ffcc";

function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatClock(date = new Date()): string {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminKiServerMonitorView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const [status, setStatus] = useState<KiServerStatusPayload | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function setup() {
      const {
        Chart,
        Filler,
        LineController,
        LineElement,
        LinearScale,
        CategoryScale,
        PointElement,
      } = await import("chart.js");
      Chart.register(
        LineController,
        LineElement,
        LinearScale,
        CategoryScale,
        PointElement,
        Filler
      );

      if (cancelled || !canvasRef.current) return;

      const config: ChartConfiguration<"line"> = {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "active_tasks",
              data: [],
              borderColor: NEON,
              backgroundColor: "rgba(0, 255, 204, 0.14)",
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 3,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: {
              ticks: {
                color: "rgba(255,255,255,0.35)",
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6,
                font: { size: 10, family: "ui-monospace, monospace" },
              },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 5,
              ticks: {
                color: "rgba(255,255,255,0.35)",
                stepSize: 1,
                font: { size: 10, family: "ui-monospace, monospace" },
              },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(6,13,22,0.95)",
              borderColor: "rgba(0,255,204,0.35)",
              borderWidth: 1,
              titleColor: NEON,
              bodyColor: "rgba(255,255,255,0.8)",
            },
          },
        },
      };

      chartRef.current = new Chart(canvasRef.current, config);

      const pushPoint = (tasks: number) => {
        const chart = chartRef.current;
        if (!chart) return;
        const labels = chart.data.labels as string[];
        const data = chart.data.datasets[0]?.data as number[];
        labels.push(formatClock());
        data.push(tasks);
        while (labels.length > MAX_POINTS) labels.shift();
        while (data.length > MAX_POINTS) data.shift();
        chart.update("none");
      };

      const poll = async () => {
        try {
          const response = await fetch("/api/admin/ki-server/status", {
            cache: "no-store",
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body?.success) {
            throw new Error(body?.error?.message ?? "Status nicht ladbar");
          }
          const payload = body.data as KiServerStatusPayload;
          if (cancelled) return;
          setStatus(payload);
          setLastError(payload.error);
          pushPoint(
            payload.online || payload.activeTasks > 0 ? payload.activeTasks : 0
          );
        } catch (error) {
          if (cancelled) return;
          setStatus({
            online: false,
            status: "offline",
            aiEngine: "unreachable",
            activeTasks: 0,
            uptimeSeconds: 0,
            checkedAt: new Date().toISOString(),
            sourceUrl: "",
            error: error instanceof Error ? error.message : "Offline",
          });
          setLastError(error instanceof Error ? error.message : "Offline");
          pushPoint(0);
        }
      };

      await poll();
      intervalId = window.setInterval(() => {
        void poll();
      }, POLL_MS);
    }

    void setup();

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  const serverOnline = Boolean(status?.online);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          KI-SERVER · LIVE MONITOR
        </p>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Status und Last der InsightFace-/KI-Engine — Abfrage jede Sekunde.
          Active Tasks zählen laufende Gesichtsvergleiche (auch wenn
          Remote-/status keine Last meldet).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
            SERVER
          </p>
          <p
            className={`mt-3 text-lg font-medium ${
              serverOnline ? "text-emerald-300/90" : "text-rose-300/90"
            }`}
          >
            {serverOnline ? "Online" : "Offline"}
          </p>
        </article>

        <article className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
            KI-ENGINE
          </p>
          <p className="mt-3 text-lg font-medium text-white/85">
            {status?.aiEngine ?? "—"}
          </p>
        </article>

        <article className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
            UPTIME
          </p>
          <p className="mt-3 text-lg font-medium text-white/85">
            {status ? formatUptime(status.uptimeSeconds) : "—"}
          </p>
        </article>
      </div>

      <section className="hardware-panel rounded-2xl border border-cyber-cyan/20 bg-[#060d16]/95 p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-[#00ffcc]/70">
              ACTIVE TASKS · EKG
            </p>
            <p className="mt-1 font-mono text-[10px] text-white/35">
              Letzte {MAX_POINTS} Messpunkte · Y: 0–5
            </p>
          </div>
          <p className="font-mono text-[10px] text-white/40">
            Tasks:{" "}
            <span className="text-[#00ffcc]">{status?.activeTasks ?? 0}</span>
          </p>
        </div>
        <div className="relative h-[260px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#04080f]">
          <canvas
            id="kiLoadChart"
            ref={canvasRef}
            className="h-full w-full"
            aria-label="KI-Server Last als Liniendiagramm"
          />
        </div>
        {lastError ? (
          <p className="mt-3 text-xs text-rose-200/75" role="alert">
            Verbindung: {lastError}
          </p>
        ) : status?.sourceUrl ? (
          <p className="mt-3 font-mono text-[9px] text-white/25">
            Quelle: {status.sourceUrl}
          </p>
        ) : null}
      </section>
    </div>
  );
}
