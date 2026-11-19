import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { dayKey } from "@/lib/dates";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Willkommen" };

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboardedAt || user.role === "ADMIN") redirect("/dashboard");
  return <OnboardingFlow name={user.isGuest ? null : user.name.split(" ")[0]} today={dayKey()} />;
}
