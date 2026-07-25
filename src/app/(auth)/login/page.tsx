import type { Metadata } from "next";
import LoginCard from "@/components/auth/LoginCard";
import { safeInternalRedirect } from "@/lib/security/safe-redirect";

export const metadata: Metadata = {
  title: "Login — SynSight Sicherheitszentrale",
  description: "Sicherer Zugang zu Ihrer SynSight Sicherheitszentrale.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string;
    reset?: string;
    from?: string;
  }>;
}) {
  const params = await searchParams;
  const notice =
    params.reset === "1"
      ? "Passwort aktualisiert. Sie können sich jetzt anmelden."
      : params.registered === "1"
        ? "Konto erstellt. Sie können sich jetzt anmelden."
        : null;

  return (
    <LoginCard
      mode="login"
      notice={notice}
      from={safeInternalRedirect(params.from)}
    />
  );
}
