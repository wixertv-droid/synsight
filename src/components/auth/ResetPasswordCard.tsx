"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import StatusDot from "@/components/ui/StatusDot";
import { guidance } from "@/lib/content/guidance";
import type { ApiResponseBody } from "@/lib/api/response";
import { passwordResetSchema } from "@/lib/validation/auth";

interface ResetPasswordCardProps {
  token?: string;
}

interface ResetPasswordData {
  message: string;
  redirectTo: string;
}

export default function ResetPasswordCard({ token }: ResetPasswordCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strengthChecks = [
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = strengthChecks.filter(Boolean).length;
  const strengthLabel = [
    "Sehr schwach",
    "Schwach",
    "Solide",
    "Stark",
    "Sehr stark",
  ][strength];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage(
        "Der Link ist ungültig. Bitte fordern Sie eine neue E-Mail an."
      );
      return;
    }

    const parsed = passwordResetSchema.safeParse({
      token,
      password,
      passwordConfirm,
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result =
        (await response.json()) as ApiResponseBody<ResetPasswordData>;

      if (!response.ok || !result.success) {
        setErrorMessage(
          !result.success
            ? result.error.message
            : "Die Anfrage konnte nicht verarbeitet werden."
        );
        setSubmitting(false);
        return;
      }

      setSuccessMessage(result.data.message);
      setSubmitting(false);
      window.setTimeout(() => {
        router.push(result.data.redirectTo);
        router.refresh();
      }, 1200);
    } catch {
      setErrorMessage(
        "Verbindung zum Server nicht möglich. Bitte versuchen Sie es erneut."
      );
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className="auth-card glass-strong hardware-panel w-full max-w-[470px] rounded-[1.5rem] border border-amber-300/15 p-8 text-center shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
        <p className="font-mono text-[8px] tracking-[.18em] text-amber-200/55">
          LINK UNGÜLTIG
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white">
          Reset-Link fehlt
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
          Dieser Link ist unvollständig. Fordern Sie eine neue E-Mail zum
          Zurücksetzen an.
        </p>
        <Link
          href="/forgot-password"
          className="mt-8 inline-flex rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14]"
        >
          Neue E-Mail anfordern
        </Link>
      </section>
    );
  }

  if (successMessage) {
    return (
      <section className="auth-card glass-strong hardware-panel w-full max-w-[470px] rounded-[1.5rem] border border-emerald-300/15 p-8 text-center shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.06] text-xl text-emerald-200">
          ✓
        </span>
        <p className="mt-7 font-mono text-[8px] tracking-[.18em] text-emerald-200/55">
          PASSWORT AKTUALISIERT
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white">
          Passwort geändert
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
          {successMessage}
        </p>
        <Link
          href="/login?reset=1"
          className="mt-8 inline-flex rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14]"
        >
          Zum Login
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card glass-strong hardware-panel relative w-full max-w-[470px] overflow-hidden rounded-[1.5rem] border border-white/[0.1] p-6 shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          <StatusDot pulse />
          NEW PASSWORD
        </div>
        <span className="font-mono text-[8px] tracking-[.14em] text-white/18">
          TLS 1.3 / EU
        </span>
      </div>

      <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        Neues Passwort
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300/50">
        Wählen Sie ein neues Passwort für Ihr SynSight-Konto.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField
          label="Neues Passwort"
          hint="MIN. 12 ZEICHEN"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          minLength={12}
          info={guidance.auth.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div aria-live="polite">
          <div className="mb-2 flex items-center justify-between font-mono text-[8px] tracking-[.12em]">
            <span className="text-white/25">PASSWORTSTÄRKE</span>
            <span className="text-cyber-cyan/65">{strengthLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={`h-1 rounded-full transition-colors ${
                  strength >= level
                    ? "bg-gradient-to-r from-cyber-blue to-cyber-cyan"
                    : "bg-white/[0.06]"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/25">
            12+ Zeichen, Groß-/Kleinbuchstaben, Zahl und Sonderzeichen.
          </p>
        </div>

        <FormField
          label="Passwort wiederholen"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          minLength={12}
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          hint={
            passwordConfirm.length > 0
              ? password === passwordConfirm
                ? "STIMMT ÜBEREIN"
                : "STIMMT NICHT ÜBEREIN"
              : undefined
          }
          required
        />

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-200/80"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80"
                aria-hidden
              />
              Wird gespeichert…
            </span>
          ) : (
            "Passwort speichern"
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-white/[0.06] pt-6 text-center text-xs text-white/35">
        Link abgelaufen?{" "}
        <Link
          href="/forgot-password"
          className="ml-1 text-cyber-blue/80 transition-colors hover:text-cyber-cyan"
        >
          Neu anfordern
        </Link>
      </div>
    </section>
  );
}
