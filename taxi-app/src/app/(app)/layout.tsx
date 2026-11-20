import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { avatarEmoji } from "@/lib/avatars";
import { CoachProvider } from "@/components/coach/coach-provider";
import { coachConfigured } from "@/server/coach/llm";
import { CelebrationGate } from "@/components/gamification/celebration-gate";
import { getUnseenAchievements } from "@/server/gamification";
import { ThemeSync } from "@/components/theme/theme-sync";
import { QueryProvider } from "@/components/query-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  if (user.role === "STUDENT" && !user.onboardedAt) redirect("/willkommen");
  const unseen = await getUnseenAchievements(user.id);
  return (
    <QueryProvider>
    <CoachProvider enabled={coachConfigured()}>
    <AppShell user={{ name: user.name, email: user.email, role: user.role, isGuest: user.isGuest, avatar: avatarEmoji(user.avatar) }} disclaimer={settings.disclaimer}>
      <ThemeSync uid={user.id} theme={user.theme} mode={user.themeMode} helperLang={user.helperLang} />
      {children}
      {unseen.length > 0 && <CelebrationGate items={unseen} />}
    </AppShell>
    </CoachProvider>
    </QueryProvider>
  );
}
