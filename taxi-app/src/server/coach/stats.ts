import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dateToDayKey, dayKey, dayKeyToDate, diffDays } from "@/lib/dates";
import { dailyGoalQuestions, viennaHour } from "@/lib/gamification";
import type { CategoryStat, UserStats } from "@/lib/coach/rules";
import { getLernbuchOverview } from "@/server/lernbuch";
import { publishedWhere } from "@/server/questions";
import { getDashboardStats } from "@/server/stats";

type CatRow = { category_id: string; answered: number; correct: number };

/** Lernstatistik für die Regel-Engine (eine Abfragerunde, keine KI). */
export async function getUserStats(userId: string): Promise<UserStats> {
  const today = dayKey();
  const todayStart = dayKeyToDate(today);
  const since7 = dayKeyToDate(addDays(today, -7));
  const since14 = dayKeyToDate(addDays(today, -14));
  const [user, stats, catRows, categories, progress, last14, due, readinessRows, lessonsToday, oral7, readToday, lastActivity, lastRead, answeredTotal, lernbuch] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { targetExamDate: true, dailyGoalMinutes: true } }),
    getDashboardStats(userId),
    prisma.$queryRaw<CatRow[]>`SELECT category_id, answered::int AS answered, correct::int AS correct FROM "user_stats_category_30d" WHERE user_id = ${userId}`,
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, _count: { select: { questions: { where: publishedWhere } } } } }),
    prisma.userProgress.findMany({ where: { userId }, select: { categoryId: true, masteredCount: true } }),
    prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: since14 } }, select: { isCorrect: true, createdAt: true, question: { select: { categoryId: true } } } }),
    prisma.reviewItem.count({ where: { userId, dueDate: { lte: todayStart }, question: publishedWhere } }),
    prisma.readinessSnapshot.findMany({ where: { userId, day: { gte: dayKeyToDate(addDays(today, -8)) } }, orderBy: { day: "asc" }, select: { day: true, score: true } }),
    prisma.lesson.count({ where: { userId, completedAt: { gte: todayStart } } }),
    prisma.oralAttempt.count({ where: { userId, createdAt: { gte: since7 } } }),
    prisma.readProgress.count({ where: { userId, updatedAt: { gte: todayStart } } }),
    prisma.dailyActivity.findFirst({ where: { userId, questionsAnswered: { gt: 0 } }, orderBy: { date: "desc" }, select: { date: true } }),
    prisma.readProgress.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.userAnswer.count({ where: { userId } }),
    getLernbuchOverview(userId),
  ]);

  const a7 = last14.filter((a) => a.createdAt >= since7);
  const p7 = last14.filter((a) => a.createdAt < since7);
  const pct = (list: { isCorrect: boolean }[]) => (list.length ? Math.round((list.filter((x) => x.isCorrect).length / list.length) * 100) : null);

  const cats: CategoryStat[] = categories.map((c) => {
    const r = catRows.find((x) => x.category_id === c.id);
    const w = a7.filter((a) => a.question.categoryId === c.id);
    const mastered = progress.find((p) => p.categoryId === c.id)?.masteredCount ?? 0;
    const total = c._count.questions;
    return {
      slug: c.slug,
      name: c.name,
      total,
      attempts7: w.length,
      accuracy7: pct(w),
      attempts30: r?.answered ?? 0,
      accuracy30: r && r.answered ? Math.round((r.correct / r.answered) * 100) : null,
      masteredPct: total ? Math.min(100, Math.round((mastered / total) * 100)) : 0,
    };
  });

  const todaySnap = readinessRows.find((r) => dateToDayKey(r.day) === today) ?? readinessRows[readinessRows.length - 1];
  const weekAgoKey = addDays(today, -7);
  const weekAgo = [...readinessRows].reverse().find((r) => dateToDayKey(r.day) <= weekAgoKey) ?? null;

  const chapters = lernbuch.topics.flatMap((t) => t.chapters).sort((x, y) => x.order - y.order);
  const nextUnread = lernbuch.current ?? null;
  const readyForCheck = chapters.find((c) => c.state === "gelesen") ?? null;
  const href = (c: { topicId: string; slug: string }) => `/lernbuch/${c.topicId}/${c.slug}`;

  const days = [lastActivity ? dateToDayKey(lastActivity.date) : null, lastRead ? dayKey(lastRead.updatedAt) : null].filter(Boolean) as string[];
  const lastActiveDay = days.sort().pop() ?? null;
  const examDate = user.targetExamDate ? dateToDayKey(user.targetExamDate) : null;

  return {
    today,
    hour: viennaHour(),
    dueCount: due,
    streak: stats.streak,
    activeToday: stats.todayAnswered > 0 || readToday > 0,
    todayAnswered: stats.todayAnswered,
    dailyGoal: dailyGoalQuestions(user.dailyGoalMinutes),
    examDate,
    daysToExam: examDate ? diffDays(today, examDate) : null,
    readiness: todaySnap?.score ?? null,
    readinessWeekAgo: weekAgo && weekAgo !== todaySnap ? weekAgo.score : null,
    accuracy7: pct(a7),
    accuracyPrev7: pct(p7),
    answered7: a7.length,
    answeredPrev7: p7.length,
    answeredTotal,
    categories: cats,
    openMistakes: stats.openMistakes,
    unmastered: Math.max(0, stats.totalPublished - stats.mastered),
    lessonsToday,
    oralAttempts7: oral7,
    lernbuch: {
      read: lernbuch.read,
      total: lernbuch.total,
      dueAgain: lernbuch.dueAgain,
      checksPassed: lernbuch.checksPassed,
      nextUnread: nextUnread ? { title: nextUnread.title, href: href(nextUnread) } : null,
      readyForCheck: readyForCheck ? { title: readyForCheck.title, href: href(readyForCheck) } : null,
    },
    lastActiveDay,
  };
}

/** Prüfungsreife der letzten 14 Tage (für Prognose/Trend). */
export async function readinessHistory(userId: string): Promise<{ day: string; score: number }[]> {
  const rows = await prisma.readinessSnapshot.findMany({ where: { userId, day: { gte: dayKeyToDate(addDays(dayKey(), -13)) } }, orderBy: { day: "asc" }, select: { day: true, score: true } });
  return rows.map((r) => ({ day: dateToDayKey(r.day), score: r.score }));
}
