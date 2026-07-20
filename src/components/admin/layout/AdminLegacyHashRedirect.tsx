"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HASH_REDIRECTS: Record<string, string> = {
  "pricing-management": "/admin/marketing/preise",
  "promotions-management": "/admin/marketing/promotionen",
  "admin-communications": "/admin/support/nachrichten",
};

export default function AdminLegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && HASH_REDIRECTS[hash]) {
      router.replace(HASH_REDIRECTS[hash]);
    }
  }, [router]);

  return null;
}
