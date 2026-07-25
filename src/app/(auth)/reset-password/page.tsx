import type { Metadata } from "next";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen — SynSight",
  description: "Legen Sie ein neues Passwort für Ihr SynSight-Konto fest.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordCard token={params.token} />;
}
