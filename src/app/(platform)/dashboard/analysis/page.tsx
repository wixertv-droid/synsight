import type { Metadata } from "next";
import AnalysisCenter from "@/components/dashboard/analysis/AnalysisCenter";

export const metadata: Metadata = {
  title: "Analyse Center — SynSight Command Center",
  description:
    "Professionelle Übersicht der SynSight Analyse-Module für Ihre digitale Identität.",
};

export default function DashboardAnalysisPage() {
  return <AnalysisCenter />;
}
