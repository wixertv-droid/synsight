import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { robotsPrivate } from "@/lib/seo/index-policy";

export const metadata: Metadata = {
  title: "Konto",
  robots: robotsPrivate,
  alternates: { canonical: undefined },
};

export default function AuthenticationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
