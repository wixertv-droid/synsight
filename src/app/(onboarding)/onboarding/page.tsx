import { redirect } from "next/navigation";

/** Legacy route — Sprint 5D moved voluntary identity capture to /profile. */
export default function OnboardingPage() {
  redirect("/profile");
}
