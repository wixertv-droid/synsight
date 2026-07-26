import type { Metadata } from "next";
import ThreatsCenter from "@/components/dashboard/threats/ThreatsCenter";
import { getThreatsSummaryView } from "@/lib/services/threats-summary-service";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Bedrohungen — SynSight Command Center",
  description:
    "Bedrohungen und Schutzmaßnahmen für Ihre digitale Identität im SynSight Command Center.",
};

export default async function DashboardThreatsPage() {
  try {
    const user = await getCurrentUser();
    const userId = user ? Number(user.id) : 0;

    if (!user || !Number.isFinite(userId) || userId <= 0) {
      return <ThreatsCenter threats={[]} />;
    }

    const view = await getThreatsSummaryView(userId);

    return (
      <ThreatsCenter
        threats={view.threats}
        needsGeneration={view.needsGeneration}
        initialSummary={
          view.summary
            ? {
                summaryText: view.summary.summaryText,
                status: view.summary.status,
                generatedAt: view.summary.generatedAt,
                threatCount: view.summary.threatCount,
                modules: view.summary.modules,
              }
            : null
        }
      />
    );
  } catch (error) {
    console.error("[Threats page] render failed", error);
    return <ThreatsCenter threats={[]} />;
  }
}
