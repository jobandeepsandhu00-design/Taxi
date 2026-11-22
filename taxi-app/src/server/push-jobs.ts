import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate, diffDays, dateToDayKey } from "@/lib/dates";
import { EXAM_COUNTDOWN_DAYS, localParts, reminderDue, toMinutes } from "@/lib/push/schedule";
import { composeText, defaultPrefs, pushConfigured, sendToUser } from "@/lib/push/send";
import { getDueReviewCount } from "@/server/gamification";
import { getLernbuchOverview } from "@/server/lernbuch";
import { getReadiness } from "@/server/readiness";

type JobResult = { job: string; checked: number; sent: number; skipped: number };

/** Nutzer mit mindestens einem aktiven Gerät, inkl. Einstellungen. */
async function pushUsers(extra: object = {}) {
  const users = await prisma.user.findMany({
    where: { isActive: true, pushSubscriptions: { some: { active: true } }, ...extra },
    select: { id: true, targetExamDate: true, notificationPrefs: true, streak: { select: { currentStreak: true, lastActiveDate: true } } },
    take: 5000,
  });
  return users.map((u) => ({ ...u, prefs: u.notificationPrefs ?? defaultPrefs(u.id) }));
}

function count(results: { status: string }[], job: string, checked: number): JobResult {
  return { job, checked, sent: results.filter((r) => r.status === "sent").length, skipped: results.filter((r) => r.status !== "sent").length };
}

/** Alle 15 Minuten: tägliche Erinnerung zur gewählten Uhrzeit (nur wenn heute noch nicht gelernt). */
export async function runDailyReminders(now = new Date()): Promise<JobResult> {
  const users = (await pushUsers()).filter((u) => u.prefs.enabled && u.prefs.dailyReminder && reminderDue(u.prefs.reminderTime, localParts(now, u.prefs.timezone).minutes));
  const today = dayKey(now);
  const results = [];
  for (const u of users) {
    if (u.streak?.lastActiveDate && dateToDayKey(u.streak.lastActiveDate) === today) continue;
    const due = await getDueReviewCount(u.id);
    if (due >= 3 && u.prefs.dueAlerts) {
      results.push(await sendToUser(u.id, "due", { ...(await composeText(u.id, "due", { n: due })), url: "/ueben/wiederholung", actions: [{ action: "open", title: "Jetzt üben" }, { action: "later", title: "Später" }], badgeCount: due }, { now }));
      continue;
    }
    const lb = await getLernbuchOverview(u.id).catch(() => null);
    const cur = lb?.current;
    if (cur && cur.read > 0 && cur.total - cur.read > 0) {
      results.push(await sendToUser(u.id, "lernbuch", { ...(await composeText(u.id, "lernbuch", { chapter: cur.title, left: cur.total - cur.read })), url: `/lernbuch/${cur.topicId}/${cur.slug}`, actions: [{ action: "open", title: "Weiterlesen" }, { action: "later", title: "Später" }] }, { now }));
      continue;
    }
    results.push(await sendToUser(u.id, "daily", { ...(await composeText(u.id, "daily", { n: Math.max(due, 10) })), url: "/quiz/start?type=schriftlich&mode=mini", actions: [{ action: "open", title: "Jetzt üben" }, { action: "later", title: "Später" }], badgeCount: due || undefined }, { now }));
  }
  return count(results, "daily", users.length);
}

/** 19:30: Serie in Gefahr (gestern gelernt, heute noch nicht). */
export async function runStreakCheck(now = new Date()): Promise<JobResult> {
  const yesterday = dayKeyToDate(addDays(dayKey(now), -1));
  const users = (await pushUsers({ streak: { currentStreak: { gt: 0 }, lastActiveDate: yesterday } })).filter((u) => u.prefs.streakAlerts);
  const results = [];
  for (const u of users) {
    const n = u.streak?.currentStreak ?? 1;
    results.push(await sendToUser(u.id, "streak", { ...(await composeText(u.id, "streak", { n })), url: "/quiz/start?type=schriftlich&mode=mini", actions: [{ action: "open", title: "Jetzt üben" }, { action: "later", title: "Später" }] }, { now }));
  }
  return count(results, "streak", users.length);
}

/** 08:30: Prüfungs-Countdown (30/14/7/3/1 Tage) und Daily Challenge. */
export async function runMorning(now = new Date()): Promise<JobResult> {
  const users = await pushUsers();
  const today = dayKey(now);
  const doneToday = new Set((await prisma.dailyChallengeResult.findMany({ where: { day: dayKeyToDate(today), userId: { in: users.map((u) => u.id) } }, select: { userId: true } })).map((r) => r.userId));
  const results = [];
  for (const u of users) {
    if (u.targetExamDate && u.prefs.examCountdown) {
      const days = diffDays(today, dateToDayKey(u.targetExamDate));
      if (EXAM_COUNTDOWN_DAYS.includes(days)) {
        const score = Math.round((await getReadiness(u.id).catch(() => ({ score: 0 }))).score);
        results.push(await sendToUser(u.id, "exam", { ...(await composeText(u.id, "exam", { days, score })), url: "/pruefung" }, { now }));
        continue;
      }
    }
    if (u.prefs.challengeAlerts && !doneToday.has(u.id)) {
      results.push(await sendToUser(u.id, "challenge", { ...(await composeText(u.id, "challenge", {})), url: "/challenge", actions: [{ action: "open", title: "Los geht's" }, { action: "later", title: "Später" }] }, { now }));
    }
  }
  return count(results, "morning", users.length);
}

/** Sonntag 18:00: Wochenbericht. */
export async function runWeekly(now = new Date()): Promise<JobResult> {
  const users = (await pushUsers()).filter((u) => u.prefs.weeklyReport);
  const since = new Date(now.getTime() - 7 * 86400_000);
  const stats = await prisma.userAnswer.groupBy({ by: ["userId", "isCorrect"], where: { userId: { in: users.map((u) => u.id) }, createdAt: { gte: since } }, _count: { _all: true } });
  const results = [];
  for (const u of users) {
    const mine = stats.filter((s) => s.userId === u.id);
    const total = mine.reduce((a, s) => a + s._count._all, 0);
    if (total < 5) continue;
    const accuracy = Math.round((100 * mine.filter((s) => s.isCorrect).reduce((a, s) => a + s._count._all, 0)) / total);
    results.push(await sendToUser(u.id, "weekly", { ...(await composeText(u.id, "weekly", { accuracy })), url: "/coach" }, { now }));
  }
  return count(results, "weekly", users.length);
}

/** Wählt die Jobs, die im aktuellen 15-Minuten-Fenster (Wiener Zeit) fällig sind. */
export function jobsForWindow(now: Date): ("daily" | "streak" | "morning" | "weekly")[] {
  const { minutes, weekday } = localParts(now, "Europe/Vienna");
  const at = (hm: string) => {
    const d = (minutes - toMinutes(hm) + 1440) % 1440;
    return d < 15;
  };
  const jobs: ("daily" | "streak" | "morning" | "weekly")[] = ["daily"];
  if (at("19:30")) jobs.push("streak");
  if (at("08:30")) jobs.push("morning");
  if (weekday === 0 && at("18:00")) jobs.push("weekly");
  return jobs;
}

export async function runJob(job: string, now = new Date()): Promise<JobResult | { job: string; error: string }> {
  if (!pushConfigured()) return { job, error: "Push nicht eingerichtet" };
  switch (job) {
    case "daily":
      return runDailyReminders(now);
    case "streak":
      return runStreakCheck(now);
    case "morning":
      return runMorning(now);
    case "weekly":
      return runWeekly(now);
    default:
      return { job, error: "Unbekannter Job" };
  }
}

/** Sofort: jemand ist deinem Duell beigetreten (zählt nicht zum Tageslimit). */
export async function notifyDuel(hostId: string, guestName: string, code: string) {
  if (!pushConfigured()) return;
  await sendToUser(hostId, "duel", { ...(await composeText(hostId, "duel", { name: guestName })), url: `/duell/${code}`, tag: `tp-duel-${code}` }).catch(() => undefined);
}
