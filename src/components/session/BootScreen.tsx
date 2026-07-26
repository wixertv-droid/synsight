"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GlobeCanvas from "@/components/session/GlobeCanvas";
import styles from "./BootScreen.module.css";

export interface BootSequenceProps {
  onComplete: () => void;
}

const HACKER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/\\|@{}[]";

const TARGET_SYN = "SYN";
const TARGET_SIGHT = "SIGHT";

type PanelPhase = "hidden" | "loading" | "done";

interface PanelState {
  phase: PanelPhase;
  progress: number;
  title: string;
  status: string;
  tone: "cyan" | "alert" | "secure";
}

function randomHackerChar(): string {
  return HACKER_CHARS[Math.floor(Math.random() * HACKER_CHARS.length)] ?? "#";
}

function decryptStep(current: string, target: string): string {
  let next = "";
  let locked = true;
  for (let i = 0; i < target.length; i++) {
    if (current[i] === target[i] && locked) {
      next += target[i];
    } else {
      locked = false;
      // ~28% chance to lock correct glyph this tick
      next += Math.random() < 0.28 ? target[i] : randomHackerChar();
    }
  }
  return next;
}

function emptyDecrypt(length: number): string {
  return Array.from({ length }, () => randomHackerChar()).join("");
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [synText, setSynText] = useState(() => emptyDecrypt(TARGET_SYN.length));
  const [sightText, setSightText] = useState(() =>
    emptyDecrypt(TARGET_SIGHT.length)
  );
  const [logoDone, setLogoDone] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>([
    {
      phase: "hidden",
      progress: 0,
      title: "Initialisiere Datenstrom…",
      status: "STANDBY",
      tone: "cyan",
    },
    {
      phase: "hidden",
      progress: 0,
      title: "Suche sicheren Tunnel…",
      status: "STANDBY",
      tone: "cyan",
    },
    {
      phase: "hidden",
      progress: 0,
      title: "Scanne Vektoren…",
      status: "STANDBY",
      tone: "alert",
    },
  ]);

  const complete = useCallback(() => onComplete(), [onComplete]);

  // Logo decrypt
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setSynText(TARGET_SYN);
      setSightText(TARGET_SIGHT);
      setLogoDone(true);
      return;
    }

    let syn = emptyDecrypt(TARGET_SYN.length);
    let sight = emptyDecrypt(TARGET_SIGHT.length);
    const id = window.setInterval(() => {
      syn = decryptStep(syn, TARGET_SYN);
      sight = decryptStep(sight, TARGET_SIGHT);
      setSynText(syn);
      setSightText(sight);
      if (syn === TARGET_SYN && sight === TARGET_SIGHT) {
        window.clearInterval(id);
        setLogoDone(true);
      }
    }, 42);

    return () => window.clearInterval(id);
  }, []);

  // Sequential panels after logo
  useEffect(() => {
    if (!logoDone) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setPanels([
        {
          phase: "done",
          progress: 100,
          title: "Datenstrom aktiv",
          status: "ONLINE",
          tone: "cyan",
        },
        {
          phase: "done",
          progress: 100,
          title: "Tunnel etabliert",
          status: "SECURE",
          tone: "cyan",
        },
        {
          phase: "done",
          progress: 100,
          title: "Angriff blockiert",
          status: "SECURE",
          tone: "secure",
        },
      ]);
      setShowHotspots(true);
      const t = window.setTimeout(() => {
        setExiting(true);
        window.setTimeout(complete, 200);
      }, 400);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    const timeouts: number[] = [];
    const intervals: number[] = [];

    const runPanel = (
      index: number,
      loadingTitle: string,
      doneTitle: string,
      loadingTone: "cyan" | "alert",
      durationMs: number
    ) =>
      new Promise<void>((resolve) => {
        if (cancelled) {
          resolve();
          return;
        }
        setPanels((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            phase: "loading",
            progress: 0,
            title: loadingTitle,
            status: "LOADING",
            tone: loadingTone,
          };
          return next;
        });

        const started = performance.now();
        const tick = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(tick);
            resolve();
            return;
          }
          const pct = Math.min(
            100,
            ((performance.now() - started) / durationMs) * 100
          );
          setPanels((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], progress: pct };
            return next;
          });
          if (pct >= 100) {
            window.clearInterval(tick);
            const isAlertPanel = index === 2;
            setPanels((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                phase: "done",
                progress: 100,
                title: doneTitle,
                status: isAlertPanel ? "SECURE" : "ONLINE",
                tone: isAlertPanel ? "secure" : "cyan",
              };
              return next;
            });
            if (isAlertPanel) {
              setShowHotspots(true);
            }
            timeouts.push(window.setTimeout(() => resolve(), 220));
          }
        }, 40);
        intervals.push(tick);
      });

    void (async () => {
      await runPanel(
        0,
        "Initialisiere Datenstrom…",
        "Datenstrom aktiv",
        "cyan",
        1100
      );
      if (cancelled) return;
      await runPanel(
        1,
        "Suche sicheren Tunnel…",
        "Tunnel etabliert",
        "cyan",
        1200
      );
      if (cancelled) return;
      await runPanel(2, "Scanne Vektoren…", "Angriff blockiert", "alert", 1300);
      if (cancelled) return;
      timeouts.push(
        window.setTimeout(() => {
          setExiting(true);
          timeouts.push(window.setTimeout(complete, 900));
        }, 900)
      );
    })();

    return () => {
      cancelled = true;
      for (const t of timeouts) window.clearTimeout(t);
      for (const i of intervals) window.clearInterval(i);
    };
  }, [logoDone, complete]);

  const panelClass = useMemo(
    () =>
      panels.map((panel) => {
        const classes = [styles.panel];
        if (panel.phase !== "hidden") classes.push(styles.panelVisible);
        if (panel.tone === "alert") classes.push(styles.panelAlert);
        if (panel.tone === "secure") classes.push(styles.panelSecure);
        return classes.join(" ");
      }),
    [panels]
  );

  return (
    <div
      className={`${styles.overlay} ${exiting ? styles.overlayExiting : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="SynSight Systemstart"
    >
      <div className={styles.globeLayer}>
        <GlobeCanvas showHotspots={showHotspots} />
      </div>
      <div className={styles.vignette} />
      <div className={styles.scanlines} />

      <div className={styles.content}>
        <div className={styles.logoWrap}>
          <div className={styles.logo} aria-label="SYNSIGHT">
            <span className={styles.logoSyn}>{synText}</span>
            <span className={styles.logoSight}>{sightText}</span>
          </div>
          <p className={styles.logoSub}>Secure Identity Command Boot</p>
        </div>

        <div className={styles.panels}>
          {panels.map((panel, index) => (
            <article key={panel.title + index} className={panelClass[index]}>
              <p className={styles.panelLabel}>NODE 0{index + 1}</p>
              <p className={styles.panelTitle}>{panel.title}</p>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${panel.progress}%` }}
                />
              </div>
              <p className={styles.status}>
                {panel.status} · {Math.round(panel.progress)}%
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Alias matching the product brief. */
export { BootSequence as BootScreen };
