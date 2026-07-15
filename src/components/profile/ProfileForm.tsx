"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { demoUser } from "@/lib/platform-data";

export default function ProfileForm() {
  const [saved, setSaved] = useState(false);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="glass hardware-panel rounded-[1.4rem] p-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cyber-blue/20 bg-gradient-to-br from-cyber-blue/20 to-cyber-cyan/[0.06] text-2xl font-light text-cyan-100">
          AM
        </div>
        <h2 className="mt-6 text-xl font-medium text-white/85">
          {demoUser.firstName} {demoUser.lastName}
        </h2>
        <p className="mt-2 text-xs text-white/28">{demoUser.email}</p>
        <div className="mt-6 rounded-xl border border-cyber-blue/12 bg-cyber-blue/[0.025] p-4">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
            AKTIVER PLAN
          </p>
          <p className="mt-2 text-sm text-white/65">{demoUser.plan}</p>
          <p className="mt-1 text-[9px] text-white/22">
            Monitoring und Berichte aktiv
          </p>
        </div>
        <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5 font-mono text-[8px] tracking-[.11em] text-white/20">
          <p>PROFILE ID / SYS-4827-A</p>
          <p>REGION / EU-CENTRAL</p>
          <p>CREATED / JUL 2026</p>
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
          <FormField label="Vorname" name="firstName" defaultValue={demoUser.firstName} />
          <FormField label="Nachname" name="lastName" defaultValue={demoUser.lastName} />
          <FormField label="E-Mail" name="email" type="email" defaultValue={demoUser.email} />
          <FormField label="Telefon" hint="OPTIONAL" name="phone" placeholder="+49 ..." />
          <FormField label="Unternehmen" hint="OPTIONAL" name="company" placeholder="Unternehmen" />
          <FormField label="Region" name="region" defaultValue="Deutschland" />
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <p className={`text-[10px] transition-opacity ${saved ? "text-emerald-200/60 opacity-100" : "opacity-0"}`}>
            Änderungen lokal gespeichert.
          </p>
          <Button type="submit">Profil speichern</Button>
        </div>
      </section>
    </form>
  );
}
