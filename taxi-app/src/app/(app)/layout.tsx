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
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { parseQuizConfig } from "@/lib/quiz-config";
import { publishedWhere } from "@/server/questions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  if (user.role === "STUDENT" && !user.onboardedAt) redirect("/willkommen");
  const [unseen, due, lastRow] = await Promise.all([
    getUnseenAchievements(user.id),
    prisma.reviewItem.count({ where: { userId: user.id, dueDate: { lte: dayKeyToDate(dayKey()) }, question: publishedWhere } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { lastQuizConfig: true } }),
  ]);
  return (
    <QueryProvider>
    <CoachProvider enabled={coachConfigured()}>
    <AppShell user={{ name: user.name, email: user.email, role: user.role, isGuest: user.isGuest, avatar: avatarEmoji(user.avatar) }} disclaimer={settings.disclaimer} quiz={{ due, last: parseQuizConfig(lastRow?.lastQuizConfig ?? null) }}>
      <ThemeSync uid={user.id} theme={user.theme} mode={user.themeMode} helperLang={user.helperLang} />
      {children}
      {unseen.length > 0 && <CelebrationGate items={unseen} />}
    </AppShell>
    </CoachProvider>
    </QueryProvider>
  );
}
