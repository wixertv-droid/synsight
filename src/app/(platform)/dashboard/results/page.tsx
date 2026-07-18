import type { Metadata } from "next";
import ResultsCenter from "@/components/dashboard/results/ResultsCenter";

export const metadata: Metadata = {
  title: "Ergebnis Center — SynSight Command Center",
  description:
    "Analyse-Ergebnisse, Risiko Bewertung und Empfehlungen in der SynSight Zentrale.",
};

export default function DashboardResultsPage() {
  return <ResultsCenter />;
}
