"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Abmelden"
      title="Abmelden"
      className="text-white/20 transition-colors hover:text-white/60 disabled:opacity-50"
    >
      ↗
    </button>
  );
}
