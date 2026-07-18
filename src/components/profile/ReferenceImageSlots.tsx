"use client";

import Image from "next/image";
import type { ProfileImageType } from "@/types/domain";

export const REFERENCE_IMAGE_SLOTS: {
  type: ProfileImageType;
  label: string;
  hint: string;
}[] = [
  {
    type: "front",
    label: "Von vorn",
    hint: "Gesicht frontal, gut beleuchtet",
  },
  {
    type: "left_profile",
    label: "Linke Seite",
    hint: "Profilansicht von links",
  },
  {
    type: "right_profile",
    label: "Rechte Seite",
    hint: "Profilansicht von rechts",
  },
  {
    type: "angled",
    label: "Schräg",
    hint: "Leicht gedrehter Winkel",
  },
];

function Silhouette({ type }: { type: ProfileImageType }) {
  if (type === "front") {
    return (
      <svg
        viewBox="0 0 80 96"
        className="h-16 w-14 text-cyber-cyan/35"
        aria-hidden
      >
        <ellipse
          cx="40"
          cy="28"
          rx="16"
          ry="18"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M22 92c2-22 12-34 18-34s16 12 18 34"
          fill="currentColor"
          opacity="0.4"
        />
        <circle cx="34" cy="26" r="1.6" fill="#04070c" />
        <circle cx="46" cy="26" r="1.6" fill="#04070c" />
      </svg>
    );
  }

  if (type === "left_profile") {
    return (
      <svg
        viewBox="0 0 80 96"
        className="h-16 w-14 text-cyber-cyan/35"
        aria-hidden
      >
        <path
          d="M48 14c-12 0-20 10-20 22 0 8 3 14 8 18l-6 8c8 2 14 4 18 4 10 0 18-10 18-24S60 14 48 14z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M36 92c1-20 8-30 14-30s12 10 14 30"
          fill="currentColor"
          opacity="0.35"
        />
      </svg>
    );
  }

  if (type === "right_profile") {
    return (
      <svg
        viewBox="0 0 80 96"
        className="h-16 w-14 text-cyber-cyan/35"
        aria-hidden
      >
        <path
          d="M32 14c12 0 20 10 20 22 0 8-3 14-8 18l6 8c-8 2-14 4-18 4-10 0-18-10-18-24S20 14 32 14z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M44 92c-1-20-8-30-14-30s-12 10-14 30"
          fill="currentColor"
          opacity="0.35"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 96"
      className="h-16 w-14 text-cyber-cyan/35"
      aria-hidden
    >
      <ellipse
        cx="42"
        cy="28"
        rx="15"
        ry="17"
        fill="currentColor"
        opacity="0.5"
        transform="rotate(18 42 28)"
      />
      <path
        d="M26 92c3-20 14-32 20-32s14 12 16 32"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

export interface ReferenceSlotImage {
  imageType: ProfileImageType;
  contentHash?: string;
  storagePath?: string;
}

export default function ReferenceImageSlots({
  images,
  uploadingType,
  onSelect,
  onDelete,
  capture,
}: {
  images: ReferenceSlotImage[];
  uploadingType: ProfileImageType | null;
  onSelect: (type: ProfileImageType, file: File) => void;
  onDelete?: (type: ProfileImageType) => void;
  /** Prefer rear camera on phones */
  capture?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REFERENCE_IMAGE_SLOTS.map((slot) => {
        const image = images.find((item) => item.imageType === slot.type);
        const busy = uploadingType === slot.type;
        return (
          <div
            key={slot.type}
            className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
          >
            <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden">
              {image ? (
                <Image
                  src={`/api/identity/images/${image.imageType}/thumbnail?v=${image.contentHash ?? ""}`}
                  alt={`Referenzbild ${slot.label}`}
                  width={300}
                  height={300}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 px-3 text-center">
                  <Silhouette type={slot.type} />
                  <span className="font-mono text-[8px] tracking-[.14em] text-white/30">
                    {busy ? "WIRD OPTIMIERT…" : "SILHOUETTE"}
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic"
                capture={capture ? "environment" : undefined}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onSelect(slot.type, file);
                  event.currentTarget.value = "";
                }}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-center opacity-90 transition group-hover:opacity-100">
                <span className="block text-[11px] font-medium text-white/80">
                  {slot.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-white/40">
                  {busy ? "Upload…" : image ? "Tippen zum Ersetzen" : slot.hint}
                </span>
              </span>
            </label>
            {image && onDelete && (
              <div className="flex justify-end border-t border-white/[0.06] px-2 py-1.5">
                <button
                  type="button"
                  className="font-mono text-[9px] tracking-[.12em] text-white/35 hover:text-rose-200/70"
                  onClick={() => onDelete(slot.type)}
                >
                  LÖSCHEN
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
