"use client";

import { useEffect, useState } from "react";

export default function AdminUserProfilePanel({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/profile`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setProfile(body.data.profile);
      })
      .catch(() => undefined);
  }, [userId]);

  if (!profile) {
    return <p className="text-sm text-white/40">Profil wird geladen…</p>;
  }

  const user = profile.user as Record<string, unknown>;
  const identity = profile.identity as Record<string, unknown> | null;
  const credits = profile.credits as Record<string, unknown>;
  const timeline = profile.timeline as Array<{
    id: string;
    at: string;
    label: string;
    kind: string;
  }>;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Name", `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()],
            ["E-Mail", user.email],
            ["Status", user.status],
            ["SynCredits", credits.balance],
          ] as Array<[string, unknown]>
        ).map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-xl border border-white/[0.07] p-4"
          >
            <p className="font-mono text-[8px] text-white/30">{label}</p>
            <p className="mt-2 text-white/75">{String(value ?? "—")}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-white/[0.07] p-4">
        <h2 className="text-sm font-medium text-white/80">Identitätsprofil</h2>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-white/50">
          {JSON.stringify(identity, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border border-white/[0.07] p-4">
        <h2 className="text-sm font-medium text-white/80">Analyseergebnisse</h2>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-white/50">
          {JSON.stringify(profile.analyses, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border border-white/[0.07] p-4">
        <h2 className="text-sm font-medium text-white/80">Änderungsverlauf</h2>
        <ul className="mt-3 space-y-2">
          {timeline?.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-white/[0.05] px-3 py-2 text-[12px] text-white/50"
            >
              <span className="font-mono text-[9px] text-cyber-cyan/50">
                {entry.kind.toUpperCase()}
              </span>{" "}
              {entry.label} —{" "}
              {new Intl.DateTimeFormat("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.at))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
