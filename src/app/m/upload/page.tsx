import type { Metadata } from "next";
import MobileImageUploadClient from "@/components/profile/MobileImageUploadClient";

export const metadata: Metadata = {
  title: "Handy-Upload — SynSight",
  description: "Referenzbilder sicher per Handy hochladen.",
  robots: { index: false, follow: false },
};

export default async function MobileUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  return <MobileImageUploadClient token={params.t ?? ""} />;
}
