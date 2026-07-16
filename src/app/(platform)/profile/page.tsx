import type { Metadata } from "next";
import IdentityProfilePanel from "@/components/profile/IdentityProfilePanel";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories";
import { getIdentityForUser } from "@/lib/services/identity-service";

export const metadata: Metadata = {
  title: "Mein Identitätsprofil — SynSight",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = Number(user.id);
  await getProfileRepository().ensureDraft(userId, {
    firstName: user.displayName.split(" ")[0] || "User",
    lastName: user.displayName.split(" ").slice(1).join(" ") || "Account",
  });

  const identity = await getIdentityForUser(userId);
  if (!identity) return null;

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-8">
        <span className="hud-label">Konto / Identität</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
          Mein Identitätsprofil
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/30">
          Ergänzen Sie freiwillig Angaben zu Ihrer digitalen Identität. Es gibt
          keinen Zwang — Sie können jederzeit speichern und später fortfahren.
        </p>
      </div>
      <IdentityProfilePanel initial={identity} />
    </main>
  );
}
