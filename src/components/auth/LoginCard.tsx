"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import StatusDot from "@/components/ui/StatusDot";

interface LoginCardProps {
  mode?: "login" | "register";
}

export default function LoginCard({ mode = "login" }: LoginCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [monitoring, setMonitoring] = useState(true);
  const isRegister = mode === "register";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(
      () => router.push(isRegister ? "/onboarding" : "/dashboard"),
      850
    );
  };

  return (
    <section className="auth-card glass-strong hardware-panel relative w-full max-w-[470px] overflow-hidden rounded-[1.5rem] border border-white/[0.1] p-6 shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          <StatusDot pulse />
          {isRegister ? "NEW IDENTITY PROFILE" : "SECURE ACCESS"}
        </div>
        <span className="font-mono text-[8px] tracking-[.14em] text-white/18">
          TLS 1.3 / EU
        </span>
      </div>

      <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        {isRegister ? "Ihre Sicherheit beginnt hier." : "Willkommen zurück"}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300/50">
        {isRegister
          ? "Erstellen Sie Ihre persönliche SynSight Sicherheitszentrale."
          : "Verbinden Sie sich mit Ihrer digitalen Sicherheitszentrale."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {isRegister && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Vorname"
              name="firstName"
              autoComplete="given-name"
              placeholder="Alex"
              required
            />
            <FormField
              label="Nachname"
              name="lastName"
              autoComplete="family-name"
              placeholder="Morgan"
              required
            />
          </div>
        )}
        <FormField
          label="E-Mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@unternehmen.de"
          required
        />
        <FormField
          label="Passwort"
          hint={isRegister ? "MIN. 8 ZEICHEN" : "GESCHÜTZT"}
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder="••••••••••••"
          minLength={8}
          required
        />

        {isRegister && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <input
              type="checkbox"
              checked={monitoring}
              onChange={(event) => setMonitoring(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span>
              <span className="block text-xs text-white/70">
                Digitale Identität überwachen
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/28">
                SynSight darf neue Risikosignale für mein Analyseprofil
                beobachten.
              </span>
            </span>
          </label>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting
            ? "Sichere Verbindung wird aufgebaut..."
            : isRegister
              ? "Konto erstellen"
              : "System starten"}
        </Button>
      </form>

      <div className="mt-6 border-t border-white/[0.06] pt-6 text-center text-xs text-white/35">
        {isRegister ? "Bereits registriert?" : "Noch kein Konto?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="ml-1 text-cyber-blue/80 transition-colors hover:text-cyber-cyan"
        >
          {isRegister ? "Zum Login" : "Registrierung"}
        </Link>
      </div>

      <p className="mt-5 text-center font-mono text-[7px] tracking-[.12em] text-white/15">
        DEMO ACCESS · ECHTE AUTHENTIFIZIERUNG WIRD SPÄTER ANGEBUNDEN
      </p>
    </section>
  );
}
