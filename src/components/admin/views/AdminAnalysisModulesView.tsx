"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  UsernameFinanceSnapshot,
  UsernameModuleSettings,
} from "@/lib/analysis/username/types";
import type { ReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings-types";
import { DIGITAL_LEAK_RETENTION_PRESETS } from "@/lib/analysis/retention";
import type { PlatformSettings } from "@/lib/services/admin-platform-service";

interface AnalysisRow {
  id: number;
  analysisKey: string;
  label: string;
  credits: number;
  isActive: boolean;
  sortOrder: number;
}

const emptySettings: UsernameModuleSettings = {
  isActive: true,
  apiEnabled: true,
  maxQueries: 8,
  countries: "de",
  language: "de",
  resultLimit: 40,
  confidenceMin: 60,
  synCredits: 10,
  serpapiCostEur: 0.023,
  geminiCostEur: 0.002,
  markupPercent: 100,
  minProfitEur: 0.05,
  creditValueEur: 0.01,
};

const emptyReverseImageSettings: ReverseImageModuleSettings = {
  isActive: true,
  publicScanActive: true,
  faceVerificationActive: true,
  apiEnabled: true,
  compareUrl: "http://161.97.85.22:8000/compare",
  similarityThreshold: 0.35,
  compareTimeoutMs: 12_000,
};

export default function AdminAnalysisModulesView() {
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [moduleMsg, setModuleMsg] = useState<string | null>(null);
  const [usernameSettings, setUsernameSettings] =
    useState<UsernameModuleSettings>(emptySettings);
  const [usernameFinance, setUsernameFinance] =
    useState<UsernameFinanceSnapshot | null>(null);
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings | null>(null);
  const [retentionBusy, setRetentionBusy] = useState(false);
  const [retentionMsg, setRetentionMsg] = useState<string | null>(null);
  const [reverseImageSettings, setReverseImageSettings] =
    useState<ReverseImageModuleSettings>(emptyReverseImageSettings);
  const [reverseImageBusy, setReverseImageBusy] = useState(false);
  const [reverseImageMsg, setReverseImageMsg] = useState<string | null>(null);

  const loadUsername = useCallback(async () => {
    const response = await fetch("/api/admin/username-module");
    const body = await response.json().catch(() => null);
    if (response.ok && body?.success) {
      setUsernameSettings(body.data.settings);
      setUsernameFinance(body.data.finance);
    }
  }, []);

  const loadReverseImage = useCallback(async () => {
    const response = await fetch("/api/admin/reverse-image-module");
    const body = await response.json().catch(() => null);
    if (response.ok && body?.success) {
      setReverseImageSettings(body.data.settings);
    }
  }, []);

  const loadPlatform = useCallback(async () => {
    const response = await fetch("/api/admin/platform-settings");
    const body = await response.json().catch(() => null);
    if (response.ok && body?.success) {
      setPlatformSettings(body.data.settings);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setRows(body.data.analyses);
      })
      .catch(() => undefined);
    void loadUsername();
    void loadReverseImage();
    void loadPlatform();
  }, [loadUsername, loadReverseImage, loadPlatform]);

  async function saveDigitalLeakRetention(days: number) {
    if (!platformSettings) return;
    setRetentionBusy(true);
    setRetentionMsg(null);
    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageMaxUploadMb: platformSettings.imageMaxUploadMb,
          imageCompressionQuality: platformSettings.imageCompressionQuality,
          imageWebpQuality: platformSettings.imageWebpQuality,
          imageThumbnailQuality: platformSettings.imageThumbnailQuality,
          imageMaxResolution: platformSettings.imageMaxResolution,
          encryptOriginals: platformSettings.encryptOriginals,
          generateAnalysisImages: platformSettings.generateAnalysisImages,
          digitalLeakDefaultRetentionDays: days,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setRetentionMsg(body?.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setPlatformSettings(body.data.settings);
      setRetentionMsg("Digital-Leak-Aufbewahrung gespeichert.");
    } finally {
      setRetentionBusy(false);
    }
  }

  async function toggle(row: AnalysisRow) {
    setBusy(row.id);
    setModuleMsg(null);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          analysisKey: row.analysisKey,
          label: row.label,
          description: null,
          credits: row.credits,
          isActive: !row.isActive,
          sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 100,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setModuleMsg(
          body?.error?.message ??
            `Modul „${row.label}“ konnte nicht gespeichert werden.`
        );
        return;
      }
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isActive: !item.isActive } : item
        )
      );
      if (row.analysisKey === "username_intelligence") {
        await fetch("/api/admin/username-module", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !row.isActive }),
        });
        void loadUsername();
      }
      if (
        row.analysisKey === "public_image_exposure_scan" ||
        row.analysisKey === "reverse_image_discovery" ||
        row.analysisKey === "reverse_image_search"
      ) {
        await fetch("/api/admin/reverse-image-module", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicScanActive: !row.isActive }),
        });
        void loadReverseImage();
      }
      if (
        row.analysisKey === "face_identity_verification" ||
        row.analysisKey === "reverse_image_compare"
      ) {
        await fetch("/api/admin/reverse-image-module", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ faceVerificationActive: !row.isActive }),
        });
        void loadReverseImage();
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveUsernameSettings() {
    setUsernameBusy(true);
    setUsernameMsg(null);
    try {
      const response = await fetch("/api/admin/username-module", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usernameSettings),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setUsernameMsg(body?.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setUsernameSettings(body.data.settings);
      setUsernameFinance(body.data.finance);
      setUsernameMsg("Username Intelligence Einstellungen gespeichert.");
      setRows((current) =>
        current.map((row) =>
          row.analysisKey === "username_intelligence"
            ? {
                ...row,
                isActive: body.data.settings.isActive,
                credits: body.data.settings.synCredits,
              }
            : row
        )
      );
    } finally {
      setUsernameBusy(false);
    }
  }

  async function saveReverseImageSettings() {
    setReverseImageBusy(true);
    setReverseImageMsg(null);
    try {
      const response = await fetch("/api/admin/reverse-image-module", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reverseImageSettings),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setReverseImageMsg(body?.error?.message ?? "Speichern fehlgeschlagen.");
        return;
      }
      setReverseImageSettings(body.data.settings);
      setReverseImageMsg("Reverse Image / Face-Erkennung gespeichert.");
    } finally {
      setReverseImageBusy(false);
    }
  }

  return (
    <div className="space-y-6">
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

      {moduleMsg ? (
        <p className="text-sm text-rose-200/80" role="alert">
          {moduleMsg}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-[#060d16]/90 p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.16em] text-white/45">
          DIGITAL LEAK & EXPOSURE · AUFBEWAHRUNG
        </p>
        <p className="mt-2 text-sm text-white/45">
          Standard-Aufbewahrung neuer Scan-Ergebnisse (Admin-Vorgabe).
        </p>
        <label className="mt-4 block max-w-md rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
          <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
            RETENTION
          </span>
          <select
            disabled={!platformSettings || retentionBusy}
            value={String(
              platformSettings?.digitalLeakDefaultRetentionDays ?? 90
            )}
            onChange={(event) =>
              void saveDigitalLeakRetention(Number(event.target.value))
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          >
            {DIGITAL_LEAK_RETENTION_PRESETS.map((preset) => (
              <option key={preset.days} value={preset.days}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        {retentionMsg ? (
          <p className="mt-3 text-xs text-white/45">{retentionMsg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-cyber-cyan/20 bg-[#060d16]/90 p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
          USERNAME INTELLIGENCE SCAN · EINSTELLUNGEN
        </p>
        <p className="mt-2 text-sm text-white/45">
          Modul aktiv, API, SynCredits, Suchlimits und Confidence.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["isActive", "Modul aktiv", "checkbox"],
              ["apiEnabled", "API aktivieren", "checkbox"],
              ["synCredits", "SynCredits", "number"],
              ["maxQueries", "Maximale Suchanfragen (5–8)", "number"],
              ["countries", "Länder", "text"],
              ["language", "Sprache", "text"],
              ["resultLimit", "Ergebnislimit", "number"],
              ["confidenceMin", "Confidence Mindestwert", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label
              key={key}
              className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3"
            >
              <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
                {label.toUpperCase()}
              </span>
              {type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(usernameSettings[key])}
                  onChange={(event) =>
                    setUsernameSettings((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="mt-2 block"
                />
              ) : (
                <input
                  type={type}
                  value={String(usernameSettings[key] ?? "")}
                  onChange={(event) =>
                    setUsernameSettings((current) => ({
                      ...current,
                      [key]:
                        type === "number"
                          ? Number(event.target.value)
                          : event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                />
              )}
            </label>
          ))}
        </div>

        {usernameFinance ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/[0.06] px-3 py-2">
              <p className="font-mono text-[7px] text-white/30">API KOSTEN Ø</p>
              <p className="text-sm text-white/75">
                {usernameFinance.estimatedApiCostEur.toFixed(4)} €
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] px-3 py-2">
              <p className="font-mono text-[7px] text-white/30">
                KOSTEN / ANALYSE
              </p>
              <p className="text-sm text-white/75">
                {usernameFinance.costPerAnalysisEur.toFixed(4)} €
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] px-3 py-2">
              <p className="font-mono text-[7px] text-white/30">
                GEWINN / ANALYSE
              </p>
              <p className="text-sm text-white/75">
                {usernameFinance.profitPerAnalysisEur.toFixed(4)} €
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={usernameBusy}
            onClick={() => void saveUsernameSettings()}
            className="rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/[0.1] px-4 py-2 text-sm text-cyber-cyan"
          >
            {usernameBusy ? "Speichern…" : "Einstellungen speichern"}
          </button>
          {usernameMsg ? (
            <p className="text-xs text-white/45">{usernameMsg}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-violet-400/20 bg-[#060d16]/90 p-5 md:p-6">
        <p className="font-mono text-[9px] tracking-[.16em] text-violet-300/70">
          PUBLIC IMAGE EXPOSURE + FACE IDENTITY · EINSTELLUNGEN
        </p>
        <p className="mt-2 text-sm text-white/45">
          InsightFace-Server, Treffer-Schwellenwert und API-Status.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3 sm:col-span-2">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              INSIGHTFACE COMPARE URL
            </span>
            <input
              type="url"
              value={reverseImageSettings.compareUrl}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  compareUrl: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-violet-400/35"
            />
          </label>
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              TREFFER-SCHWELLE (0.35–0.95)
            </span>
            <input
              type="number"
              min={0.35}
              max={0.95}
              step={0.05}
              value={reverseImageSettings.similarityThreshold}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  similarityThreshold: Number(event.target.value),
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-violet-400/35"
            />
          </label>
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              TIMEOUT (MS)
            </span>
            <input
              type="number"
              min={3000}
              max={60000}
              step={1000}
              value={reverseImageSettings.compareTimeoutMs}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  compareTimeoutMs: Number(event.target.value),
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-violet-400/35"
            />
          </label>
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              API AKTIV
            </span>
            <input
              type="checkbox"
              checked={reverseImageSettings.apiEnabled}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  apiEnabled: event.target.checked,
                }))
              }
              className="mt-2 block"
            />
          </label>
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              PUBLIC SCAN AKTIV
            </span>
            <input
              type="checkbox"
              checked={reverseImageSettings.publicScanActive}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  publicScanActive: event.target.checked,
                }))
              }
              className="mt-2 block"
            />
          </label>
          <label className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
            <span className="font-mono text-[8px] tracking-[.12em] text-white/30">
              FACE VERIFICATION AKTIV
            </span>
            <input
              type="checkbox"
              checked={reverseImageSettings.faceVerificationActive}
              onChange={(event) =>
                setReverseImageSettings((current) => ({
                  ...current,
                  faceVerificationActive: event.target.checked,
                }))
              }
              className="mt-2 block"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={reverseImageBusy}
            onClick={() => void saveReverseImageSettings()}
            className="rounded-lg border border-violet-400/40 bg-violet-400/[0.1] px-4 py-2 text-sm text-violet-200"
          >
            {reverseImageBusy ? "Speichern…" : "Face-Erkennung speichern"}
          </button>
          {reverseImageMsg ? (
            <p className="text-xs text-white/45">{reverseImageMsg}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
