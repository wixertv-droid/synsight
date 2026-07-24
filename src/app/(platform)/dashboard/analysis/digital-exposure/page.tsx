import { Suspense } from "react";
import DigitalExposurePageClient from "@/components/analysis/digital-exposure/DigitalExposurePageClient";
import { isHibpConfiguredAndActive } from "@/lib/analysis/digital-exposure/hibp-client";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Digital Leak & Exposure Scan — SynSight",
  description:
    "Prüfung öffentlich bekannter Datenlecks anhand E-Mail und Telefon.",
};

export default async function DigitalExposureAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = Number.parseInt(user.id, 10);
  const identity = Number.isFinite(userId)
    ? await getIdentityForUser(userId)
    : null;
  const subjectName = resolveSubjectName(identity);
  const apiAvailable = await isHibpConfiguredAndActive();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Digital Leak & Exposure Scan wird geladen…
        </div>
      }
    >
      <DigitalExposurePageClient
        subjectName={subjectName}
        apiAvailable={apiAvailable}
      />
    </Suspense>
  );
}
