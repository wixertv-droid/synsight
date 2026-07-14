import type { Metadata } from "next";
import ProfileForm from "@/components/profile/ProfileForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Benutzerprofil — SynSight",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-8">
        <span className="hud-label">Konto / Identität</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
          Benutzerprofil
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/30">
          Verwalten Sie die Angaben, die Ihrem Konto und Ihrem persönlichen
          Analyseprofil zugeordnet sind.
        </p>
      </div>
      <ProfileForm user={user} />
    </main>
  );
}
