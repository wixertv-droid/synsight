"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleIntelligenceReport from "@/components/analysis/google/GoogleIntelligenceReport";
import DigitalExposureReportView from "@/components/analysis/digital-exposure/DigitalExposureReportView";
import UsernameIntelligenceReportView from "@/components/analysis/username/UsernameIntelligenceReportView";
import ReverseImageReportView from "@/components/analysis/reverse-image/ReverseImageReportView";
import ReverseImageLiveScanPanel from "@/components/analysis/reverse-image/ReverseImageLiveScanPanel";
import ReverseImageCandidatePicker from "@/components/analysis/reverse-image/ReverseImageCandidatePicker";
import IntelligenceScanSequence from "@/components/analysis/intelligence/IntelligenceScanSequence";
import DashboardPageRail from "@/components/dashboard/DashboardPageRail";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { digitalLeakExposureModule } from "@/lib/analysis/digital-exposure/module";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import { usernameIntelligenceModule } from "@/lib/analysis/username/module";
import type { UsernameReport } from "@/lib/analysis/username/types";
import { reverseImageSearchModule } from "@/lib/analysis/reverse-image/module";
import type {
  ReverseImageReport,
  ReverseImageHit,
} from "@/lib/analysis/reverse-image/types";
import type { ReverseImageLiveScanEntry } from "@/lib/analysis/reverse-image/serp-checkpoint";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  DEFAULT_REPORT_RETENTION_DAYS,
  parseRetentionDays,
  REPORT_RETENTION_PRESETS,
  REPORT_RETENTION_STORAGE_KEY,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { RESULTS_CENTER_RAIL } from "@/lib/dashboard/page-rails";

export interface ResultsTabModule {
  id: string;
  title: string;
  help: string;
  tagline: string;
  available: boolean;
}

function readStoredRetention(): ReportRetentionDays {
  if (typeof window === "undefined") return DEFAULT_REPORT_RETENTION_DAYS;
  try {
    return parseRetentionDays(
      window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
    );
  } catch {
    return DEFAULT_REPORT_RETENTION_DAYS;
  }
}

async function loadLatestReport(): Promise<IntelligenceReport | null> {
  const response = await fetch("/api/analysis/google/latest", {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) return null;
  return normalizeIntelligenceReport(body.data?.report);
}

async function loadLatestExposureReport(): Promise<DigitalExposureReport | null> {
  const response = await fetch("/api/analysis/digital-exposure/latest", {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) return null;
  return (body.data?.report as DigitalExposureReport | null) ?? null;
}

async function loadLatestUsernameReport(): Promise<UsernameReport | null> {
  const response = await fetch("/api/analysis/username/latest", {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) return null;
  return (body.data?.report as UsernameReport | null) ?? null;
}

async function loadLatestReverseImageReport(): Promise<{
  report: ReverseImageReport | null;
  pending: {
    scanId: number;
    status: string;
    candidateCount: number;
  } | null;
}> {
  const response = await fetch("/api/analysis/reverse-image/latest", {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    return { report: null, pending: null };
  }
  return {
    report: (body.data?.report as ReverseImageReport | null) ?? null,
    pending: body.data?.pending ?? null,
  };
}

export default function ResultsCenterClient({
  modules,
  initialGoogleReport,
  initialExposureReport = null,
  initialUsernameReport = null,
  initialReverseImageReport = null,
  subjectName,
}: {
  modules: ResultsTabModule[];
  initialGoogleReport: IntelligenceReport | null;
  initialExposureReport?: DigitalExposureReport | null;
  initialUsernameReport?: UsernameReport | null;
  initialReverseImageReport?: ReverseImageReport | null;
  subjectName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = modules;

  const requestedTabRaw = searchParams.get("tab") ?? tabs[0]?.id ?? "";
  const requestedTab =
    requestedTabRaw === "reverse_image_discovery"
      ? "reverse_image_search"
      : requestedTabRaw;
  const requestedModule = searchParams.get("module") ?? "";
  const forceReverseImage = requestedModule === "reverse_image";
  const shouldScan = searchParams.get("scan") === "1";
  const requestIdFromUrl = (searchParams.get("requestId") ?? "").trim();
  const retentionFromUrl = parseRetentionDays(
    searchParams.get("retention"),
    DEFAULT_REPORT_RETENTION_DAYS
  );

  const [activeTab, setActiveTab] = useState(() => {
    if (tabs.some((tab) => tab.id === requestedTab)) return requestedTab;
    return tabs[0]?.id ?? "google_search";
  });

  useEffect(() => {
    if (
      tabs.some((tab) => tab.id === requestedTab) &&
      activeTab !== requestedTab
    ) {
      setActiveTab(requestedTab);
    }
  }, [tabs, requestedTab, activeTab]);
  const [report, setReport] = useState<IntelligenceReport | null>(() => {
    try {
      return normalizeIntelligenceReport(initialGoogleReport);
    } catch {
      return null;
    }
  });
  const [exposureReport, setExposureReport] =
    useState<DigitalExposureReport | null>(initialExposureReport);
  const [usernameReport, setUsernameReport] = useState<UsernameReport | null>(
    initialUsernameReport
  );
  const [reverseImageReport, setReverseImageReport] =
    useState<ReverseImageReport | null>(initialReverseImageReport);
  const [reverseImageScanId, setReverseImageScanId] = useState<number | null>(
    null
  );
  const [reverseImageLive, setReverseImageLive] = useState<{
    currentImageUrl: string | null;
    currentTitle: string | null;
    recent: ReverseImageLiveScanEntry[];
  }>({ currentImageUrl: null, currentTitle: null, recent: [] });
  const [reverseImageLiveHits, setReverseImageLiveHits] = useState<
    ReverseImageHit[]
  >([]);
  const [reverseImageDiscoveryDone, setReverseImageDiscoveryDone] =
    useState(false);
  const [reverseImageComparePhase, setReverseImageComparePhase] =
    useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanApiReady, setScanApiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const [retentionDays, setRetentionDays] = useState<ReportRetentionDays>(
    () => {
      // Prefer URL (from Analyse-Start) so Scan denselben Wert speichert
      if (typeof window !== "undefined") {
        const fromUrl = new URLSearchParams(window.location.search).get(
          "retention"
        );
        if (fromUrl != null) return parseRetentionDays(fromUrl);
        return readStoredRetention();
      }
      return retentionFromUrl;
    }
  );
  const scanStartedRef = useRef(false);

  useEffect(() => {
    const fromUrl = searchParams.get("retention");
    if (fromUrl != null) {
      setRetentionDays(retentionFromUrl);
      try {
        window.localStorage.setItem(
          REPORT_RETENTION_STORAGE_KEY,
          String(retentionFromUrl)
        );
      } catch {
        /* ignore */
      }
      return;
    }
    setRetentionDays(readStoredRetention());
  }, [retentionFromUrl, searchParams]);

  const activeModule = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0] ?? null,
    [activeTab, tabs]
  );

  const finishScanAttempt = useCallback(
    (options?: { clearScanParam?: boolean; tab?: string }) => {
      setScanning(false);
      setScanApiReady(false);
      setScanDone(true);
      if (options?.clearScanParam !== false) {
        const tab = options?.tab ?? "google_search";
        router.replace(`/dashboard/results?tab=${tab}`, {
          scroll: false,
        });
      }
    },
    [router]
  );

  const runGoogleScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setScanApiReady(false);
    const scanStart = Date.now();
    const minScanMs = Math.max(
      googleIntelligenceModule.minScanMs,
      googleIntelligenceModule.scanSteps.at(-1)?.atMs ??
        googleIntelligenceModule.minScanMs
    );

    try {
      // Retention zur Laufzeit nochmals auflösen (URL/Storage), falls State noch Default war
      const effectiveRetention = parseRetentionDays(
        searchParams.get("retention") ??
          (typeof window !== "undefined"
            ? window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
            : null),
        retentionDays
      );
      if (effectiveRetention !== retentionDays) {
        setRetentionDays(effectiveRetention);
      }

      const requestId = (
        searchParams.get("requestId") ?? requestIdFromUrl
      ).trim();
      if (!requestId) {
        setError(
          "Anfragekennung fehlt. Bitte starten Sie die Analyse erneut über das Analyse Center."
        );
        finishScanAttempt();
        return;
      }

      const response = await fetch("/api/analysis/google/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: effectiveRetention,
          requestId,
        }),
      });
      // API fertig → Balken darf auf 100 % (nach Mindestanimation)
      setScanApiReady(true);
      let body: {
        success?: boolean;
        data?: { report?: unknown };
        error?: { message?: string };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, minScanMs - elapsed);
      // Kurze Pause bei 100 %, damit der Mission-Balken sichtbar abschließt
      await new Promise((resolve) =>
        window.setTimeout(resolve, waitMs > 0 ? waitMs : 500)
      );

      if (!response.ok || !body.success) {
        // Gateway timeout: analysis may still finish server-side and save the report
        if (response.status === 502 || response.status === 504) {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 1500 + attempt * 1000)
            );
            const recovered = await loadLatestReport();
            if (recovered) {
              setReport(recovered);
              setError(null);
              finishScanAttempt();
              return;
            }
          }
          setError(
            "Die Analyse dauerte zu lange (Gateway-Timeout). Bitte Seite aktualisieren — der Report wird oft trotzdem gespeichert."
          );
          finishScanAttempt();
          return;
        }

        setError(
          body?.error?.message ??
            (response.status === 500
              ? "Serverfehler bei der Google-Analyse. Bitte SerpAPI unter Website → APIs & Integrationen prüfen."
              : "Analyse konnte nicht abgeschlossen werden.")
        );
        finishScanAttempt();
        return;
      }

      const nextReport = normalizeIntelligenceReport(body.data?.report);
      if (!nextReport) {
        const recovered = await loadLatestReport();
        if (recovered) {
          setReport(recovered);
          finishScanAttempt();
          return;
        }
        setError(
          "Analyse abgeschlossen, aber der Report war unvollständig. Bitte erneut versuchen."
        );
        finishScanAttempt();
        return;
      }

      setReport(nextReport);
      finishScanAttempt();
    } catch {
      const recovered = await loadLatestReport().catch(() => null);
      if (recovered) {
        setReport(recovered);
        finishScanAttempt();
        return;
      }
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt();
    }
  }, [finishScanAttempt, requestIdFromUrl, retentionDays, searchParams]);

  const runExposureScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setScanApiReady(false);
    const scanStart = Date.now();
    const minScanMs = Math.max(
      digitalLeakExposureModule.minScanMs,
      digitalLeakExposureModule.scanSteps.at(-1)?.atMs ??
        digitalLeakExposureModule.minScanMs
    );

    try {
      const requestId = (
        searchParams.get("requestId") ?? requestIdFromUrl
      ).trim();
      if (!requestId) {
        setError(
          "Anfragekennung fehlt. Bitte starten Sie die Analyse erneut über das Analyse Center."
        );
        finishScanAttempt({ tab: "digital_leak_exposure" });
        return;
      }

      const response = await fetch("/api/analysis/digital-exposure/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      setScanApiReady(true);
      let body: {
        success?: boolean;
        data?: { report?: DigitalExposureReport };
        error?: { message?: string };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, minScanMs - elapsed);
      await new Promise((resolve) =>
        window.setTimeout(resolve, waitMs > 0 ? waitMs : 500)
      );

      if (!response.ok || !body.success) {
        if (response.status === 503) {
          setError(
            body.error?.message ??
              "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
          );
          finishScanAttempt({ tab: "digital_leak_exposure" });
          return;
        }
        const recovered = await loadLatestExposureReport();
        if (recovered) {
          setExposureReport(recovered);
          setError(null);
          finishScanAttempt({ tab: "digital_leak_exposure" });
          return;
        }
        setError(
          body.error?.message ??
            "Digital Leak & Exposure Scan konnte nicht abgeschlossen werden."
        );
        finishScanAttempt({ tab: "digital_leak_exposure" });
        return;
      }

      if (body.data?.report) {
        setExposureReport(body.data.report);
      }
      finishScanAttempt({ tab: "digital_leak_exposure" });
    } catch {
      const recovered = await loadLatestExposureReport().catch(() => null);
      if (recovered) {
        setExposureReport(recovered);
        finishScanAttempt({ tab: "digital_leak_exposure" });
        return;
      }
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt({ tab: "digital_leak_exposure" });
    }
  }, [finishScanAttempt, requestIdFromUrl, searchParams]);

  const runUsernameScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setScanApiReady(false);
    const scanStart = Date.now();
    const minScanMs = Math.max(
      usernameIntelligenceModule.minScanMs,
      usernameIntelligenceModule.scanSteps.at(-1)?.atMs ??
        usernameIntelligenceModule.minScanMs
    );

    try {
      const effectiveRetention = parseRetentionDays(
        searchParams.get("retention") ??
          (typeof window !== "undefined"
            ? window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
            : null),
        retentionDays
      );
      if (effectiveRetention !== retentionDays) {
        setRetentionDays(effectiveRetention);
      }

      const requestId = (
        searchParams.get("requestId") ?? requestIdFromUrl
      ).trim();
      if (!requestId) {
        setError(
          "Anfragekennung fehlt. Bitte starten Sie die Analyse erneut über das Analyse Center."
        );
        finishScanAttempt({ tab: "username_intelligence" });
        return;
      }

      const response = await fetch("/api/analysis/username/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: effectiveRetention,
          requestId,
        }),
      });
      setScanApiReady(true);
      let body: {
        success?: boolean;
        data?: { report?: UsernameReport };
        error?: { message?: string };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, minScanMs - elapsed);
      await new Promise((resolve) =>
        window.setTimeout(resolve, waitMs > 0 ? waitMs : 500)
      );

      if (!response.ok || !body.success) {
        if (response.status === 503) {
          setError(
            body.error?.message ??
              "Username Intelligence Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
          );
          finishScanAttempt({ tab: "username_intelligence" });
          return;
        }
        const recovered = await loadLatestUsernameReport();
        if (recovered) {
          setUsernameReport(recovered);
          setError(null);
          finishScanAttempt({ tab: "username_intelligence" });
          return;
        }
        setError(
          body.error?.message ??
            "Username Intelligence Scan konnte nicht abgeschlossen werden."
        );
        finishScanAttempt({ tab: "username_intelligence" });
        return;
      }

      if (body.data?.report) {
        setUsernameReport(body.data.report);
      }
      finishScanAttempt({ tab: "username_intelligence" });
    } catch {
      const recovered = await loadLatestUsernameReport().catch(() => null);
      if (recovered) {
        setUsernameReport(recovered);
        finishScanAttempt({ tab: "username_intelligence" });
        return;
      }
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt({ tab: "username_intelligence" });
    }
  }, [finishScanAttempt, requestIdFromUrl, retentionDays, searchParams]);

  const pollReverseImageScan = useCallback(
    async (
      scanId: number,
      requestId: string,
      retention: number,
      compareOnly = false
    ): Promise<boolean> => {
      const deadline = Date.now() + 180_000;
      let lastResumeAt = Date.now();
      let resumeAttempts = 0;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        try {
          const statusRes = await fetch(
            `/api/analysis/reverse-image/status?scanId=${scanId}`,
            { cache: "no-store" }
          );
          const statusBody = await statusRes.json().catch(() => null);
          const status = statusBody?.data?.status as string | undefined;
          const report = statusBody?.data?.report as
            ReverseImageReport | null | undefined;
          const live = statusBody?.data?.live as
            | {
                currentImageUrl: string | null;
                currentTitle: string | null;
                recent: ReverseImageLiveScanEntry[];
              }
            | null
            | undefined;
          const liveHits = statusBody?.data?.liveHits as
            ReverseImageHit[] | undefined;
          if (live) {
            setReverseImageLive({
              currentImageUrl: live.currentImageUrl,
              currentTitle: live.currentTitle,
              recent: live.recent ?? [],
            });
          }
          if (liveHits?.length) setReverseImageLiveHits(liveHits);

          if (status === "completed" && report) {
            setReverseImageReport(report);
            setError(null);
            setReverseImageDiscoveryDone(true);
            setReverseImageComparePhase(false);
            return true;
          }
          if (status === "discovery_complete" && !compareOnly) {
            setReverseImageDiscoveryDone(true);
            setReverseImageComparePhase(false);
            setScanApiReady(true);
            setScanning(false);
            return true;
          }
          if (status === "comparing") {
            setReverseImageComparePhase(true);
            setReverseImageDiscoveryDone(true);
          }
          if (status === "failed") {
            setError(
              "Reverse Image Search ist fehlgeschlagen. Bitte erneut starten."
            );
            return false;
          }
          if (
            (status === "discovering" || status === "comparing") &&
            resumeAttempts < 5 &&
            Date.now() - lastResumeAt > 85_000
          ) {
            resumeAttempts += 1;
            lastResumeAt = Date.now();
            await fetch("/api/analysis/reverse-image/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                retentionDays: retention,
                requestId,
                compareOnly: status === "comparing",
                scanId,
              }),
            }).catch(() => undefined);
          }
        } catch {
          /* keep polling */
        }
      }
      const recovered = await loadLatestReverseImageReport().catch(() => ({
        report: null,
        pending: null,
      }));
      if (recovered.report) {
        setReverseImageReport(recovered.report);
        setError(null);
        return true;
      }
      setError(
        "Die Bildanalyse läuft noch oder hat das Zeitlimit erreicht. Bitte Seite in einer Minute aktualisieren."
      );
      return false;
    },
    []
  );

  const runReverseImageScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setScanApiReady(false);
    setReverseImageLive({
      currentImageUrl: null,
      currentTitle: null,
      recent: [],
    });
    setReverseImageLiveHits([]);
    setReverseImageDiscoveryDone(false);
    setReverseImageComparePhase(false);
    const scanStart = Date.now();
    const minScanMs = Math.max(
      reverseImageSearchModule.minScanMs,
      reverseImageSearchModule.scanSteps.at(-1)?.atMs ??
        reverseImageSearchModule.minScanMs
    );

    const pollUntilDone = pollReverseImageScan;

    try {
      const effectiveRetention = parseRetentionDays(
        searchParams.get("retention") ??
          (typeof window !== "undefined"
            ? window.localStorage.getItem(REPORT_RETENTION_STORAGE_KEY)
            : null),
        retentionDays
      );
      if (effectiveRetention !== retentionDays) {
        setRetentionDays(effectiveRetention);
      }

      const requestId = (
        searchParams.get("requestId") ?? requestIdFromUrl
      ).trim();
      if (!requestId) {
        setError(
          "Anfragekennung fehlt. Bitte starten Sie die Analyse erneut über das Analyse Center."
        );
        finishScanAttempt({ tab: "reverse_image_search" });
        return;
      }

      const rescanOnly = searchParams.get("rescan") === "1";
      const rescanScanId = Number.parseInt(
        searchParams.get("scanId") ?? "",
        10
      );

      const response = await fetch("/api/analysis/reverse-image/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: effectiveRetention,
          requestId,
          rescanOnly:
            rescanOnly && Number.isFinite(rescanScanId) && rescanScanId > 0,
          scanId: rescanOnly ? rescanScanId : undefined,
        }),
      });

      let body: {
        success?: boolean;
        data?: {
          report?: ReverseImageReport | null;
          scanId?: number;
          status?: string;
        };
        error?: { message?: string };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      // Keep scan theater visible while background pipeline finishes
      const elapsed = Date.now() - scanStart;
      const waitMs = Math.max(0, Math.min(minScanMs, 12_000) - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }

      if (response.status === 502 || response.status === 504) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, 2000 + attempt * 500)
          );
          const recovered = await loadLatestReverseImageReport();
          if (recovered.report) {
            setReverseImageReport(recovered.report);
            setScanApiReady(true);
            setError(null);
            finishScanAttempt({ tab: "reverse_image_search" });
            return;
          }
        }
        setScanApiReady(true);
        setError(
          "Gateway-Timeout — der Scan läuft oft trotzdem weiter. Bitte Seite in 1–2 Minuten aktualisieren."
        );
        finishScanAttempt({ tab: "reverse_image_search" });
        return;
      }

      if (!response.ok || !body.success) {
        setScanApiReady(true);
        if (response.status === 503) {
          setError(
            body.error?.message ??
              "Reverse Image Search ist aktuell nicht verfügbar."
          );
          finishScanAttempt({ tab: "reverse_image_search" });
          return;
        }
        const recovered = await loadLatestReverseImageReport();
        if (recovered.report) {
          setReverseImageReport(recovered.report);
          setError(null);
          finishScanAttempt({ tab: "reverse_image_search" });
          return;
        }
        setError(
          body.error?.message ??
            "Reverse Image Search konnte nicht gestartet werden."
        );
        finishScanAttempt({ tab: "reverse_image_search" });
        return;
      }

      if (body.data?.report) {
        setScanApiReady(true);
        setReverseImageReport(body.data.report);
        finishScanAttempt({ tab: "reverse_image_search" });
        return;
      }

      const scanId = Number(body.data?.scanId);
      if (Number.isFinite(scanId) && scanId > 0) {
        setReverseImageScanId(scanId);
        const ok = await pollUntilDone(scanId, requestId, effectiveRetention);
        setScanApiReady(true);
        finishScanAttempt({ tab: "reverse_image_search" });
        void ok;
        return;
      }

      setScanApiReady(true);
      const recovered = await loadLatestReverseImageReport();
      if (recovered.report) setReverseImageReport(recovered.report);
      finishScanAttempt({ tab: "reverse_image_search" });
    } catch {
      setScanApiReady(true);
      const recovered = await loadLatestReverseImageReport().catch(() => ({
        report: null,
        pending: null,
      }));
      if (recovered.report) {
        setReverseImageReport(recovered.report);
        finishScanAttempt({ tab: "reverse_image_search" });
        return;
      }
      setError("Verbindung zum Server nicht möglich.");
      finishScanAttempt({ tab: "reverse_image_search" });
    }
  }, [
    finishScanAttempt,
    pollReverseImageScan,
    requestIdFromUrl,
    retentionDays,
    searchParams,
  ]);

  useEffect(() => {
    // Hard-separate modules: reverse-image requests must never trigger Google.
    if (forceReverseImage) return;
    if (
      shouldScan &&
      requestedTab === "google_search" &&
      activeTab === "google_search" &&
      !scanning &&
      !scanDone &&
      !scanStartedRef.current
    ) {
      scanStartedRef.current = true;
      void runGoogleScan();
    }
  }, [
    shouldScan,
    forceReverseImage,
    requestedTab,
    activeTab,
    scanning,
    scanDone,
    runGoogleScan,
  ]);

  useEffect(() => {
    if (
      shouldScan &&
      activeTab === "digital_leak_exposure" &&
      !scanning &&
      !scanDone &&
      !scanStartedRef.current
    ) {
      scanStartedRef.current = true;
      void runExposureScan();
    }
  }, [shouldScan, activeTab, scanning, scanDone, runExposureScan]);

  useEffect(() => {
    if (
      shouldScan &&
      activeTab === "username_intelligence" &&
      !scanning &&
      !scanDone &&
      !scanStartedRef.current
    ) {
      scanStartedRef.current = true;
      void runUsernameScan();
    }
  }, [shouldScan, activeTab, scanning, scanDone, runUsernameScan]);

  useEffect(() => {
    if (
      shouldScan &&
      (forceReverseImage ||
        requestedTab === "reverse_image_search" ||
        requestedTab === "reverse_image_discovery") &&
      activeTab === "reverse_image_search" &&
      !scanning &&
      !scanDone &&
      !scanStartedRef.current
    ) {
      const compareWatch = searchParams.get("compareWatch") === "1";
      const watchScanId = Number.parseInt(searchParams.get("scanId") ?? "", 10);
      if (compareWatch && Number.isFinite(watchScanId) && watchScanId > 0) {
        scanStartedRef.current = true;
        setReverseImageScanId(watchScanId);
        setReverseImageComparePhase(true);
        setReverseImageDiscoveryDone(true);
        setScanning(true);
        setScanApiReady(false);
        void pollReverseImageScan(watchScanId, "", retentionDays, true).then(
          () => {
            setScanApiReady(true);
            finishScanAttempt({ tab: "reverse_image_search" });
          }
        );
        return;
      }
      scanStartedRef.current = true;
      void runReverseImageScan();
    }
  }, [
    shouldScan,
    forceReverseImage,
    requestedTab,
    activeTab,
    scanning,
    scanDone,
    runReverseImageScan,
    searchParams,
    pollReverseImageScan,
    retentionDays,
    finishScanAttempt,
  ]);

  useEffect(() => {
    if (
      activeTab !== "reverse_image_search" ||
      reverseImageReport ||
      reverseImageDiscoveryDone ||
      shouldScan
    ) {
      return;
    }
    void loadLatestReverseImageReport().then(({ report, pending }) => {
      if (report) {
        setReverseImageReport(report);
        return;
      }
      if (pending?.status === "discovery_complete") {
        setReverseImageScanId(pending.scanId);
        setReverseImageDiscoveryDone(true);
      } else if (pending?.status === "comparing") {
        setReverseImageScanId(pending.scanId);
        setReverseImageDiscoveryDone(true);
        setReverseImageComparePhase(true);
        setScanning(true);
        void pollReverseImageScan(pending.scanId, "", retentionDays, true).then(
          () => {
            setScanApiReady(true);
            setScanning(false);
          }
        );
      }
    });
  }, [
    activeTab,
    reverseImageReport,
    reverseImageDiscoveryDone,
    shouldScan,
    pollReverseImageScan,
    retentionDays,
  ]);

  function selectTab(id: string) {
    setActiveTab(id);
    router.replace(`/dashboard/results?tab=${id}`, { scroll: false });
  }

  function updateRetention(days: ReportRetentionDays) {
    setRetentionDays(days);
    try {
      window.localStorage.setItem(REPORT_RETENTION_STORAGE_KEY, String(days));
    } catch {
      /* ignore */
    }
  }

  if (!activeModule) {
    return (
      <main id="results-center-page" className="mx-auto max-w-[1500px]">
        <DashboardSectionHeader
          eyebrow="Command Center / Ergebnisse"
          title="Ergebnis Center"
          description="Aktuell sind keine Analysemodule freigeschaltet."
          helpLabel="Ergebnis Center"
          helpText="Sobald Module in der Administration aktiviert sind, erscheinen sie hier automatisch."
        />
        <p className="mt-6 text-sm text-white/45">
          Keine aktiven Module verfügbar. Bitte prüfen Sie die
          Modul-Freischaltung oder starten Sie eine Analyse im Analyse Center.
        </p>
      </main>
    );
  }

  const readyReport =
    !scanning &&
    ((activeModule.id === "google_search" && report) ||
      (activeModule.id === "username_intelligence" && usernameReport) ||
      (activeModule.id === "digital_leak_exposure" && exposureReport) ||
      (activeModule.id === "reverse_image_search" && reverseImageReport));

  const showRetention =
    activeModule.id === "google_search" ||
    activeModule.id === "username_intelligence" ||
    activeModule.id === "reverse_image_search";

  const tabsNav = (
    <nav
      id="results-tabs"
      aria-label="Analyse-Reiter"
      className="mt-6 flex gap-1 overflow-x-auto rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-1.5"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-[12px] transition ${
              active
                ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
                : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            {tab.title}
          </button>
        );
      })}
    </nav>
  );

  const retentionSection = showRetention ? (
    <section
      id="results-retention"
      className="mt-4 scroll-mt-24 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            REPORT SPEICHERN
          </p>
          <p className="mt-1 text-sm text-white/55">
            Wie lange soll das Suchergebnis gespeichert bleiben?
          </p>
        </div>
        <label className="block min-w-[200px]">
          <span className="sr-only">Speicherdauer</span>
          <select
            value={retentionDays}
            disabled={scanning}
            onChange={(event) =>
              updateRetention(parseRetentionDays(Number(event.target.value)))
            }
            className="w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
          >
            {REPORT_RETENTION_PRESETS.map((preset) => (
              <option key={preset.days} value={preset.days}>
                {preset.label} — {preset.description}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  ) : (
    <div id="results-retention" className="sr-only" />
  );

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Jede Analyse besitzt einen eigenen Reiter. Nach dem Start erscheint zuerst die SOC-Scan-Sequenz, anschließend der Enterprise OSINT Report mit Live-Treffern."
        helpLabel="Ergebnis Center"
        helpText="SynCredits werden im Analyse Center vor dem Start abgebucht. Der Bericht wird gespeichert — die Speicherdauer können Sie unten wählen."
      />

      {readyReport ? (
        <>
          {tabsNav}
          {retentionSection}
          <div id="results-body" className="mt-6 scroll-mt-24">
            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                {error}
              </p>
            ) : null}
            {activeModule.id === "google_search" && report ? (
              <GoogleIntelligenceReport report={report} revealSections />
            ) : null}
            {activeModule.id === "username_intelligence" && usernameReport ? (
              <UsernameIntelligenceReportView
                report={usernameReport}
                revealSections
              />
            ) : null}
            {activeModule.id === "digital_leak_exposure" && exposureReport ? (
              <DigitalExposureReportView
                report={exposureReport}
                revealSections
              />
            ) : null}
            {activeModule.id === "reverse_image_search" &&
            reverseImageReport ? (
              <ReverseImageReportView report={reverseImageReport} />
            ) : null}
          </div>
        </>
      ) : (
        <DashboardPageRail sections={RESULTS_CENTER_RAIL}>
          {tabsNav}
          {retentionSection}

          <div id="results-body" className="mt-6 scroll-mt-24">
            {activeModule.id === "google_search" ? (
              <>
                {scanning ? (
                  <IntelligenceScanSequence
                    steps={googleIntelligenceModule.scanSteps}
                    minDurationMs={googleIntelligenceModule.minScanMs}
                    running={scanning}
                    subjectName={subjectName}
                    apiReady={scanApiReady}
                    onComplete={() => undefined}
                  />
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                    {error}
                  </p>
                ) : null}

                {!scanning && !report && !error ? (
                  <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                    <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      GOOGLE ANALYSE
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      Noch kein Report vorhanden. Starten Sie die Analyse im
                      Analyse Center.
                    </p>
                    <a
                      href="/dashboard/analysis/google?start=1"
                      className="mt-5 inline-flex rounded-lg border border-cyber-cyan/50 bg-cyber-cyan/[0.1] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
                    >
                      Google Analyse starten
                    </a>
                  </section>
                ) : null}
              </>
            ) : activeModule.id === "digital_leak_exposure" ? (
              <>
                {scanning ? (
                  <IntelligenceScanSequence
                    steps={digitalLeakExposureModule.scanSteps}
                    minDurationMs={digitalLeakExposureModule.minScanMs}
                    running={scanning}
                    subjectName={subjectName}
                    apiReady={scanApiReady}
                    onComplete={() => undefined}
                  />
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                    {error}
                  </p>
                ) : null}

                {!scanning && !exposureReport && !error ? (
                  <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                    <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      DIGITAL LEAK & EXPOSURE SCAN
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      Noch kein Exposure-Report vorhanden. Starten Sie die
                      Analyse im Analyse Center.
                    </p>
                    <a
                      href="/dashboard/analysis/digital-exposure?start=1"
                      className="mt-5 inline-flex rounded-lg border border-cyber-cyan/50 bg-cyber-cyan/[0.1] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
                    >
                      Digital Leak & Exposure Scan starten
                    </a>
                  </section>
                ) : null}
              </>
            ) : activeModule.id === "username_intelligence" ? (
              <>
                {scanning ? (
                  <IntelligenceScanSequence
                    steps={usernameIntelligenceModule.scanSteps}
                    minDurationMs={usernameIntelligenceModule.minScanMs}
                    running={scanning}
                    subjectName={subjectName}
                    apiReady={scanApiReady}
                    onComplete={() => undefined}
                  />
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                    {error}
                  </p>
                ) : null}

                {!scanning && !usernameReport && !error ? (
                  <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                    <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      USERNAME INTELLIGENCE SCAN
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      Noch kein Username-Report vorhanden. Starten Sie die
                      Analyse im Analyse Center.
                    </p>
                    <a
                      href="/dashboard/analysis/username?start=1"
                      className="mt-5 inline-flex rounded-lg border border-cyber-cyan/50 bg-cyber-cyan/[0.1] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
                    >
                      Username Intelligence Scan starten
                    </a>
                  </section>
                ) : null}
              </>
            ) : activeModule.id === "reverse_image_search" ? (
              <>
                {scanning && reverseImageComparePhase ? (
                  <IntelligenceScanSequence
                    steps={reverseImageSearchModule.scanSteps}
                    minDurationMs={reverseImageSearchModule.minScanMs}
                    running={scanning}
                    subjectName={subjectName}
                    apiReady={scanApiReady}
                    onComplete={() => undefined}
                    rightPanel={
                      reverseImageScanId ? (
                        <ReverseImageLiveScanPanel
                          scanId={reverseImageScanId}
                          currentImageUrl={reverseImageLive.currentImageUrl}
                          currentTitle={reverseImageLive.currentTitle}
                          recent={reverseImageLive.recent}
                          liveHits={reverseImageLiveHits}
                          scanning={scanning && !scanApiReady}
                        />
                      ) : null
                    }
                  />
                ) : null}

                {scanning && !reverseImageComparePhase ? (
                  <section className="rounded-[1.2rem] border border-cyber-cyan/20 bg-[#060d16]/90 p-6">
                    <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
                      PHASE 1 · SERPAPI BILDSUCHE
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Durchsuche Namen, Alias und Benutzernamen — bitte warten…
                    </p>
                  </section>
                ) : null}

                {!scanning &&
                reverseImageDiscoveryDone &&
                reverseImageScanId &&
                !reverseImageReport ? (
                  <ReverseImageCandidatePicker
                    scanId={reverseImageScanId}
                    onCompareStarted={() => {
                      setReverseImageComparePhase(true);
                      setScanning(true);
                      setScanApiReady(false);
                      void pollReverseImageScan(
                        reverseImageScanId,
                        (
                          searchParams.get("requestId") ?? requestIdFromUrl
                        ).trim(),
                        retentionDays,
                        true
                      ).then(() => {
                        setScanApiReady(true);
                        finishScanAttempt({ tab: "reverse_image_search" });
                      });
                    }}
                  />
                ) : null}

                {scanning && reverseImageLiveHits.length > 0 ? (
                  <section className="mt-6 rounded-[1.1rem] border border-emerald-400/20 bg-emerald-400/[0.03] p-4">
                    <p className="font-mono text-[9px] tracking-[.14em] text-emerald-300/70">
                      LIVE-TREFFER · WERDEN GESPEICHERT
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {reverseImageLiveHits.map((hit) => (
                        <article
                          key={hit.id}
                          className="overflow-hidden rounded-lg border border-emerald-400/25 bg-black/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/analysis/reverse-image/hits/${hit.id}/image?scanId=${reverseImageScanId ?? ""}&thumb=1`}
                            alt={hit.title}
                            className="h-32 w-full object-cover object-top"
                          />
                          <p className="truncate px-2 py-1.5 text-xs text-white/70">
                            {hit.title}
                          </p>
                          <p className="px-2 pb-2 font-mono text-[10px] text-emerald-300/80">
                            {Math.round(hit.similarity * 100)} % Übereinstimmung
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
                    {error}
                  </p>
                ) : null}

                {!scanning && !reverseImageReport && !error ? (
                  <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                    <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                      REVERSE IMAGE SEARCH
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      Noch kein Bildanalyse-Report vorhanden. Referenzfotos
                      hochladen und Analyse im Analyse Center starten.
                    </p>
                    <a
                      href="/dashboard/analysis/reverse-image?start=1"
                      className="mt-5 inline-flex rounded-lg border border-cyber-cyan/50 bg-cyber-cyan/[0.1] px-4 py-2.5 text-sm font-medium text-cyber-cyan"
                    >
                      Reverse Image Search starten
                    </a>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] p-6 md:p-8">
                <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                  {activeModule.title.toUpperCase()}
                </p>
                <p className="mt-3 text-sm text-white/50">
                  {activeModule.available
                    ? activeModule.tagline
                    : "Dieses Modul wird in einem späteren Sprint freigeschaltet."}
                </p>
              </section>
            )}
          </div>
        </DashboardPageRail>
      )}
    </main>
  );
}
