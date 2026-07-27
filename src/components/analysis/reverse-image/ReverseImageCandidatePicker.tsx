"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SerpImageCandidate } from "@/lib/analysis/reverse-image/serpapi-images";
import ConsumeConfirm from "@/components/credits/ConsumeConfirm";

interface SourceGroup {
  id: string;
  label: string;
  group: string;
  count: number;
}

export default function ReverseImageCandidatePicker({
  scanId,
  onCompareStarted,
}: {
  scanId: number;
  onCompareStarted: (payload: { requestId: string }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<SourceGroup[]>([]);
  const [resultsByQuery, setResultsByQuery] = useState<
    Record<string, SerpImageCandidate[]>
  >({});
  const [activeGroupId, setActiveGroupId] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualUrl, setManualUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [confirmCompare, setConfirmCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/analysis/reverse-image/sources?scanId=${scanId}`,
        { cache: "no-store" }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ?? "Quellen konnten nicht geladen werden."
        );
        return;
      }
      setGroups(body.data.groups ?? []);
      setResultsByQuery(body.data.resultsByQuery ?? {});
      const preselected =
        (body.data.selectedImageUrls as string[] | undefined) ?? [];
      if (preselected.length) {
        setSelected(new Set(preselected.map((url) => url.toLowerCase())));
      }
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const visibleCandidates = useMemo(() => {
    if (activeGroupId === "all") {
      return Object.values(resultsByQuery).flat();
    }
    return resultsByQuery[activeGroupId] ?? [];
  }, [activeGroupId, resultsByQuery]);

  const toggle = (url: string) => {
    const key = url.toLowerCase();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const candidate of visibleCandidates) {
        next.add(candidate.imageUrl.toLowerCase());
      }
      return next;
    });
  };

  const saveSelection = async (
    urls: string[],
    manual?: { imageUrl: string; title: string }
  ) => {
    await fetch("/api/analysis/reverse-image/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scanId,
        selectedImageUrls: urls,
        manualCandidate: manual,
      }),
    });
  };

  const addManual = async () => {
    const url = manualUrl.trim();
    if (!url.startsWith("http")) {
      setError("Bitte eine gültige http(s)-Bild-URL eingeben.");
      return;
    }
    const title = manualTitle.trim() || "Manuell hinzugefügt";
    await saveSelection(
      [...selected].map((k) => {
        const found = visibleCandidates.find(
          (c) => c.imageUrl.toLowerCase() === k
        );
        return found?.imageUrl ?? k;
      }),
      { imageUrl: url, title }
    );
    setManualUrl("");
    setManualTitle("");
    await loadSources();
    setSelected((current) => new Set(current).add(url.toLowerCase()));
  };

  const handleCompareConfirmed = async (payload: { requestId: string }) => {
    const urls = [...selected]
      .map((key) => {
        for (const list of Object.values(resultsByQuery)) {
          const hit = list.find((c) => c.imageUrl.toLowerCase() === key);
          if (hit) return hit.imageUrl;
        }
        return key;
      })
      .filter(Boolean);

    if (!urls.length) {
      setError("Bitte mindestens ein Bild auswählen.");
      return;
    }

    await saveSelection(urls);
    const response = await fetch("/api/analysis/reverse-image/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scanId,
        selectedImageUrls: urls,
        requestId: payload.requestId,
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      setError(
        body?.error?.message ?? "Vergleich konnte nicht gestartet werden."
      );
      return;
    }
    onCompareStarted(payload);
  };

  const proxy = (url: string) =>
    `/api/analysis/reverse-image/proxy-image?scanId=${scanId}&url=${encodeURIComponent(url)}`;

  if (loading) {
    return (
      <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-sm text-white/45">
        Lade gespeicherte Bildlinks…
      </p>
    );
  }

  return (
    <section className="space-y-5 rounded-[1.2rem] border border-cyber-cyan/20 bg-[#060d16]/90 p-5 md:p-6">
      <div>
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          PHASE 1 ABGESCHLOSSEN · BILDER AUSWÄHLEN
        </p>
        <p className="mt-2 text-sm text-white/55">
          Wählen Sie die Bildlinks für den InsightFace-Vergleich. Die Bildsuche
          ist bereits bezahlt — der Gesichtsvergleich wird separat berechnet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveGroupId("all")}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            activeGroupId === "all"
              ? "border-cyber-cyan/40 bg-cyber-cyan/[0.1] text-cyber-cyan"
              : "border-white/10 text-white/50"
          }`}
        >
          Alle
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroupId(group.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              activeGroupId === group.id
                ? "border-cyber-cyan/40 bg-cyber-cyan/[0.1] text-cyber-cyan"
                : "border-white/10 text-white/50"
            }`}
          >
            {group.label} ({group.count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllVisible}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60"
        >
          Alle in Filter auswählen
        </button>
        <span className="self-center font-mono text-[10px] text-white/35">
          {selected.size} ausgewählt
        </span>
      </div>

      <ul className="max-h-[420px] space-y-2 overflow-y-auto">
        {visibleCandidates.length === 0 ? (
          <li className="text-sm text-white/40">
            Keine Bilder in diesem Filter.
          </li>
        ) : (
          visibleCandidates.map((candidate) => {
            const checked = selected.has(candidate.imageUrl.toLowerCase());
            return (
              <li
                key={candidate.imageUrl}
                className={`flex gap-3 rounded-lg border p-2 ${
                  checked
                    ? "border-emerald-400/30 bg-emerald-400/[0.05]"
                    : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(candidate.imageUrl)}
                  className="mt-2"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxy(candidate.imageUrl)}
                  alt={candidate.title}
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/80">
                    {candidate.title}
                  </p>
                  <p className="font-mono text-[9px] text-white/35">
                    {candidate.queryLabel ?? candidate.query} ·{" "}
                    {candidate.sourceHost}
                  </p>
                  <a
                    href={candidate.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] text-cyber-cyan/70 hover:underline"
                  >
                    Bildlink öffnen
                  </a>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
        <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
          MANUELLEN BILDLINK HINZUFÜGEN
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://…/bild.jpg"
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />
          <input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Bezeichnung (optional)"
            className="min-w-[160px] rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80"
          />
          <button
            type="button"
            onClick={() => void addManual()}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/65"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-200/80" role="alert">
          {error}
        </p>
      ) : null}

      {!confirmCompare ? (
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => setConfirmCompare(true)}
          className="rounded-xl border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-5 py-3 text-sm text-cyber-cyan disabled:opacity-40"
        >
          Gesichtsvergleich starten ({selected.size} Bilder)
        </button>
      ) : (
        <div>
          <ConsumeConfirm
            analysisKey="reverse_image_compare"
            confirmLabel="Vergleich bestätigen"
            onCompleted={(payload) => void handleCompareConfirmed(payload)}
          />
          <button
            type="button"
            onClick={() => setConfirmCompare(false)}
            className="mt-2 text-sm text-white/40"
          >
            Abbrechen
          </button>
        </div>
      )}
    </section>
  );
}
