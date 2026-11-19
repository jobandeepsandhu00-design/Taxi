import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { CelebrationGate } from "@/components/gamification/celebration-gate";
import { getUnseenAchievements } from "@/server/gamification";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  if (user.role === "STUDENT" && !user.onboardedAt) redirect("/willkommen");
  const unseen = await getUnseenAchievements(user.id);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role, isGuest: user.isGuest }} disclaimer={settings.disclaimer}>
      {children}
      {unseen.length > 0 && <CelebrationGate items={unseen} />}
    </AppShell>
  );
}
