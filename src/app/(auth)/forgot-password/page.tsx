import type { Metadata } from "next";
import ForgotPasswordCard from "@/components/auth/ForgotPasswordCard";

export const metadata: Metadata = {
  title: "Passwort vergessen — SynSight",
  description: "Setzen Sie Ihr SynSight-Passwort zurück.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />;
}
