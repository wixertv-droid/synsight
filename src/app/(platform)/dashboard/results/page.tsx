import type { Metadata } from "next";
import ResultsCenter from "@/components/dashboard/results/ResultsCenter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ergebnis Center — SynSight Command Center",
  description:
    "Vollständige Beispiel-Reports zu allen SynSight Analysen: Funde, Risiko und Empfehlungen — verständlich erklärt.",
};

export default function DashboardResultsPage() {
  return <ResultsCenter />;
}
