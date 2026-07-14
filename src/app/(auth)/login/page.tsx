import type { Metadata } from "next";
import LoginCard from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "Login — SynSight Sicherheitszentrale",
  description: "Sicherer Zugang zu Ihrer SynSight Sicherheitszentrale.",
};

export default function LoginPage() {
  return <LoginCard mode="login" />;
}
