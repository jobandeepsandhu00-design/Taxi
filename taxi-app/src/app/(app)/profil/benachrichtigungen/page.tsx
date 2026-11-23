import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrefs, vapidPublicKey } from "@/lib/push/send";
import { NotificationSettings } from "./notification-settings";

export const metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const [prefs, devices] = await Promise.all([
    getPrefs(user.id),
    prisma.pushSubscription.findMany({ where: { userId: user.id, active: true }, orderBy: { createdAt: "desc" }, select: { id: true, endpoint: true, platform: true, userAgent: true, createdAt: true, lastSuccessAt: true } }),
  ]);
  const p = { enabled: prefs.enabled, dailyReminder: prefs.dailyReminder, reminderTime: prefs.reminderTime, streakAlerts: prefs.streakAlerts, dueAlerts: prefs.dueAlerts, challengeAlerts: prefs.challengeAlerts, duelAlerts: prefs.duelAlerts, examCountdown: prefs.examCountdown, weeklyReport: prefs.weeklyReport, storyAlerts: prefs.storyAlerts, quietStart: prefs.quietStart, quietEnd: prefs.quietEnd, timezone: prefs.timezone };
  return (
    <div className="mx-auto max-w-xl space-y-4 pb-6">
      <Link href="/profil" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Profil
      </Link>
      <h1 className="font-display text-2xl font-extrabold text-navy">Benachrichtigungen</h1>
      <NotificationSettings
        vapidKey={vapidPublicKey()}
        initial={p}
        devices={devices.map((d) => ({ id: d.id, endpoint: d.endpoint, platform: d.platform, userAgent: d.userAgent, createdAt: d.createdAt.toISOString(), lastSuccessAt: d.lastSuccessAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
