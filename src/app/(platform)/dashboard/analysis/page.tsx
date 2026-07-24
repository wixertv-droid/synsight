import type { Metadata } from "next";
import AnalysisCenter from "@/components/dashboard/analysis/AnalysisCenter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analyse Center — SynSight Command Center",
  description:
    "Alle SynSight Analysen mit klaren Preisen: Google, Digital Leak & Exposure, Social Media, Bilder und mehr.",
};

export default function DashboardAnalysisPage() {
  return <AnalysisCenter />;
}
