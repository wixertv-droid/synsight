import type { Metadata } from "next";
import { Suspense } from "react";
import ResultsCenter from "@/components/dashboard/results/ResultsCenter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ergebnis Center — SynSight Command Center",
  description:
    "Vollständige Beispiel-Reports zu allen SynSight Analysen: Funde, Risiko und Empfehlungen — verständlich erklärt.",
};

function ResultsFallback() {
  return (
    <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
      Ergebnis Center wird geladen…
    </div>
  );
}

export default function DashboardResultsPage() {
  return (
    <Suspense fallback={<ResultsFallback />}>
      <ResultsCenter />
    </Suspense>
  );
}
