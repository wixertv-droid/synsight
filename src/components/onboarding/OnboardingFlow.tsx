"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import {
  onboardingPayloadSchema,
  type OnboardingPayload,
} from "@/lib/validation/onboarding";
import type { ApiResponseBody } from "@/lib/api/response";

const steps = [
  {
    number: 1,
    label: "Persönliche Informationen",
    description: "Grunddaten für eine eindeutige Zuordnung.",
  },
  {
    number: 2,
    label: "Digitale Identität",
    description: "Profile und Benutzernamen freiwillig verbinden.",
  },
  {
    number: 3,
    label: "Weitere Spuren",
    description: "Frühere Namen, Webseiten und Domains ergänzen.",
  },
  {
    number: 4,
    label: "Bildprofil",
    description: "Optionale Bildspeicherung vorbereiten.",
  },
] as const;

const platforms = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "X",
  "GitHub",
  "Reddit",
  "Pinterest",
  "Discord",
  "Telegram",
  "Threads",
  "Twitch",
] as const;

type SocialAccount =
  OnboardingPayload["digitalIdentity"]["socialAccounts"][number];
type ImageType =
  OnboardingPayload["imageProfile"]["images"][number]["imageType"];

interface OnboardingFlowProps {
  displayName?: string;
}

const list = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function OnboardingFlow({
  displayName = "",
}: OnboardingFlowProps) {
  const router = useRouter();
  const name = displayName.trim().split(/\s+/);
  const [step, setStep] = useState(1);
  const [finishing, setFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identity, setIdentity] = useState({
    firstName: name[0] ?? "",
    lastName: name.slice(1).join(" "),
    publicAlias: "",
    formerNames: "",
    nicknames: "",
    city: "",
    country: "",
    phoneNumbers: "",
    additionalEmails: "",
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [additional, setAdditional] = useState({
    oldUsernames: "",
    gamingNames: "",
    websites: "",
    domains: "",
    companies: "",
    publicProfiles: "",
  });
  const [images, setImages] = useState<
    OnboardingPayload["imageProfile"]["images"]
  >([]);
  const [uploadingType, setUploadingType] = useState<ImageType | null>(null);

  const payload = useMemo<OnboardingPayload>(
    () => ({
      identity: {
        firstName: identity.firstName,
        lastName: identity.lastName,
        publicAlias: identity.publicAlias,
        formerNames: list(identity.formerNames),
        nicknames: list(identity.nicknames),
        city: identity.city,
        country: identity.country,
        phoneNumbers: list(identity.phoneNumbers),
        additionalEmails: list(identity.additionalEmails),
      },
      digitalIdentity: { socialAccounts },
      additionalData: {
        oldUsernames: list(additional.oldUsernames),
        gamingNames: list(additional.gamingNames),
        websites: list(additional.websites),
        domains: list(additional.domains),
        companies: list(additional.companies),
        publicProfiles: list(additional.publicProfiles),
      },
      imageProfile: { images },
    }),
    [additional, identity, images, socialAccounts]
  );

  const next = async () => {
    setErrorMessage(null);
    if (
      step === 1 &&
      (!identity.firstName.trim() || !identity.lastName.trim())
    ) {
      setErrorMessage("Vorname und Nachname werden für Ihr Konto benötigt.");
      return;
    }
    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    const parsed = onboardingPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Angaben."
      );
      return;
    }

    setFinishing(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as ApiResponseBody<{
        redirectTo: string;
      }>;
      if (!response.ok || !result.success) {
        setErrorMessage(
          !result.success
            ? result.error.message
            : "Das Profil konnte nicht gespeichert werden."
        );
        setFinishing(false);
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setErrorMessage(
        "Die sichere Verbindung konnte nicht hergestellt werden."
      );
      setFinishing(false);
    }
  };

  const updateAccount = (
    index: number,
    field: keyof SocialAccount,
    value: string
  ) => {
    setSocialAccounts((current) =>
      current.map((account, itemIndex) =>
        itemIndex === index ? { ...account, [field]: value } : account
      )
    );
  };

  const addAccount = () => {
    setSocialAccounts((current) => [
      ...current,
      { platform: "Instagram", username: "", profileUrl: "" },
    ]);
  };

  const selectImage = async (imageType: ImageType, file?: File) => {
    setErrorMessage(null);
    if (!file) {
      setImages((current) =>
        current.filter((image) => image.imageType !== imageType)
      );
      return;
    }

    setUploadingType(imageType);
    try {
      const body = new FormData();
      body.set("imageType", imageType);
      body.set("file", file);
      const response = await fetch("/api/onboarding/images", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as ApiResponseBody<
        OnboardingPayload["imageProfile"]["images"][number]
      >;
      if (!response.ok || !payload.success) {
        setErrorMessage(
          !payload.success
            ? payload.error.message
            : "Das Bild konnte nicht hochgeladen werden."
        );
        return;
      }
      setImages((current) => {
        const withoutType = current.filter(
          (image) => image.imageType !== imageType
        );
        return [...withoutType, payload.data];
      });
    } catch {
      setErrorMessage("Das Bild konnte nicht hochgeladen werden.");
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="glass hardware-panel rounded-2xl p-5 lg:p-6">
        <div className="mb-7 flex items-center gap-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          <StatusDot pulse tone="online" />
          PROFIL-ASSISTENT AKTIV
        </div>
        <div className="flex gap-3 overflow-x-auto lg:block lg:space-y-2">
          {steps.map((item) => {
            const active = item.number === step;
            const complete = item.number < step;
            return (
              <button
                key={item.number}
                type="button"
                onClick={() => item.number < step && setStep(item.number)}
                aria-current={active ? "step" : undefined}
                className={`min-w-[210px] rounded-xl border p-4 text-left transition-all lg:w-full lg:min-w-0 ${
                  active
                    ? "border-cyber-blue/25 bg-cyber-blue/[0.06]"
                    : "border-transparent bg-white/[0.012]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[9px] ${
                      complete || active
                        ? "text-cyber-cyan/70"
                        : "text-white/18"
                    }`}
                  >
                    0{item.number}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      complete
                        ? "bg-emerald-300/70"
                        : active
                          ? "bg-cyber-cyan"
                          : "bg-white/10"
                    }`}
                  />
                </div>
                <p
                  className={`mt-3 text-xs font-medium ${
                    active ? "text-white/85" : "text-white/38"
                  }`}
                >
                  {item.label}
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-white/22">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="glass-strong hardware-panel min-h-[650px] rounded-[1.5rem] p-6 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
          <div>
            <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/50">
              STEP {step} / 4
            </p>
            <p className="mt-2 text-xs text-white/30">
              Freiwilliges Profil für präzisere spätere Analysen
            </p>
          </div>
          <span className="font-mono text-2xl font-light tabular-nums text-white/70">
            {Math.round((step / 4) * 100)}
            <small className="ml-1 text-[8px] text-white/20">%</small>
          </span>
        </div>
        <div
          className="mt-2 h-[2px] bg-white/[0.05]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((step / 4) * 100)}
          aria-label="Einrichtungsfortschritt"
        >
          <div
            className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan shadow-[0_0_12px_rgba(41,182,246,.3)] transition-all duration-700"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <p className="hud-label">SynSight Einrichtung</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
            {step === 1 && "Wer gehört zu diesem Schutzprofil?"}
            {step === 2 && "Welche Profile gehören zu Ihnen?"}
            {step === 3 && "Welche früheren Spuren sind relevant?"}
            {step === 4 && "Optionales Bildprofil vorbereiten."}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300/50">
            {step === 1 &&
              "Vor- und Nachname ordnen Ihr Konto eindeutig zu. Alle weiteren Angaben sind optional und können später ergänzt oder entfernt werden."}
            {step === 2 &&
              "Profile helfen später, echte Treffer von gleichnamigen Personen zu unterscheiden. Sie bestimmen selbst, welche Netzwerke gespeichert werden."}
            {step === 3 &&
              "Alte Namen und Webseiten können öffentlich auffindbar bleiben. Freiwillige Angaben verbessern später die Zuordnung, starten aber noch keine Analyse."}
            {step === 4 &&
              "Mehrere Blickwinkel können zukünftig Verwechslungen reduzieren. Bilder sind optional; in dieser Phase wird nur die sichere Speicherstruktur vorbereitet."}
          </p>

          <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-[10px] leading-relaxed text-white/32">
            <span className="font-mono text-cyber-cyan/55">
              DATENKONTROLLE /{" "}
            </span>
            Ihre Angaben werden ausschließlich Ihrem Profil zugeordnet. Ohne
            Ihre aktive Zustimmung startet keine Analyse.
          </div>

          <div className="mt-8">
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Vorname"
                  name="firstName"
                  value={identity.firstName}
                  onChange={(event) =>
                    setIdentity({ ...identity, firstName: event.target.value })
                  }
                  required
                />
                <FormField
                  label="Nachname"
                  name="lastName"
                  value={identity.lastName}
                  onChange={(event) =>
                    setIdentity({ ...identity, lastName: event.target.value })
                  }
                  required
                />
                <FormField
                  label="Alias"
                  name="publicAlias"
                  hint="OPTIONAL"
                  info="Ein öffentlicher Name, unter dem Sie online bekannt sind."
                  value={identity.publicAlias}
                  onChange={(event) =>
                    setIdentity({
                      ...identity,
                      publicAlias: event.target.value,
                    })
                  }
                />
                <FormField
                  label="Frühere Namen"
                  name="formerNames"
                  hint="KOMMAGETRENNT"
                  value={identity.formerNames}
                  onChange={(event) =>
                    setIdentity({
                      ...identity,
                      formerNames: event.target.value,
                    })
                  }
                />
                <FormField
                  label="Benutzernamen"
                  name="nicknames"
                  hint="KOMMAGETRENNT"
                  info="Online-Benutzernamen und Spitznamen (z. B. Foren, Social Media)."
                  value={identity.nicknames}
                  onChange={(event) =>
                    setIdentity({ ...identity, nicknames: event.target.value })
                  }
                />
                <FormField
                  label="Wohnort"
                  name="city"
                  hint="OPTIONAL"
                  value={identity.city}
                  onChange={(event) =>
                    setIdentity({ ...identity, city: event.target.value })
                  }
                />
                <FormField
                  label="Land"
                  name="country"
                  hint="OPTIONAL"
                  value={identity.country}
                  onChange={(event) =>
                    setIdentity({ ...identity, country: event.target.value })
                  }
                />
                <FormField
                  label="Telefonnummern"
                  name="phoneNumbers"
                  hint="KOMMAGETRENNT"
                  info="Optional. Hilft später, öffentlich gewordene Telefonnummern eindeutig zuzuordnen."
                  value={identity.phoneNumbers}
                  onChange={(event) =>
                    setIdentity({
                      ...identity,
                      phoneNumbers: event.target.value,
                    })
                  }
                />
                <FormField
                  label="Weitere E-Mail-Adressen"
                  name="additionalEmails"
                  hint="KOMMAGETRENNT"
                  value={identity.additionalEmails}
                  onChange={(event) =>
                    setIdentity({
                      ...identity,
                      additionalEmails: event.target.value,
                    })
                  }
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {socialAccounts.map((account, index) => (
                  <div
                    key={`${index}-${account.platform}`}
                    className="grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] p-4 sm:grid-cols-[150px_1fr_1.4fr_auto]"
                  >
                    <select
                      value={account.platform}
                      onChange={(event) =>
                        updateAccount(index, "platform", event.target.value)
                      }
                      aria-label="Netzwerk"
                      className="rounded-lg border border-white/[0.08] bg-[#07101c] px-3 py-3 text-xs text-white/75 outline-none focus:border-cyber-blue/40"
                    >
                      {platforms.map((platform) => (
                        <option key={platform}>{platform}</option>
                      ))}
                    </select>
                    <input
                      value={account.username}
                      onChange={(event) =>
                        updateAccount(index, "username", event.target.value)
                      }
                      placeholder="Benutzername"
                      aria-label="Benutzername"
                      className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-3 text-xs text-white outline-none focus:border-cyber-blue/40"
                    />
                    <input
                      value={account.profileUrl}
                      onChange={(event) =>
                        updateAccount(index, "profileUrl", event.target.value)
                      }
                      placeholder="https://profil-url.de"
                      aria-label="Profil URL"
                      type="url"
                      className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-3 text-xs text-white outline-none focus:border-cyber-blue/40"
                    />
                    <button
                      type="button"
                      aria-label={`${account.platform} entfernen`}
                      onClick={() =>
                        setSocialAccounts((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="rounded-lg border border-white/[0.07] px-3 text-white/30 hover:text-rose-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addAccount}>
                  + Netzwerk hinzufügen
                </Button>
                {socialAccounts.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/28">
                    Noch kein Netzwerk hinzugefügt. Dieser Schritt kann
                    vollständig übersprungen werden.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  ["Alte Benutzernamen", "oldUsernames"],
                  ["Gaming-Namen", "gamingNames"],
                  ["Webseiten", "websites"],
                  ["Domains", "domains"],
                  ["Firmen", "companies"],
                  ["Öffentliche Profile", "publicProfiles"],
                ].map(([label, key]) => (
                  <FormField
                    key={key}
                    label={label}
                    name={key}
                    hint="OPTIONAL · KOMMAGETRENNT"
                    value={additional[key as keyof typeof additional]}
                    onChange={(event) =>
                      setAdditional({
                        ...additional,
                        [key]: event.target.value,
                      })
                    }
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["front", "Frontansicht"],
                  ["left_profile", "Linkes Profil"],
                  ["right_profile", "Rechtes Profil"],
                  ["angled", "Schräge Ansicht"],
                ].map(([type, label]) => {
                  const selected = images.find(
                    (image) => image.imageType === type
                  );
                  return (
                    <label
                      key={type}
                      className="group cursor-pointer rounded-xl border border-dashed border-white/[0.09] bg-white/[0.012] p-5 transition hover:border-cyber-blue/30"
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/65">
                          {label}
                        </span>
                        <InfoTooltip label={label}>
                          Dieser Blickwinkel hilft später, ähnliche Profilbilder
                          zuverlässiger zu unterscheiden.
                        </InfoTooltip>
                      </span>
                      <span className="mt-5 block rounded-lg border border-white/[0.06] py-4 text-center font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
                        {uploadingType === type
                          ? "WIRD OPTIMIERT…"
                          : selected
                            ? "BILD GESPEICHERT"
                            : "BILD AUSWÄHLEN"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic"
                        className="sr-only"
                        disabled={uploadingType !== null || finishing}
                        onChange={(event) => {
                          void selectImage(
                            type as ImageType,
                            event.target.files?.[0]
                          );
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  );
                })}
                <p className="sm:col-span-2 text-[10px] leading-relaxed text-white/24">
                  Zulässig: JPG, JPEG, PNG, WEBP oder HEIC (max. 8 MB). Jedes
                  Bild wird serverseitig verschlüsselt archiviert und als
                  Analyse-/Thumbnail-Version optimiert. Eine Gesichtsanalyse
                  findet in diesem Sprint ausdrücklich nicht statt.
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/[0.05] px-4 py-3 text-xs text-rose-100/75"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || finishing}
          >
            Zurück
          </Button>
          <div className="flex items-center gap-3">
            {step > 1 && step < 4 && (
              <button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                className="px-3 text-xs text-white/30 hover:text-white/60"
              >
                Optionalen Schritt überspringen
              </button>
            )}
            <Button onClick={next} disabled={finishing}>
              {finishing
                ? "Profil wird sicher gespeichert..."
                : step === 4
                  ? "Profil abschließen"
                  : "Weiter"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
