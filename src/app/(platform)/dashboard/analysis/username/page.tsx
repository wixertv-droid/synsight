import { Suspense } from "react";
import UsernamePageClient from "@/components/analysis/username/UsernamePageClient";
import { isGoogleSearchConfigured } from "@/lib/analysis/google/custom-search";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { getUsernameModuleSettings } from "@/lib/analysis/username/settings";
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
  title: "Username Intelligence Scan — SynSight",
  description:
    "Öffentliche Profile und Communities zu Benutzernamen mit Identity Confidence.",
};

export default async function UsernameAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let moduleActive = false;
  try {
    const catalog = await getPublicPricingCatalog();
    moduleActive = isAnalysisKeyActive(
      extractActiveAnalysisKeys(catalog.analyses),
      "username_intelligence"
    );
  } catch (error) {
    console.error("[UsernamePage] catalog check failed", error);
  }
  if (!moduleActive) redirect("/dashboard/analysis");

  const userId = Number.parseInt(user.id, 10);
  let subjectName = "Unbekannt";
  let apiAvailable = false;
  let hasUsername = false;

  try {
    const identity = Number.isFinite(userId)
      ? await getIdentityForUser(userId)
      : null;
    subjectName = resolveSubjectName(identity);
    hasUsername = Boolean(
      identity &&
      (identity.aliases.publicAlias ||
        identity.aliases.usernames.length > 0 ||
        identity.aliases.gamingNames.length > 0 ||
        identity.socialAccounts.some((a) => a.username))
    );
  } catch (error) {
    console.error("[UsernamePage] identity failed", error);
  }

  try {
    const settings = await getUsernameModuleSettings();
    const serpOk = await isGoogleSearchConfigured();
    apiAvailable = settings.isActive && settings.apiEnabled && serpOk;
  } catch (error) {
    console.error("[UsernamePage] availability check failed", error);
    apiAvailable = false;
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Username Intelligence Scan wird geladen…
        </div>
      }
    >
      <UsernamePageClient
        subjectName={subjectName}
        apiAvailable={apiAvailable}
        hasUsername={hasUsername}
      />
    </Suspense>
  );
}
