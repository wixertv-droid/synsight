"use client";

import { useCallback, useEffect, useState } from "react";
import { BiometricHead, type BiometricView } from "@/components/biometric";
import { REFERENCE_IMAGE_SLOTS } from "@/components/profile/ReferenceImageSlots";
import type { ApiResponseBody } from "@/lib/api/response";
import type { ProfileImageType } from "@/types/domain";
import {
  prepareProfileImageForUpload,
  readImageUploadError,
} from "@/lib/media/prepare-upload-image";

type Slots = Record<ProfileImageType, boolean>;

export default function MobileImageUploadClient({ token }: { token: string }) {
  const [slots, setSlots] = useState<Slots | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<ProfileImageType | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError(
        "Kein Upload-Token vorhanden. Bitte scannen Sie den QR-Code erneut."
      );
      return;
    }
    const response = await fetch(
      `/api/identity/images/mobile?token=${encodeURIComponent(token)}`
    );
    const body = (await response.json()) as ApiResponseBody<{
      expiresAt: string;
      slots: Slots;
    }>;
    if (!response.ok || !body.success) {
      setError(
        !body.success
          ? body.error.message
          : "Dieser Upload-Link ist ungültig oder abgelaufen."
      );
      setSlots(null);
      return;
    }
    setError(null);
    setSlots(body.data.slots);
    setExpiresAt(body.data.expiresAt);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (imageType: ProfileImageType, file: File) => {
    setUploadingType(imageType);
    setError(null);
    setMessage(null);
    try {
      const prepared = await prepareProfileImageForUpload(file);
      const data = new FormData();
      data.set("token", token);
      data.set("imageType", imageType);
      data.set("file", prepared);
      const response = await fetch("/api/identity/images/mobile", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        setError(await readImageUploadError(response));
        return;
      }
      const body = (await response.json()) as ApiResponseBody<{
        slots: Slots;
      }>;
      if (!body.success) {
        setError(body.error.message || "Bild-Upload fehlgeschlagen.");
        return;
      }
      setSlots(body.data.slots);
      setMessage("Bild gespeichert. Sie können weitere Winkel hochladen.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Bild konnte nicht hochgeladen werden."
      );
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070c] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(41,182,246,.12),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(112,231,255,.08),transparent_40%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/60">
          SYNSIGHT · HANDY-UPLOAD
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em]">
          Referenzbilder aufnehmen
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/45">
          Tippen Sie auf ein Kästchen und fotografieren oder wählen Sie das
          passende Bild. Die Dateien werden verschlüsselt in Ihrem Profil
          gespeichert.
        </p>
        {expiresAt && (
          <p className="mt-2 font-mono text-[9px] tracking-[.12em] text-white/28">
            SESSION GÜLTIG BIS / {expiresAt}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-100/80"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100/75"
          >
            {message}
          </p>
        )}

        {slots && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {REFERENCE_IMAGE_SLOTS.map((slot) => {
              const filled = slots[slot.type];
              const busy = uploadingType === slot.type;
              return (
                <label
                  key={slot.type}
                  className={`relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-end overflow-hidden rounded-2xl border px-2 pb-3 text-center transition ${
                    filled
                      ? "border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.06)]"
                      : "border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.03)]"
                  }`}
                >
                  <div className="absolute inset-x-2 top-2 bottom-10">
                    <BiometricHead
                      view={slot.type as BiometricView}
                      mode={busy ? "analyzing" : filled ? "captured" : "idle"}
                      interactive={false}
                      progress={busy ? 55 : filled ? 100 : 0}
                      className="h-full w-full"
                    />
                  </div>
                  <span className="relative z-[1] text-sm font-medium text-white/80">
                    {slot.label}
                  </span>
                  <span className="relative z-[1] mt-1 font-mono text-[8px] tracking-[.14em] text-white/35">
                    {busy
                      ? "UPLOAD…"
                      : filled
                        ? "GESPEICHERT · ERSETZEN"
                        : "KAMERA / GALERIE"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={busy || Boolean(error && !slots)}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(slot.type, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-white/30">
          Nach dem Upload erscheinen die Bilder automatisch in Ihrem
          Identitätsprofil am Computer.
        </p>
      </div>
    </main>
  );
}
