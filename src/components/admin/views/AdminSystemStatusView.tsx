"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SystemPayload = Record<string, string | number | boolean | null>;

const LABELS: Record<string, string> = {
  app: "Anwendung",
  application: "Anwendung",
  node: "Node.js",
  nodeVersion: "Node.js Version",
  environment: "Umgebung",
  database: "Datenbank",
  databaseStatus: "Datenbank",
  db: "Datenbank",
  mariadb: "MariaDB",
  mysql: "Datenbank",
  uptime: "Laufzeit",
  uptimeSeconds: "Laufzeit",
  memory: "Arbeitsspeicher",
  memoryMb: "Arbeitsspeicher",
  rssMb: "RAM · Prozess",
  heapUsedMb: "Heap belegt",
  heapTotalMb: "Heap gesamt",
  platform: "Betriebssystem",
  pid: "Prozess-ID",
  version: "Version",
  checkedAt: "Letzte Prüfung",
};

function labelFor(key: string): string {
  if (LABELS[key]) return LABELS[key];

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .toUpperCase();
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (key.toLowerCase().includes("uptime") && typeof value === "number") {
    const seconds = Math.max(0, Math.floor(value));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days} T ${hours} Std`;
    if (hours > 0) return `${hours} Std ${minutes} Min`;
    return `${minutes} Min`;
  }

  if (key === "checkedAt") {
    try {
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(String(value)));
    } catch {
      return String(value);
    }
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  return String(value);
}

function valueTone(value: unknown): string {
  const normalized = String(value ?? "").toLowerCase();

  if (
    [
      "ok",
      "online",
      "healthy",
      "ready",
      "connected",
      "active",
      "true",
    ].includes(normalized)
  ) {
    return "text-emerald-200/90";
  }

  if (
    normalized.includes("error") ||
    normalized.includes("offline") ||
    normalized.includes("failed") ||
    normalized.includes("unhealthy") ||
    normalized === "false"
  ) {
    return "text-rose-200/90";
  }

  if (
    normalized.includes("warning") ||
    normalized.includes("pending") ||
    normalized.includes("degraded")
  ) {
    return "text-amber-100/90";
  }

  return "text-white/80";
}

export default function AdminSystemStatusView() {
  const [system, setSystem] = useState<SystemPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/admin/system", {
        cache: "no-store",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        throw new Error(
          body?.error?.message ?? "Systemstatus konnte nicht geladen werden."
        );
      }

      setSystem(body.data);
      setLastRefresh(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Systemstatus konnte nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [load]);

  const cards = useMemo(
    () => Object.entries(system ?? {}).filter(([key]) => key !== "checkedAt"),
    [system]
  );

  if (loading && !system) {
    return <p className="text-sm text-white/40">Systemstatus wird geladen…</p>;
  }

  return (
    <div className="space-y-5">
      <section className="intel-cyber-hud relative overflow-hidden rounded-[1.3rem] border border-cyber-cyan/20 bg-[#050b14]/95 p-5">
        <div className="intel-cyber-scanlines" aria-hidden="true" />

        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
              SYSTEM COMMAND CENTER
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white/90">
              SynSight Systemstatus
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
              Technischer Zustand der Hauptanwendung und ihrer zentralen
              Laufzeitkomponenten. Die Anzeige aktualisiert sich automatisch
              alle 15 Sekunden.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-cyber-cyan/25 px-3 py-2 text-xs text-cyber-cyan/75"
          >
            Jetzt prüfen
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-300/20 bg-rose-300/[0.04] p-4">
          <p className="font-mono text-[8px] text-rose-200/60">SYSTEMWARNUNG</p>
          <p className="mt-2 text-sm text-rose-100/75">{error}</p>
          <p className="mt-2 text-xs text-white/40">
            Wenn die Seite selbst erreichbar ist, aber dieser Check fehlschlägt,
            zuerst Anwendung und Datenbank prüfen.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, value]) => (
          <article
            key={key}
            className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
          >
            <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
              {labelFor(key)}
            </p>

            <p className={`mt-3 text-lg font-medium ${valueTone(value)}`}>
              {formatValue(key, value)}
            </p>

            <p className="mt-2 font-mono text-[8px] text-white/20">
              Quelle · /api/admin/system
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
          <p className="font-mono text-[8px] text-emerald-100/55">NORMAL</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Online, OK, Healthy oder Connected bedeuten grundsätzlich, dass die
            jeweilige Komponente erreichbar arbeitet.
          </p>
        </article>

        <article className="rounded-xl border border-amber-300/15 bg-amber-300/[0.03] p-4">
          <p className="font-mono text-[8px] text-amber-100/55">BEOBACHTEN</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Pending, Warning oder Degraded bedeutet nicht zwingend Ausfall,
            sollte aber bei dauerhafter Anzeige untersucht werden.
          </p>
        </article>

        <article className="rounded-xl border border-rose-300/15 bg-rose-300/[0.03] p-4">
          <p className="font-mono text-[8px] text-rose-100/55">PRÜFEN</p>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Offline, Failed oder Error deutet auf einen konkreten Fehler oder
            eine nicht erreichbare Komponente hin.
          </p>
        </article>
      </section>

      <p className="font-mono text-[9px] text-white/25">
        Letzte Aktualisierung ·{" "}
        {lastRefresh
          ? lastRefresh.toLocaleTimeString("de-DE")
          : system?.checkedAt
            ? formatValue("checkedAt", system.checkedAt)
            : "—"}
      </p>
    </div>
  );
}
