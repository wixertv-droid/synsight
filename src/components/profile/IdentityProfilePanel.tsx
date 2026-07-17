"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { ApiResponseBody } from "@/lib/api/response";
import type { IdentityView } from "@/lib/services/identity-service";
import {
  socialPlatformSchema,
  type SocialPlatform,
} from "@/lib/validation/identity";

const PLATFORMS = socialPlatformSchema.options;

const HELP = {
  personal:
    "Diese Angaben sind freiwillig. Sie helfen später dabei, Treffer besser zuzuordnen — zum Beispiel bei Namensgleichheiten.",
  aliases:
    "Nicknames und frühere Namen können in öffentlichen Quellen auftauchen. Alles freiwillig und jederzeit änderbar.",
  emails:
    "Zusätzliche E-Mail-Adressen, die mit Ihnen in Verbindung stehen könnten. Ihre Login-E-Mail bleibt unverändert.",
  phones:
    "Weitere Nummern, die öffentlich oder in alten Kontakten vorkommen könnten. Freiwillig.",
  social:
    "Verknüpfen Sie Profile aus sozialen Netzwerken. Mehrere Konten pro Netzwerk sind möglich.",
  web: "Webseiten, Domains und Unternehmen helfen bei der späteren Einordnung digitaler Spuren. Freiwillig.",
  images:
    "Diese Bilder dienen ausschließlich späteren Such- und Vergleichsfunktionen. Originale werden verschlüsselt gespeichert. Noch keine automatische Bildsuche.",
};

interface IdentityProfilePanelProps {
  initial: IdentityView;
}

function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <p className="mb-2 text-[11px] text-white/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60"
          >
            {value} ×
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const next = draft.trim();
            if (!next || values.includes(next)) return;
            onChange([...values, next]);
            setDraft("");
          }}
        >
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}

function Panel({
  title,
  info,
  children,
}: {
  title: string;
  info: string;
  children: ReactNode;
}) {
  return (
    <section className="glass hardware-panel rounded-[1.4rem] p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-.02em] text-white/85">
          {title}
        </h2>
        <InfoTooltip label={title}>{info}</InfoTooltip>
      </div>
      {children}
    </section>
  );
}

export default function IdentityProfilePanel({
  initial,
}: IdentityProfilePanelProps) {
  const [form, setForm] = useState<IdentityView>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socialDraft, setSocialDraft] = useState({
    platform: "Instagram" as SocialPlatform,
    username: "",
    profileUrl: "",
    accountStatus: "active" as "active" | "former" | "unknown",
  });
  const [uploading, setUploading] = useState(false);

  const progressTone = useMemo(() => {
    if (form.completenessPercent >= 85) return "text-emerald-200/70";
    if (form.completenessPercent >= 42) return "text-cyber-cyan/70";
    return "text-amber-100/70";
  }, [form.completenessPercent]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personal: form.personal,
          aliases: form.aliases,
          emails: form.emails,
          phoneNumbers: form.phoneNumbers,
          socialAccounts: form.socialAccounts,
          websites: form.websites,
          domains: form.domains,
          companies: form.companies,
          images: form.images,
        }),
      });
      const body = (await response.json()) as ApiResponseBody<IdentityView>;
      if (!response.ok || !body.success) {
        setError(
          !body.success ? body.error.message : "Speichern fehlgeschlagen."
        );
        return;
      }
      setForm(body.data);
      setMessage("Identitätsprofil gespeichert.");
    } catch {
      setError("Verbindung zum Server nicht möglich.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (form.images.length >= 4) {
      setError("Maximal 4 Referenzbilder möglich.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Die Bilddatei darf höchstens 8 MB groß sein.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const slots = [
        "front",
        "left_profile",
        "right_profile",
        "angled",
      ] as const;
      const used = new Set(form.images.map((image) => image.imageType));
      const imageType = slots.find((slot) => !used.has(slot)) ?? "front";
      const data = new FormData();
      data.set("imageType", imageType);
      data.set("file", file);
      const response = await fetch("/api/identity/images", {
        method: "POST",
        body: data,
      });
      const body = (await response.json()) as ApiResponseBody<
        IdentityView["images"][number]
      >;
      if (!response.ok || !body.success) {
        setError(
          !body.success ? body.error.message : "Bild-Upload fehlgeschlagen."
        );
        return;
      }
      setForm((current) => ({
        ...current,
        images: [...current.images, body.data].slice(0, 4),
      }));
      setMessage("Bild verarbeitet und serverseitig gespeichert.");
    } catch {
      setError("Bild konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageType: string) => {
    setError(null);
    try {
      const response = await fetch(
        `/api/identity/images/${encodeURIComponent(imageType)}`,
        { method: "DELETE" }
      );
      const body = (await response.json()) as ApiResponseBody<{
        deleted: boolean;
      }>;
      if (!response.ok || !body.success) {
        setError(
          !body.success
            ? body.error.message
            : "Bild konnte nicht gelöscht werden."
        );
        return;
      }
      setForm((current) => ({
        ...current,
        images: current.images.filter((image) => image.imageType !== imageType),
      }));
      setMessage("Referenzbild gelöscht.");
    } catch {
      setError("Bild konnte nicht gelöscht werden.");
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="glass hardware-panel rounded-[1.4rem] p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
              PROFILFORTSCHRITT
            </p>
            <p className={`mt-2 text-3xl font-semibold ${progressTone}`}>
              {form.completenessPercent} %
            </p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/35">
              Alle Angaben sind freiwillig. Je vollständiger Ihr Profil, desto
              präzisere Ergebnisse sind später möglich.
            </p>
          </div>
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all"
              style={{ width: `${form.completenessPercent}%` }}
            />
          </div>
        </div>
      </div>

      <Panel title="Persönliche Daten" info={HELP.personal}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Vorname"
            value={form.personal.firstName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: {
                  ...current.personal,
                  firstName: event.target.value,
                },
              }))
            }
            required
          />
          <FormField
            label="Nachname"
            value={form.personal.lastName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, lastName: event.target.value },
              }))
            }
            required
          />
          <FormField
            label="Geburtsdatum"
            type="date"
            value={form.personal.birthDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: {
                  ...current.personal,
                  birthDate: event.target.value,
                },
              }))
            }
            info="Freiwillig — hilft bei der Unterscheidung gleichnamiger Personen."
          />
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[11px] text-white/45">
              Geschlecht
              <InfoTooltip label="Geschlecht">
                Freiwillig. Wird nicht öffentlich angezeigt.
              </InfoTooltip>
            </span>
            <select
              value={form.personal.gender}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  personal: { ...current.personal, gender: event.target.value },
                }))
              }
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            >
              <option value="">Keine Angabe</option>
              <option value="female">Weiblich</option>
              <option value="male">Männlich</option>
              <option value="non_binary">Nicht-binär</option>
              <option value="prefer_not_to_say">Keine Angabe</option>
              <option value="other">Andere</option>
            </select>
          </label>
          <FormField
            label="Telefonnummer"
            value={form.personal.phone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, phone: event.target.value },
              }))
            }
          />
          <FormField
            label="Adresse"
            value={form.personal.addressLine}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: {
                  ...current.personal,
                  addressLine: event.target.value,
                },
              }))
            }
          />
          <FormField
            label="Wohnort"
            value={form.personal.location}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, location: event.target.value },
              }))
            }
          />
          <FormField
            label="Unternehmen"
            value={form.personal.company}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, company: event.target.value },
              }))
            }
          />
        </div>
        <div className="mt-5">
          <StringListEditor
            label="Frühere Wohnorte"
            values={form.personal.previousLocations}
            onChange={(previousLocations) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, previousLocations },
              }))
            }
            placeholder="z. B. Berlin"
          />
        </div>
      </Panel>

      <Panel title="Benutzernamen" info={HELP.aliases}>
        <div className="grid gap-5">
          <FormField
            label="Alias / öffentlicher Name"
            value={form.aliases.publicAlias}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                aliases: {
                  ...current.aliases,
                  publicAlias: event.target.value,
                },
              }))
            }
          />
          <StringListEditor
            label="Nicknames"
            values={form.aliases.nicknames}
            onChange={(nicknames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, nicknames },
              }))
            }
            placeholder="Nickname hinzufügen"
          />
          <StringListEditor
            label="Frühere Namen"
            values={form.aliases.formerNames}
            onChange={(formerNames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, formerNames },
              }))
            }
            placeholder="Früherer Name"
          />
          <StringListEditor
            label="Benutzernamen"
            values={form.aliases.usernames}
            onChange={(usernames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, usernames },
              }))
            }
            placeholder="Benutzername"
          />
          <StringListEditor
            label="Gamertags"
            values={form.aliases.gamingNames}
            onChange={(gamingNames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, gamingNames },
              }))
            }
            placeholder="Gamertag"
          />
        </div>
      </Panel>

      <Panel title="E-Mail-Adressen" info={HELP.emails}>
        <StringListEditor
          label="Zusätzliche E-Mails"
          values={form.emails}
          onChange={(emails) => setForm((current) => ({ ...current, emails }))}
          placeholder="weitere@email.de"
        />
      </Panel>

      <Panel title="Telefonnummern" info={HELP.phones}>
        <StringListEditor
          label="Weitere Nummern"
          values={form.phoneNumbers}
          onChange={(phoneNumbers) =>
            setForm((current) => ({ ...current, phoneNumbers }))
          }
          placeholder="+49 …"
        />
      </Panel>

      <Panel title="Soziale Netzwerke" info={HELP.social}>
        <div className="space-y-3">
          {form.socialAccounts.map((account, index) => (
            <div
              key={`${account.platform}-${account.username}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
            >
              <div>
                <p className="text-sm text-white/75">
                  {account.platform} · @{account.username}
                </p>
                <p className="mt-1 font-mono text-[9px] text-white/25">
                  {account.accountStatus}
                  {account.profileUrl ? ` · ${account.profileUrl}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    socialAccounts: current.socialAccounts.filter(
                      (_, i) => i !== index
                    ),
                  }))
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] text-white/45">
              Netzwerk
            </span>
            <select
              value={socialDraft.platform}
              onChange={(event) =>
                setSocialDraft((current) => ({
                  ...current,
                  platform: event.target.value as SocialPlatform,
                }))
              }
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white/80"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] text-white/45">Status</span>
            <select
              value={socialDraft.accountStatus}
              onChange={(event) =>
                setSocialDraft((current) => ({
                  ...current,
                  accountStatus: event.target.value as
                    "active" | "former" | "unknown",
                }))
              }
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white/80"
            >
              <option value="active">aktiv</option>
              <option value="former">ehemalig</option>
              <option value="unknown">unbekannt</option>
            </select>
          </label>
          <FormField
            label="Benutzername"
            value={socialDraft.username}
            onChange={(event) =>
              setSocialDraft((current) => ({
                ...current,
                username: event.target.value,
              }))
            }
          />
          <FormField
            label="Profil-URL (optional)"
            value={socialDraft.profileUrl}
            onChange={(event) =>
              setSocialDraft((current) => ({
                ...current,
                profileUrl: event.target.value,
              }))
            }
          />
        </div>
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            if (!socialDraft.username.trim()) return;
            setForm((current) => ({
              ...current,
              socialAccounts: [
                ...current.socialAccounts,
                {
                  platform: socialDraft.platform,
                  username: socialDraft.username.trim(),
                  profileUrl: socialDraft.profileUrl.trim(),
                  accountStatus: socialDraft.accountStatus,
                },
              ],
            }));
            setSocialDraft((current) => ({
              ...current,
              username: "",
              profileUrl: "",
            }));
          }}
        >
          Konto hinzufügen
        </Button>
      </Panel>

      <Panel title="Unternehmen, Webseiten & Domains" info={HELP.web}>
        <div className="space-y-5">
          <StringListEditor
            label="Webseiten"
            values={form.websites}
            onChange={(websites) =>
              setForm((current) => ({ ...current, websites }))
            }
            placeholder="example.com"
          />
          <StringListEditor
            label="Domains"
            values={form.domains}
            onChange={(domains) =>
              setForm((current) => ({ ...current, domains }))
            }
            placeholder="example.org"
          />
          <StringListEditor
            label="Unternehmen"
            values={form.companies}
            onChange={(companies) =>
              setForm((current) => ({ ...current, companies }))
            }
            placeholder="Firmenname"
          />
        </div>
      </Panel>

      <Panel title="Referenzbilder" info={HELP.images}>
        <p className="mb-4 text-xs leading-relaxed text-white/35">
          Bis zu 4 Bilder. Originale werden verschlüsselt gespeichert; für die
          Analyse entstehen WebP-Versionen (max. 1600px) und Thumbnails (300px)
          mit SHA-256-Prüfsumme.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {form.images.map((image) => (
            <div
              key={image.storagePath}
              className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] text-[11px] text-white/55"
            >
              <Image
                src={`/api/identity/images/${image.imageType}/thumbnail?v=${image.contentHash ?? ""}`}
                alt={`Referenzbild ${image.imageType}`}
                width={300}
                height={300}
                unoptimized
                className="aspect-square w-full object-cover"
              />
              <div className="flex items-center justify-between px-3 py-2">
                <span>{image.imageType}</span>
                <button
                  type="button"
                  className="text-white/35 hover:text-white/70"
                  onClick={() => void deleteImage(image.imageType)}
                  aria-label={`${image.imageType} löschen`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.12] px-4 py-3 text-xs text-white/45 hover:border-cyber-cyan/30 hover:text-white/70">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            disabled={uploading || form.images.length >= 4}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
              event.currentTarget.value = "";
            }}
          />
          {uploading ? "Bild wird verarbeitet…" : "Bild hochladen"}
        </label>
      </Panel>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-200/80"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-xs text-emerald-100/75"
        >
          {message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
            Speichern…
          </span>
        ) : (
          "Identitätsprofil speichern"
        )}
      </Button>
    </form>
  );
}
