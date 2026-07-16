"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { ApiResponseBody } from "@/lib/api/response";

interface EmailVerificationCardProps {
  email?: string;
  token?: string;
}

export default function EmailVerificationCard({
  email,
  token,
}: EmailVerificationCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "waiting" | "verifying" | "failed" | "resent"
  >(token ? "verifying" : "waiting");
  const [message, setMessage] = useState(
    token
      ? "Bestätigungslink wird geprüft …"
      : "Vielen Dank für Ihre Registrierung. Wir haben Ihnen eine E-Mail mit einem Bestätigungslink gesendet. Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden."
  );
  const [errorKind, setErrorKind] = useState<
    "invalid" | "expired" | "already" | "generic" | null
  >(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponseBody<{
          redirectTo: string;
        }> & { error?: { code?: string; message: string } };
        if (!active) return;
        if (!response.ok || !body.success) {
          setStatus("failed");
          const code = !body.success ? body.error.code : "";
          if (code === "TOKEN_ALREADY_USED") {
            setErrorKind("already");
            setMessage(
              "Dieser Link wurde bereits verwendet. Ihr Konto ist möglicherweise schon bestätigt."
            );
          } else if (code === "TOKEN_EXPIRED") {
            setErrorKind("expired");
            setMessage(
              "Dieser Bestätigungslink ist abgelaufen. Bitte fordern Sie eine neue E-Mail an."
            );
          } else {
            setErrorKind("invalid");
            setMessage(
              !body.success
                ? body.error.message
                : "Der Link ist ungültig oder konnte nicht bestätigt werden."
            );
          }
          return;
        }
        router.replace(body.data.redirectTo);
      })
      .catch(() => {
        if (active) {
          setStatus("failed");
          setErrorKind("generic");
          setMessage("Die Verbindung konnte nicht hergestellt werden.");
        }
      });
    return () => {
      active = false;
    };
  }, [router, token]);

  const resend = async () => {
    if (!email) return;
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await response.json()) as ApiResponseBody<{
      message: string;
      previewToken: string | null;
    }>;
    if (!body.success) {
      setStatus("failed");
      setMessage(body.error.message);
      return;
    }
    setStatus("resent");
    setErrorKind(null);
    setMessage(body.data.message);
    if (body.data.previewToken) {
      window.setTimeout(() => {
        router.replace(
          `/verify-email?token=${encodeURIComponent(body.data.previewToken ?? "")}`
        );
      }, 800);
    }
  };

  return (
    <section className="auth-card glass-strong hardware-panel relative w-full max-w-[520px] rounded-[1.5rem] border border-white/[0.1] p-7 shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
      <p className="hud-label">E-Mail-Bestätigung</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        {status === "failed"
          ? "Bestätigung nicht möglich"
          : status === "verifying"
            ? "E-Mail wird bestätigt…"
            : "Bitte E-Mail bestätigen"}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300/55">
        Ohne bestätigte E-Mail-Adresse ist keine Anmeldung möglich. So bleibt
        Ihr Konto geschützt.
      </p>

      <div
        className="mt-8 rounded-xl border border-cyber-blue/15 bg-cyber-blue/[0.04] p-5"
        role="status"
        aria-live="polite"
      >
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
          STATUS
        </p>
        <p className="mt-3 text-sm text-white/70">{message}</p>
        {email && (
          <p className="mt-2 break-all font-mono text-[9px] text-white/28">
            {email}
          </p>
        )}
        {status === "verifying" && (
          <span
            className="mt-4 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-cyber-cyan"
            aria-hidden
          />
        )}
      </div>

      {status === "waiting" && (
        <Link
          href="/login"
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] px-6 py-3 text-sm text-white/55 transition hover:border-white/[0.14] hover:text-white/80"
        >
          Zum Login
        </Link>
      )}

      {(status === "failed" || status === "resent" || status === "waiting") &&
        email && (
          <Button className="mt-4 w-full" onClick={resend}>
            Neue E-Mail anfordern
          </Button>
        )}

      {status === "failed" && errorKind === "already" && (
        <Link
          href="/login"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14]"
        >
          Zum Login
        </Link>
      )}
    </section>
  );
}
