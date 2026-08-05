import type { Metadata } from "next";
import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { robotsPrivate } from "@/lib/seo/index-policy";

export const metadata: Metadata = {
  title: "Plattform",
  robots: robotsPrivate,
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
