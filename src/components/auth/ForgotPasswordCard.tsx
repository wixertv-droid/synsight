"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import StatusDot from "@/components/ui/StatusDot";
import type { ApiResponseBody } from "@/lib/api/response";
import { passwordResetRequestSchema } from "@/lib/validation/auth";

interface ForgotPasswordData {
  message: string;
  previewToken: string | null;
  deliveryMode?: "provider" | "log-link" | "disabled";
}

export default function ForgotPasswordCard() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewToken(null);

    const formData = new FormData(event.currentTarget);
    const parsed = passwordResetRequestSchema.safeParse({
      email: String(formData.get("email") ?? ""),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ??
          "Bitte prüfen Sie die E-Mail-Adresse."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result =
        (await response.json()) as ApiResponseBody<ForgotPasswordData>;

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
      setPreviewToken(result.data.previewToken);
      setSubmitting(false);
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
          PASSWORD RESET
        </div>
        <span className="font-mono text-[8px] tracking-[.14em] text-white/18">
          TLS 1.3 / EU
        </span>
      </div>

      <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        Passwort vergessen?
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300/50">
        Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, senden wir
        Ihnen einen Link zum Zurücksetzen.
      </p>

      {successMessage ? (
        <div
          className="mt-8 rounded-xl border border-cyber-cyan/25 bg-cyber-cyan/10 px-4 py-4"
          role="status"
        >
          <p className="text-sm leading-relaxed text-cyber-cyan">
            {successMessage}
          </p>
          {previewToken ? (
            <Link
              href={`/reset-password?token=${encodeURIComponent(previewToken)}`}
              className="mt-4 inline-flex text-xs text-cyan-100/80 underline-offset-2 transition hover:text-cyan-100 hover:underline"
            >
              Link öffnen (E-Mail-Modus: Log-Link)
            </Link>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <FormField
            label="E-Mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@unternehmen.de"
            info="Verwenden Sie die E-Mail-Adresse Ihres SynSight-Kontos."
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
                Wird gesendet…
              </span>
            ) : (
              "Link senden"
            )}
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-white/[0.06] pt-6 text-center text-xs text-white/35">
        Zurück zum{" "}
        <Link
          href="/login"
          className="ml-1 text-cyber-blue/80 transition-colors hover:text-cyber-cyan"
        >
          Login
        </Link>
      </div>

      <p className="mt-5 text-center font-mono text-[7px] tracking-[.12em] text-white/15">
        ARGON2ID · SIGNED SESSION · PRIVACY BY DESIGN
      </p>
    </section>
  );
}
