import { Suspense } from "react";
import ReverseImagePageClient from "@/components/analysis/reverse-image/ReverseImagePageClient";
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
  title: "Face Identity Verification — SynSight",
  description: "InsightFace-Verifikation auf vorhandenen Bildkandidaten.",
};

export default async function FaceIdentityVerificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let moduleActive = false;
  try {
    const catalog = await getPublicPricingCatalog();
    moduleActive = isAnalysisKeyActive(
      extractActiveAnalysisKeys(catalog.analyses),
      "face_identity_verification"
    );
  } catch (error) {
    console.error("[FaceIdentityVerificationPage] catalog check failed", error);
  }
  if (!moduleActive) redirect("/dashboard/analysis");

  const userId = Number.parseInt(user.id, 10);
  let referenceImageCount = 0;
  try {
    const identity = Number.isFinite(userId)
      ? await getIdentityForUser(userId)
      : null;
    referenceImageCount = identity?.images?.length ?? 0;
  } catch (error) {
    console.error("[FaceIdentityVerificationPage] identity failed", error);
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Face Identity Verification wird geladen…
        </div>
      }
    >
      <ReverseImagePageClient
        subjectName=""
        apiAvailable
        referenceImageCount={referenceImageCount}
        mode="face"
      />
    </Suspense>
  );
}
