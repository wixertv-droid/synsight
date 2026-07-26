"use client";

import { useEffect, useState } from "react";
import styles from "./ShutdownScreen.module.css";

export interface ShutdownSequenceProps {
  /** Fired when the screen is fully black / sequence finished (~3.8s). */
  onComplete: () => void;
}

const TARGET = "TERMINATING SECURE SESSION...";
const HACKER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%-<>/\\|";

function randomGlyph(): string {
  return HACKER[Math.floor(Math.random() * HACKER.length)] ?? "#";
}

/**
 * CRT logout shutdown. Total timing ~3.8s before onComplete (black screen).
 * 0.0–1.2s brackets + decrypt · 1.2s success line · 1.8s crtTurnOff · settle → 3.8s
 */
export default function ShutdownSequence({
  onComplete,
}: ShutdownSequenceProps) {
  const [text, setText] = useState(() =>
    Array.from({ length: TARGET.length }, () => randomGlyph()).join("")
  );
  const [converge, setConverge] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [crt, setCrt] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setText(TARGET);
      setShowSuccess(true);
      setCrt(true);
      const t = window.setTimeout(onComplete, 200);
      return () => window.clearTimeout(t);
    }

    setConverge(true);

    let current = Array.from({ length: TARGET.length }, () =>
      randomGlyph()
    ).join("");
    const decryptId = window.setInterval(() => {
      let next = "";
      let locked = true;
      for (let i = 0; i < TARGET.length; i++) {
        if (current[i] === TARGET[i] && locked) {
          next += TARGET[i];
        } else {
          locked = false;
          next += Math.random() < 0.32 ? TARGET[i] : randomGlyph();
        }
      }
      current = next;
      setText(current);
      if (current === TARGET) {
        window.clearInterval(decryptId);
      }
    }, 36);

    const successTimer = window.setTimeout(() => {
      setText(TARGET);
      setShowSuccess(true);
    }, 1200);

    const crtTimer = window.setTimeout(() => {
      setCrt(true);
    }, 1750);

    // Exactly 3.8s — screen is black after CRT collapse
    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, 3800);

    return () => {
      window.clearInterval(decryptId);
      window.clearTimeout(successTimer);
      window.clearTimeout(crtTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Sitzung wird beendet"
    >
      <div
        className={[
          styles.stage,
          converge ? styles.bracketsConverge : "",
          crt ? styles.stageCrt : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.grid} />
        <div className={styles.scanlines} />
        <div className={styles.flash} />

        <div className={`${styles.bracket} ${styles.tl}`} aria-hidden />
        <div className={`${styles.bracket} ${styles.tr}`} aria-hidden />
        <div className={`${styles.bracket} ${styles.bl}`} aria-hidden />
        <div className={`${styles.bracket} ${styles.br}`} aria-hidden />

        <div className={styles.copy}>
          <p className={styles.linePrimary}>{text}</p>
          <p
            className={`${styles.lineSecondary} ${
              showSuccess ? styles.lineSecondaryVisible : ""
            }`}
          >
            LOGOUT ERFOLGREICH - VERBINDUNG GETRENNT
          </p>
        </div>
      </div>
    </div>
  );
}

export { ShutdownSequence as ShutdownScreen };
