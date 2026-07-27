import { Suspense } from "react";
import ReverseImagePageClient from "@/components/analysis/reverse-image/ReverseImagePageClient";
import { isReverseImageConfigured } from "@/lib/analysis/reverse-image/run-analysis";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import {
  extractActiveAnalysisKeys,
  isAnalysisKeyActive,
} from "@/lib/credits/resolve-active-analyses";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reverse Image Search — SynSight",
  description: "Visuelle Bildsuche über Google Index mit InsightFace-Abgleich.",
};

export default async function ReverseImageAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let moduleActive = false;
  try {
    const catalog = await getPublicPricingCatalog();
    moduleActive = isAnalysisKeyActive(
      extractActiveAnalysisKeys(catalog.analyses),
      "reverse_image_search"
    );
  } catch (error) {
    console.error("[ReverseImagePage] catalog check failed", error);
  }
  if (!moduleActive) redirect("/dashboard/analysis");

  const userId = Number.parseInt(user.id, 10);
  let subjectName = "Unbekannt";
  let referenceImageCount = 0;
  let apiAvailable = false;

  try {
    const identity = Number.isFinite(userId)
      ? await getIdentityForUser(userId)
      : null;
    subjectName = resolveSubjectName(identity);
    referenceImageCount = identity?.images?.length ?? 0;
  } catch (error) {
    console.error("[ReverseImagePage] identity failed", error);
  }

  try {
    apiAvailable = await isReverseImageConfigured();
  } catch (error) {
    apiAvailable = false;
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Reverse Image Search wird geladen…
        </div>
      }
    >
      <ReverseImagePageClient
        subjectName={subjectName}
        apiAvailable={apiAvailable}
        referenceImageCount={referenceImageCount}
      />
    </Suspense>
  );
}
