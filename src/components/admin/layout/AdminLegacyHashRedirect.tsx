"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_LEGACY_HASH_REDIRECTS } from "@/lib/admin/navigation";

export default function AdminLegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && ADMIN_LEGACY_HASH_REDIRECTS[hash]) {
      router.replace(ADMIN_LEGACY_HASH_REDIRECTS[hash]);
    }
  }, [router]);

  return null;
}
