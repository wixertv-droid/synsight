"use client";

import Image from "next/image";
import {
  BiometricHead,
  BIOMETRIC_VIEW_LABELS,
  type BiometricView,
} from "@/components/biometric";
import type { ProfileImageType } from "@/types/domain";

export const REFERENCE_IMAGE_SLOTS: {
  type: ProfileImageType;
  label: string;
  hint: string;
}[] = [
  {
    type: "front",
    label: BIOMETRIC_VIEW_LABELS.front,
    hint: "Gesicht frontal, gut beleuchtet",
  },
  {
    type: "left_profile",
    label: BIOMETRIC_VIEW_LABELS.left_profile,
    hint: "Profilansicht von links",
  },
  {
    type: "right_profile",
    label: BIOMETRIC_VIEW_LABELS.right_profile,
    hint: "Profilansicht von rechts",
  },
  {
    type: "angled",
    label: BIOMETRIC_VIEW_LABELS.angled,
    hint: "45°-Ansicht, leicht gedreht",
  },
];

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
  capture?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REFERENCE_IMAGE_SLOTS.map((slot) => {
        const image = images.find((item) => item.imageType === slot.type);
        const busy = uploadingType === slot.type;
        const view = slot.type as BiometricView;

        return (
          <div
            key={slot.type}
            className="overflow-hidden rounded-xl border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.03)] shadow-[inset_0_0_24px_rgba(0,212,255,0.06)]"
          >
            <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden">
              <div
                className={`bio-slot-fade absolute inset-0 flex items-center justify-center p-3 transition-opacity duration-500 ${
                  image ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <BiometricHead
                  view={view}
                  mode={busy ? "analyzing" : undefined}
                  interactive={!busy && !image}
                  progress={busy ? 42 : 0}
                  className="h-full w-full max-w-[200px]"
                />
              </div>

              {image && (
                <div className="bio-slot-fade bio-slot-fade-in absolute inset-0">
                  <Image
                    src={`/api/identity/images/${image.imageType}/thumbnail?v=${image.contentHash ?? ""}`}
                    alt={`Referenzbild ${slot.label}`}
                    width={300}
                    height={300}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 border border-[rgba(0,212,255,0.25)] shadow-[inset_0_0_30px_rgba(0,212,255,0.15)]" />
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

              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[#04070c]/85 to-transparent px-3 pb-2.5 pt-10 text-center">
                <span className="block text-[11px] font-medium text-[var(--bio-accent,#A7F3FF)]/85">
                  {slot.label}
                </span>
                <span className="mt-0.5 block font-mono text-[8px] tracking-[.12em] text-white/35">
                  {busy
                    ? "SCAN / OPTIMIERUNG…"
                    : image
                      ? "TIPPEN ZUM ERSETZEN"
                      : slot.hint.toUpperCase()}
                </span>
              </span>
            </label>

            {image && onDelete && (
              <div className="flex justify-end border-t border-[rgba(0,212,255,0.1)] px-2 py-1.5">
                <button
                  type="button"
                  className="font-mono text-[9px] tracking-[.12em] text-white/35 hover:text-[var(--bio-secondary,#5CE1FF)]"
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
