"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import StatusDot from "@/components/ui/StatusDot";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import type { ApiResponseBody } from "@/lib/api/response";

interface LoginCardProps {
  mode?: "login" | "register";
}

interface AuthRedirectData {
  redirectTo: string;
}

export default function LoginCard({ mode = "login" }: LoginCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    if (isRegister) {
      const parsed = registerSchema.safeParse({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
        monitoringOptIn: false,
      });

      if (!parsed.success) {
        setErrorMessage(
          parsed.error.issues[0]?.message ??
            "Bitte überprüfen Sie Ihre Eingaben."
        );
        return;
      }

      await submit(endpoint, parsed.data, "/verify-email");
      return;
    }

    const parsed = loginSchema.safeParse({
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Eingaben."
      );
      return;
    }

    await submit(endpoint, parsed.data, "/dashboard");
  };

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

  const submit = async (
    endpoint: string,
    payload: Record<string, unknown>,
    fallbackRedirect: string
  ) => {
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result =
        (await response.json()) as ApiResponseBody<AuthRedirectData>;

      if (!response.ok || !result.success) {
        setErrorMessage(
          !result.success
            ? result.error.message
            : "Die Anfrage konnte nicht verarbeitet werden."
        );
        setSubmitting(false);
        return;
      }

      router.push(result.data.redirectTo ?? fallbackRedirect);
      router.refresh();
    } catch {
      setErrorMessage(
        "Verbindung zum Server nicht möglich. Bitte versuchen Sie es erneut."
      );
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card glass-strong hardware-panel relative w-full max-w-[470px] overflow-hidden rounded-[1.5rem] border border-white/[0.1] p-6 shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          <StatusDot pulse />
          {isRegister ? "NEW ACCOUNT" : "SECURE ACCESS"}
        </div>
        <span className="font-mono text-[8px] tracking-[.14em] text-white/18">
          TLS 1.3 / EU
        </span>
      </div>

      <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        {isRegister ? "Konto erstellen" : "Willkommen zurück"}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300/50">
        {isRegister
          ? "Registrieren Sie sich mit Ihrer E-Mail-Adresse. Eine Anmeldung ist erst nach der E-Mail-Bestätigung möglich."
          : "Melden Sie sich mit Ihrer bestätigten E-Mail-Adresse und Ihrem Passwort an."}
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

        {isRegister ? (
          <FormField
            label="E-Mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@unternehmen.de"
            required
          />
        ) : (
          <FormField
            label="E-Mail"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="name@unternehmen.de"
            info="Verwenden Sie die E-Mail-Adresse, mit der Sie sich registriert haben."
            required
          />
        )}

        <FormField
          label="Passwort"
          hint={isRegister ? "MIN. 12 ZEICHEN" : "SICHERER ZUGANG"}
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder="••••••••••••"
          minLength={isRegister ? 12 : undefined}
          value={isRegister ? password : undefined}
          onChange={
            isRegister ? (event) => setPassword(event.target.value) : undefined
          }
          required
        />

        {isRegister && (
          <>
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
          </>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-200/80"
          >
            {errorMessage}
          </p>
        )}

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
              {isRegister ? "Konto wird erstellt…" : "Anmeldung läuft…"}
            </span>
          ) : isRegister ? (
            "Konto erstellen"
          ) : (
            "Anmelden"
          )}
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
        ARGON2ID · SIGNED SESSION · PRIVACY BY DESIGN
      </p>
    </section>
  );
}
