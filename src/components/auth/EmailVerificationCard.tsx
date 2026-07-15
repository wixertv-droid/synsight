"use client";

import { useEffect, useState } from "react";
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
      ? "Bestätigungslink wird sicher geprüft ..."
      : "Öffnen Sie den Link in Ihrer Bestätigungs-E-Mail."
  );

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
        }>;
        if (!active) return;
        if (!response.ok || !body.success) {
          setStatus("failed");
          setMessage(
            !body.success
              ? body.error.message
              : "Der Link konnte nicht bestätigt werden."
          );
          return;
        }
        router.replace(body.data.redirectTo);
      })
      .catch(() => {
        if (active) {
          setStatus("failed");
          setMessage("Die sichere Verbindung konnte nicht hergestellt werden.");
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
      <p className="hud-label">Identity Verification</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
        E-Mail bestätigen.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300/55">
        Erst nach der Bestätigung wird Ihr Konto aktiviert. So verhindern wir,
        dass fremde Personen Ihre Adresse für ein Analyseprofil verwenden.
      </p>

      <div
        className="mt-8 rounded-xl border border-cyber-blue/15 bg-cyber-blue/[0.04] p-5"
        role="status"
        aria-live="polite"
      >
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
          VERIFICATION STATUS
        </p>
        <p className="mt-3 text-sm text-white/65">{message}</p>
        {email && (
          <p className="mt-2 break-all font-mono text-[9px] text-white/28">
            {email}
          </p>
        )}
      </div>

      {status !== "verifying" && email && (
        <Button className="mt-7 w-full" onClick={resend}>
          Bestätigung erneut senden
        </Button>
      )}
      {status === "failed" && (
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => router.push("/verification-expired")}
        >
          Hilfe zur Bestätigung
        </Button>
      )}
    </section>
  );
}
