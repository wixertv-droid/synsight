import type { Metadata } from "next";
import LoginCard from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "Registrierung — SynSight",
  description: "Erstellen Sie Ihr persönliches SynSight Sicherheitsprofil.",
};

export default function RegisterPage() {
  return <LoginCard mode="register" />;
}
