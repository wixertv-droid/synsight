import type { Metadata } from "next";
import AnalysisCenter from "@/components/dashboard/analysis/AnalysisCenter";

export const metadata: Metadata = {
  title: "Analyse Center — SynSight Command Center",
  description:
    "Alle SynSight Analysen mit klaren Preisen: Google, E-Mail, Social Media, Bilder, Deep Intelligence und mehr.",
};

export default function DashboardAnalysisPage() {
  return <AnalysisCenter />;
}
