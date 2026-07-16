import type { Metadata } from "next";
import LoginCard from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "Login — SynSight Sicherheitszentrale",
  description: "Sicherer Zugang zu Ihrer SynSight Sicherheitszentrale.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.registered === "1"
      ? "Konto erstellt. Sie können sich jetzt anmelden."
      : null;

  return <LoginCard mode="login" notice={notice} />;
}
