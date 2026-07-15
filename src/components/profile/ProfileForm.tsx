"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { profileSchema } from "@/lib/validation/profile";
import { DEMO_USER } from "@/lib/demo/user";
import { getInitials } from "@/lib/utils/strings";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { ApiResponseBody } from "@/lib/api/response";

interface ProfileFormProps {
  user: AuthenticatedUser | null;
  initialProfile?: {
    firstName: string;
    lastName: string;
    phone: string | null;
    company: string | null;
    region: string;
  } | null;
}

function splitDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export default function ProfileForm({
  user,
  initialProfile = null,
}: ProfileFormProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = user?.displayName ?? DEMO_USER.displayName;
  const email = user?.email || DEMO_USER.email;
  const fromName = splitDisplayName(displayName);
  const firstName = initialProfile?.firstName || fromName.firstName;
  const lastName = initialProfile?.lastName || fromName.lastName;
  const phone = initialProfile?.phone ?? "";
  const company = initialProfile?.company ?? "";
  const region = initialProfile?.region || "EU";

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      company: String(formData.get("company") ?? "") || undefined,
      region: String(formData.get("region") ?? ""),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as ApiResponseBody<{
        updated: boolean;
      }>;
      if (!response.ok || !result.success) {
        setErrorMessage(
          !result.success
            ? result.error.message
            : "Die Änderungen konnten nicht gespeichert werden."
        );
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch {
      setErrorMessage(
        "Die sichere Verbindung konnte nicht hergestellt werden."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="glass hardware-panel rounded-[1.4rem] p-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cyber-blue/20 bg-gradient-to-br from-cyber-blue/20 to-cyber-cyan/[0.06] text-2xl font-light text-cyan-100">
          {getInitials(displayName)}
        </div>
        <h2 className="mt-6 text-xl font-medium text-white/85">
          {displayName}
        </h2>
        <p className="mt-2 text-xs text-white/28">{email}</p>
        <div className="mt-6 rounded-xl border border-cyber-blue/12 bg-cyber-blue/[0.025] p-4">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            AKTIVER PLAN
          </p>
          <p className="mt-2 text-sm text-white/65">{DEMO_USER.plan}</p>
          <p className="mt-1 text-[9px] text-white/22">
            Monitoring und Berichte aktiv
          </p>
        </div>
        <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5 font-mono text-[8px] tracking-[.11em] text-white/20">
          <p>PROFILE ID / {user?.id.toUpperCase() ?? "SYS-4827-A"}</p>
          <p>REGION / EU-CENTRAL</p>
          <p>ROLLE / {user?.role === "admin" ? "ADMIN" : "DEMO"}</p>
        </div>
      </aside>

      <section className="glass-strong hardware-panel rounded-[1.4rem] p-6 md:p-8">
        <div className="border-b border-white/[0.06] pb-6">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
            IDENTITÄTSPROFIL
          </p>
          <p className="mt-2 text-xs text-white/28">
            Angaben für Konto und Analysezuordnung
          </p>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <FormField
            label="Vorname"
            name="firstName"
            defaultValue={firstName}
          />
          <FormField label="Nachname" name="lastName" defaultValue={lastName} />
          <FormField
            label="E-Mail"
            name="email"
            type="email"
            defaultValue={email}
          />
          <FormField
            label="Telefon"
            hint="OPTIONAL"
            name="phone"
            placeholder="+49 ..."
            defaultValue={phone}
          />
          <FormField
            label="Unternehmen"
            hint="OPTIONAL"
            name="company"
            placeholder="Unternehmen"
            defaultValue={company}
          />
          <FormField label="Region" name="region" defaultValue={region} />
        </div>
        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-200/80"
          >
            {errorMessage}
          </p>
        )}
        <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <p
            className={`text-[10px] transition-opacity ${saved ? "text-emerald-200/60 opacity-100" : "opacity-0"}`}
          >
            Änderungen sicher gespeichert.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "Wird sicher gespeichert..." : "Profil speichern"}
          </Button>
        </div>
      </section>
    </form>
  );
}
