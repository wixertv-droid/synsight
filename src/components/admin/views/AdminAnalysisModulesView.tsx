"use client";

import { useEffect, useState } from "react";

interface AnalysisRow {
  id: number;
  analysisKey: string;
  label: string;
  credits: number;
  isActive: boolean;
}

export default function AdminAnalysisModulesView() {
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setRows(body.data.analyses);
      })
      .catch(() => undefined);
  }, []);

  async function toggle(row: AnalysisRow) {
    setBusy(row.id);
    try {
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_analysis",
          analysisKey: row.analysisKey,
          label: row.label,
          credits: row.credits,
          isActive: !row.isActive,
          sortOrder: row.id,
        }),
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-white/80">{row.label}</p>
            <p className="font-mono text-[10px] text-white/35">
              {row.analysisKey} · {row.credits} SynCredits
            </p>
          </div>
          <button
            type="button"
            disabled={busy === row.id}
            onClick={() => void toggle(row)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              row.isActive
                ? "border-emerald-300/30 text-emerald-100/75"
                : "border-white/15 text-white/40"
            }`}
          >
            {row.isActive ? "Aktiv" : "Inaktiv"}
          </button>
        </li>
      ))}
    </ul>
  );
}
