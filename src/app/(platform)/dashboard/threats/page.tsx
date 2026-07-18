import type { Metadata } from "next";
import ThreatsCenter from "@/components/dashboard/threats/ThreatsCenter";

export const metadata: Metadata = {
  title: "Bedrohungen — SynSight Command Center",
  description:
    "Bedrohungen und Schutzmaßnahmen für Ihre digitale Identität im SynSight Command Center.",
};

export default function DashboardThreatsPage() {
  return <ThreatsCenter />;
}
