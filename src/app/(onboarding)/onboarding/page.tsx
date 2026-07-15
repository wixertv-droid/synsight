import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { getCurrentUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  return <OnboardingFlow displayName={user?.displayName} />;
}
