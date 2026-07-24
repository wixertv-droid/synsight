"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ReferenceImageSlots from "@/components/profile/ReferenceImageSlots";
import type { ApiResponseBody } from "@/lib/api/response";
import type { IdentityView } from "@/lib/services/identity-service";
import {
  socialPlatformSchema,
  type SocialPlatform,
} from "@/lib/validation/identity";
import type { ProfileImageType } from "@/types/domain";
import {
  prepareProfileImageForUpload,
  readImageUploadError,
} from "@/lib/media/prepare-upload-image";
import {
  buildProfileModuleReadiness,
  joinFirstNames,
  splitFirstNames,
} from "@/lib/profile/module-readiness";

const PLATFORMS = socialPlatformSchema.options;

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
      <p className="mb-2 font-mono text-[9px] tracking-[.12em] text-white/40">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded-md border border-cyber-cyan/20 bg-cyber-cyan/[0.06] px-2.5 py-1 font-mono text-[11px] text-cyber-cyan/80"
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
          className="flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
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

function CollapsibleCard({
  id,
  title,
  subtitle,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-[#070b12]/80 shadow-[0_0_0_1px_rgba(41,182,246,0.04)]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02] md:px-6"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-mono text-[8px] tracking-[.18em] text-cyber-cyan/55">
            IDENTITY · MODULE
          </p>
          <h2 className="mt-1 text-base font-medium tracking-[-.02em] text-white/85 md:text-lg">
            {title}
          </h2>
          <p className="mt-1 text-xs text-white/40">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {badge}
          <span
            className={`font-mono text-[10px] text-cyber-cyan/70 transition ${open ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>
      {open ? (
        <div className="border-t border-white/[0.06] px-5 py-5 md:px-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ReadyBadge({
  ready,
  filled,
  total,
}: {
  ready: boolean;
  filled: number;
  total: number;
}) {
  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[9px] tracking-[.08em] ${
        ready
          ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200/80"
          : "border-amber-300/25 bg-amber-300/[0.06] text-amber-100/70"
      }`}
    >
      {ready ? "READY" : `${filled}/${total}`}
    </span>
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
  const [uploadingType, setUploadingType] = useState<ProfileImageType | null>(
    null
  );
  const [mobileSession, setMobileSession] = useState<{
    qrDataUrl: string;
    uploadUrl: string;
    expiresAt: string;
  } | null>(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    stammdaten: true,
    google: true,
    exposure: false,
    phone: false,
    email: false,
    web: false,
    alias: false,
    social: false,
    image: false,
    deep: false,
  });

  const readiness = useMemo(() => buildProfileModuleReadiness(form), [form]);
  const byKey = useMemo(
    () => Object.fromEntries(readiness.map((r) => [r.key, r])),
    [readiness]
  );

  const firstNames = useMemo(
    () => splitFirstNames(form.personal.firstName),
    [form.personal.firstName]
  );

  const toggle = (id: string) =>
    setOpenCards((current) => ({ ...current, [id]: !current[id] }));

  const setPrimaryFirstName = (primary: string) => {
    setForm((current) => ({
      ...current,
      personal: {
        ...current.personal,
        firstName: joinFirstNames(
          primary,
          splitFirstNames(current.personal.firstName).additional
        ),
      },
    }));
  };

  const setAdditionalFirstNames = (additional: string[]) => {
    setForm((current) => ({
      ...current,
      personal: {
        ...current.personal,
        firstName: joinFirstNames(
          splitFirstNames(current.personal.firstName).primary ||
            current.personal.firstName,
          additional
        ),
      },
    }));
  };

  const refreshImages = useCallback(async () => {
    try {
      const response = await fetch("/api/identity", {
        credentials: "same-origin",
      });
      const body = (await response.json()) as ApiResponseBody<IdentityView>;
      if (!response.ok || !body.success) return;
      setForm((current) => ({
        ...current,
        images: body.data.images,
        completenessPercent: body.data.completenessPercent,
      }));
    } catch {
      /* polling best-effort */
    }
  }, []);

  useEffect(() => {
    if (!mobileSession) return;
    const timer = window.setInterval(() => {
      void refreshImages();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [mobileSession, refreshImages]);

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
      setMessage("Cyber-Identity-Profil gespeichert.");
    } catch {
      setError("Verbindung zum Server nicht möglich.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (imageType: ProfileImageType, file: File) => {
    setUploadingType(imageType);
    setError(null);
    try {
      const prepared = await prepareProfileImageForUpload(file);
      const data = new FormData();
      data.set("imageType", imageType);
      data.set("file", prepared);
      const response = await fetch("/api/identity/images", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        setError(await readImageUploadError(response));
        return;
      }
      const body = (await response.json()) as ApiResponseBody<
        IdentityView["images"][number]
      >;
      if (!body.success) {
        setError(body.error.message || "Bild-Upload fehlgeschlagen.");
        return;
      }
      setForm((current) => ({
        ...current,
        images: [
          ...current.images.filter(
            (image) => image.imageType !== body.data.imageType
          ),
          body.data,
        ],
      }));
      setMessage("Bild komprimiert, verschlüsselt und gespeichert.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Bild konnte nicht hochgeladen werden."
      );
    } finally {
      setUploadingType(null);
    }
  };

  const startMobileUpload = async () => {
    setMobileLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/identity/images/mobile-session", {
        method: "POST",
      });
      const body = (await response.json()) as ApiResponseBody<{
        qrDataUrl: string;
        uploadUrl: string;
        expiresAt: string;
      }>;
      if (!response.ok || !body.success) {
        setError(
          !body.success
            ? body.error.message
            : "QR-Code konnte nicht erzeugt werden."
        );
        return;
      }
      setMobileSession(body.data);
      setMessage(
        "QR-Code bereit. Mit dem Handy scannen und Bilder direkt aufnehmen."
      );
    } catch {
      setError("QR-Code konnte nicht erzeugt werden.");
    } finally {
      setMobileLoading(false);
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
    <form onSubmit={save} className="space-y-4">
      {/* Fortschrittsbalken beibehalten */}
      <div className="rounded-[1.2rem] border border-white/[0.08] bg-[#070b12]/90 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[8px] tracking-[.18em] text-cyber-cyan/55">
              CYBER IDENTITY · PROFILFORTSCHRITT
            </p>
            <p className={`mt-2 text-3xl font-semibold ${progressTone}`}>
              {form.completenessPercent} %
            </p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/35">
              Stammdaten zuerst, danach modulweise für jede Analyseart. Bereits
              vorhandene Angaben werden übernommen — Sie können jederzeit
              weitere hinzufügen.
            </p>
          </div>
          <div className="mission-progress relative h-[7px] w-full max-w-sm overflow-hidden rounded-[2px] bg-white/[0.065]">
            <div
              className="mission-progress-fill relative h-full transition-[width] duration-300"
              style={{ width: `${form.completenessPercent}%` }}
            >
              <span className="mission-progress-head absolute right-0 top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[#cff8ff]" />
            </div>
          </div>
        </div>
      </div>

      {/* 1. Stammdaten */}
      <CollapsibleCard
        id="stammdaten"
        title="Stammdaten"
        subtitle="Name, Kontakt, Adresse — Kern der digitalen Identität"
        open={openCards.stammdaten}
        onToggle={() => toggle("stammdaten")}
        badge={
          <ReadyBadge
            ready={Boolean(form.personal.firstName && form.personal.lastName)}
            filled={
              [
                form.personal.firstName,
                form.personal.lastName,
                form.personal.phone || form.phoneNumbers[0],
                form.personal.location,
              ].filter(Boolean).length
            }
            total={4}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Vorname (Haupt)"
            value={firstNames.primary}
            onChange={(event) => setPrimaryFirstName(event.target.value)}
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
        </div>
        <div className="mt-4">
          <StringListEditor
            label="WEITERE VORNAMEN"
            values={firstNames.additional}
            onChange={setAdditionalFirstNames}
            placeholder="Weiteren Vornamen hinzufügen"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            info="Freiwillig — hilft bei Namensvettern."
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
              className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
            >
              <option value="">Keine Angabe</option>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
              <option value="non_binary">nicht-binär</option>
              <option value="prefer_not_to_say">keine Angabe</option>
              <option value="other">andere</option>
            </select>
          </label>
          <FormField
            label="Telefon (Haupt)"
            value={form.personal.phone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, phone: event.target.value },
              }))
            }
            placeholder="+49 …"
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
            placeholder="z. B. Gera"
          />
          <FormField
            label="Straße / Adresse"
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
            label="Unternehmen (Haupt)"
            value={form.personal.company}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, company: event.target.value },
              }))
            }
          />
        </div>
        <div className="mt-4">
          <StringListEditor
            label="FRÜHERE WOHNORTE"
            values={form.personal.previousLocations}
            onChange={(previousLocations) =>
              setForm((current) => ({
                ...current,
                personal: { ...current.personal, previousLocations },
              }))
            }
            placeholder="z. B. Leipzig"
          />
        </div>
      </CollapsibleCard>

      {/* 2. Google Analyse */}
      <CollapsibleCard
        id="google"
        title="Google Analyse"
        subtitle="OSINT-Signale für die öffentliche Websuche"
        open={openCards.google}
        onToggle={() => toggle("google")}
        badge={
          byKey.google_search ? (
            <ReadyBadge
              ready={byKey.google_search.ready}
              filled={byKey.google_search.filled}
              total={byKey.google_search.total}
            />
          ) : null
        }
      >
        {byKey.google_search?.missing.length ? (
          <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2 font-mono text-[10px] text-amber-100/70">
            FEHLT · {byKey.google_search.missing.join(" · ")}
          </p>
        ) : (
          <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 font-mono text-[10px] text-emerald-200/75">
            STAMMDATEN + SIGNALE AUSREICHEND FÜR GOOGLE OSINT
          </p>
        )}
        <div className="space-y-5">
          <StringListEditor
            label="E-MAIL-ADRESSEN"
            values={form.emails}
            onChange={(emails) =>
              setForm((current) => ({ ...current, emails }))
            }
            placeholder="name@domain.de"
          />
          <StringListEditor
            label="WEITERE TELEFONNUMMERN"
            values={form.phoneNumbers}
            onChange={(phoneNumbers) =>
              setForm((current) => ({ ...current, phoneNumbers }))
            }
            placeholder="+49 …"
          />
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
            label="BENUTZERNAMEN"
            values={form.aliases.usernames}
            onChange={(usernames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, usernames, nicknames: [] },
              }))
            }
            placeholder="Benutzername hinzufügen"
          />
          <StringListEditor
            label="WEITERE UNTERNEHMEN"
            values={form.companies}
            onChange={(companies) =>
              setForm((current) => ({ ...current, companies }))
            }
            placeholder="Firmenname"
          />
          <StringListEditor
            label="WEBSITES"
            values={form.websites}
            onChange={(websites) =>
              setForm((current) => ({ ...current, websites }))
            }
            placeholder="example.com"
          />
          <StringListEditor
            label="DOMAINS"
            values={form.domains}
            onChange={(domains) =>
              setForm((current) => ({ ...current, domains }))
            }
            placeholder="example.org"
          />
        </div>
      </CollapsibleCard>

      {/* Digital Leak & Exposure */}
      <CollapsibleCard
        id="exposure"
        title="Digital Leak & Exposure Scan"
        subtitle="E-Mail- und Telefon-Identifikatoren für Leak-Prüfung"
        open={openCards.exposure}
        onToggle={() => toggle("exposure")}
        badge={
          byKey.digital_leak_exposure ? (
            <ReadyBadge
              ready={byKey.digital_leak_exposure.ready}
              filled={byKey.digital_leak_exposure.filled}
              total={byKey.digital_leak_exposure.total}
            />
          ) : null
        }
      >
        {byKey.digital_leak_exposure?.missing.length ? (
          <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2 font-mono text-[10px] text-amber-100/70">
            FEHLT · {byKey.digital_leak_exposure.missing.join(" · ")}
          </p>
        ) : (
          <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 font-mono text-[10px] text-emerald-200/75">
            E-MAIL ODER TELEFON VORHANDEN — BEREIT FÜR EXPOSURE SCAN
          </p>
        )}
        <div className="space-y-5">
          <StringListEditor
            label="E-MAIL-ADRESSEN"
            values={form.emails}
            onChange={(emails) =>
              setForm((current) => ({ ...current, emails }))
            }
            placeholder="name@domain.de"
          />
          <StringListEditor
            label="TELEFONNUMMERN"
            values={form.phoneNumbers}
            onChange={(phoneNumbers) =>
              setForm((current) => ({ ...current, phoneNumbers }))
            }
            placeholder="+49 …"
          />
          {form.personal.phone ? (
            <p className="font-mono text-[10px] text-emerald-200/70">
              HAUPTTELEFON AUS STAMMDATEN · {form.personal.phone}
            </p>
          ) : null}
        </div>
      </CollapsibleCard>

      {/* 3. Telefon */}
      <CollapsibleCard
        id="phone"
        title="Telefon Analyse"
        subtitle="Nummern für Telefon-Exposure"
        open={openCards.phone}
        onToggle={() => toggle("phone")}
        badge={
          byKey.phone_analysis ? (
            <ReadyBadge
              ready={byKey.phone_analysis.ready}
              filled={byKey.phone_analysis.filled}
              total={byKey.phone_analysis.total}
            />
          ) : null
        }
      >
        {form.personal.phone ? (
          <p className="mb-3 font-mono text-[10px] text-emerald-200/70">
            ÜBERNOMMEN AUS STAMMDATEN · {form.personal.phone}
          </p>
        ) : null}
        <StringListEditor
          label="TELEFONNUMMERN"
          values={form.phoneNumbers}
          onChange={(phoneNumbers) =>
            setForm((current) => ({ ...current, phoneNumbers }))
          }
          placeholder="+49 …"
        />
      </CollapsibleCard>

      {/* 4. E-Mail */}
      <CollapsibleCard
        id="email"
        title="E-Mail Analyse"
        subtitle="Adressen für Leak- und Exposure-Scans"
        open={openCards.email}
        onToggle={() => toggle("email")}
        badge={
          byKey.email_analysis ? (
            <ReadyBadge
              ready={byKey.email_analysis.ready}
              filled={byKey.email_analysis.filled}
              total={byKey.email_analysis.total}
            />
          ) : null
        }
      >
        <StringListEditor
          label="E-MAIL-ADRESSEN"
          values={form.emails}
          onChange={(emails) => setForm((current) => ({ ...current, emails }))}
          placeholder="name@domain.de"
        />
      </CollapsibleCard>

      {/* 5. Web / Domain */}
      <CollapsibleCard
        id="web"
        title="Website & Domain Analyse"
        subtitle="Öffentliche Web-Assets"
        open={openCards.web}
        onToggle={() => toggle("web")}
        badge={
          <ReadyBadge
            ready={
              Boolean(byKey.website_analysis?.ready) &&
              Boolean(byKey.domain_analysis?.ready)
            }
            filled={
              (byKey.website_analysis?.filled ?? 0) +
              (byKey.domain_analysis?.filled ?? 0)
            }
            total={2}
          />
        }
      >
        <div className="space-y-5">
          <StringListEditor
            label="WEBSITES"
            values={form.websites}
            onChange={(websites) =>
              setForm((current) => ({ ...current, websites }))
            }
            placeholder="example.com"
          />
          <StringListEditor
            label="DOMAINS"
            values={form.domains}
            onChange={(domains) =>
              setForm((current) => ({ ...current, domains }))
            }
            placeholder="example.org"
          />
        </div>
      </CollapsibleCard>

      {/* 6. Alias */}
      <CollapsibleCard
        id="alias"
        title="Alias Analyse"
        subtitle="Benutzernamen, Gamertags, frühere Namen"
        open={openCards.alias}
        onToggle={() => toggle("alias")}
        badge={
          byKey.alias_analysis ? (
            <ReadyBadge
              ready={byKey.alias_analysis.ready}
              filled={byKey.alias_analysis.filled}
              total={byKey.alias_analysis.total}
            />
          ) : null
        }
      >
        <div className="space-y-5">
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
            label="BENUTZERNAMEN"
            values={form.aliases.usernames}
            onChange={(usernames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, usernames, nicknames: [] },
              }))
            }
            placeholder="Benutzername"
          />
          <StringListEditor
            label="GAMERTAGS"
            values={form.aliases.gamingNames}
            onChange={(gamingNames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, gamingNames },
              }))
            }
            placeholder="Gamertag"
          />
          <StringListEditor
            label="FRÜHERE NAMEN"
            values={form.aliases.formerNames}
            onChange={(formerNames) =>
              setForm((current) => ({
                ...current,
                aliases: { ...current.aliases, formerNames },
              }))
            }
            placeholder="Früherer Name"
          />
        </div>
      </CollapsibleCard>

      {/* 7. Social */}
      <CollapsibleCard
        id="social"
        title="Social Media Analyse"
        subtitle="Verknüpfte Netzwerke und Profile"
        open={openCards.social}
        onToggle={() => toggle("social")}
        badge={
          byKey.social_media ? (
            <ReadyBadge
              ready={byKey.social_media.ready}
              filled={byKey.social_media.filled}
              total={byKey.social_media.total}
            />
          ) : null
        }
      >
        <div className="space-y-3">
          {form.socialAccounts.map((account, index) => (
            <div
              key={`${account.platform}-${account.username}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3"
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
              className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white/80"
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
              className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white/80"
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
      </CollapsibleCard>

      {/* 8. Reverse Image */}
      <CollapsibleCard
        id="image"
        title="Reverse Image Search"
        subtitle="Vier biometrische Referenzansichten"
        open={openCards.image}
        onToggle={() => toggle("image")}
        badge={
          byKey.reverse_image_search ? (
            <ReadyBadge
              ready={byKey.reverse_image_search.ready}
              filled={byKey.reverse_image_search.filled}
              total={byKey.reverse_image_search.total}
            />
          ) : null
        }
      >
        <ReferenceImageSlots
          images={form.images}
          uploadingType={uploadingType}
          onSelect={(type, file) => void uploadImage(type, file)}
          onDelete={(type) => void deleteImage(type)}
        />
        <div className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
                HANDY-UPLOAD
              </p>
              <p className="mt-2 text-sm text-white/55">
                QR-Code scannen und Referenzbilder direkt mit dem Handy
                aufnehmen.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={mobileLoading}
              onClick={() => void startMobileUpload()}
            >
              {mobileLoading
                ? "QR wird erzeugt…"
                : mobileSession
                  ? "Neuen QR-Code erzeugen"
                  : "QR-Code für Handy"}
            </Button>
          </div>
          {mobileSession ? (
            <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mobileSession.qrDataUrl}
                alt="QR-Code für Handy-Upload"
                width={168}
                height={168}
                className="rounded-xl border border-white/10 bg-white p-2"
              />
              <div className="space-y-2 text-xs text-white/40">
                <p>
                  Gültig bis{" "}
                  <span className="text-white/60">
                    {mobileSession.expiresAt}
                  </span>
                </p>
                <button
                  type="button"
                  className="text-cyber-cyan/70 hover:text-cyber-cyan"
                  onClick={() => void refreshImages()}
                >
                  Jetzt aktualisieren
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleCard>

      {/* 9. Deep / Full checklist */}
      <CollapsibleCard
        id="deep"
        title="Weitere Analysearten"
        subtitle="Personensuche · Deep Intelligence · Komplettanalyse"
        open={openCards.deep}
        onToggle={() => toggle("deep")}
      >
        <ul className="space-y-2">
          {readiness
            .filter((r) =>
              [
                "person_search",
                "deep_intelligence",
                "full_identity_analysis",
              ].includes(r.key)
            )
            .map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm text-white/75">{item.label}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-white/30">
                    {item.ready
                      ? "Alle Signale vorhanden"
                      : `Fehlt: ${item.missing.join(", ")}`}
                  </p>
                </div>
                <ReadyBadge
                  ready={item.ready}
                  filled={item.filled}
                  total={item.total}
                />
              </li>
            ))}
        </ul>
      </CollapsibleCard>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-200/80"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-xs text-emerald-100/75"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
            Speichern…
          </span>
        ) : (
          "Cyber-Identity speichern"
        )}
      </Button>
    </form>
  );
}
