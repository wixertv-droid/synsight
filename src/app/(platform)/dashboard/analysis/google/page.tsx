import { Suspense } from "react";
import GoogleAnalysisPageClient from "@/components/analysis/google/GoogleAnalysisPageClient";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { getIdentityForUser } from "@/lib/services/identity-service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Google Intelligence Report — SynSight",
  description:
    "Professionelle Google-Präsenz-Analyse im SOC-Stil — Scan, Risiko und Handlungsempfehlungen.",
};

export default async function GoogleAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = Number.parseInt(user.id, 10);
  let subjectName = "Unbekannt";
  let initialReport = null;

  try {
    const identity = Number.isFinite(userId)
      ? await getIdentityForUser(userId)
      : null;
    subjectName = resolveSubjectName(identity);
  } catch (error) {
    console.error("[GoogleAnalysisPage] identity failed", error);
  }

  try {
    const raw = Number.isFinite(userId)
      ? await getIntelligenceReport(userId, "google_search")
      : null;
    initialReport = raw ? normalizeIntelligenceReport(raw) : null;
  } catch (error) {
    console.error("[GoogleAnalysisPage] report failed", error);
    initialReport = null;
  }

  let safeReport = initialReport;
  try {
    safeReport = initialReport
      ? (JSON.parse(JSON.stringify(initialReport)) as typeof initialReport)
      : null;
  } catch {
    safeReport = null;
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Google Intelligence wird geladen…
        </div>
      }
    >
      <GoogleAnalysisPageClient
        subjectName={subjectName}
        initialReport={safeReport}
      />
    </Suspense>
  );
}
