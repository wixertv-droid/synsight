"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisSourceModule } from "@/lib/services/hit-actions-service";
import {
  isExcludedFromStats,
  type HitActionState,
} from "@/lib/analysis/hit-action-state";

/**
 * Loads persisted hit actions for one analysis module and keeps
 * local state in sync for KPI exclusion (ignore / resolved).
 */
export function useAnalysisHitActions(sourceModule: AnalysisSourceModule) {
  const [actions, setActions] = useState<Record<string, HitActionState>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetch(`/api/analysis/actions?module=${encodeURIComponent(sourceModule)}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body.success) return;
        const next: Record<string, HitActionState> = {};
        for (const row of (body.data?.actions ?? []) as Array<{
          hitFingerprint: string;
          action: string;
        }>) {
          if (
            row.action === "ignored" ||
            row.action === "self" ||
            row.action === "resolved" ||
            row.action === "ordered"
          ) {
            next[row.hitFingerprint] = row.action;
          }
        }
        setActions(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceModule]);

  const onActionChange = useCallback(
    (fingerprint: string, action: HitActionState) => {
      setActions((prev) => {
        if (action === "none") {
          if (!(fingerprint in prev)) return prev;
          const next = { ...prev };
          delete next[fingerprint];
          return next;
        }
        if (prev[fingerprint] === action) return prev;
        return { ...prev, [fingerprint]: action };
      });
    },
    []
  );

  const actionFor = useCallback(
    (fingerprint: string): HitActionState => actions[fingerprint] ?? "none",
    [actions]
  );

  const isExcluded = useCallback(
    (fingerprint: string) => isExcludedFromStats(actions[fingerprint]),
    [actions]
  );

  return { actions, ready, onActionChange, actionFor, isExcluded };
}
