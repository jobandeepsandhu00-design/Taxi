import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate, lastNDays, dateToDayKey } from "@/lib/dates";
import { effectiveStreak } from "@/lib/quiz-logic";
import { getReadiness } from "./readiness";
import { publishedWhere } from "./questions";

export async function getDashboardStats(userId: string) {
  const today = dayKey();
  const [progress, streak, activity, totalPublished, openMistakes, readiness] = await Promise.all([
    prisma.userProgress.findMany({ where: { userId } }),
    prisma.learningStreak.findUnique({ where: { userId } }),
    prisma.dailyActivity.findMany({ where: { userId } , select: { date: true, secondsStudied: true, questionsAnswered: true, correctAnswers: true } }),
    prisma.question.count({ where: publishedWhere }),
    prisma.mistakeEntry.count({ where: { userId, resolved: false } }),
    getReadiness(userId),
  ]);

  const answered = progress.reduce((s, p) => s + p.answeredCount, 0);
  const correct = progress.reduce((s, p) => s + p.correctCount, 0);
  const incorrect = progress.reduce((s, p) => s + p.incorrectCount, 0);
  const mastered = progress.reduce((s, p) => s + p.masteredCount, 0);
  const totalSeconds = activity.reduce((s, a) => s + a.secondsStudied, 0);
  const todayRow = activity.find((a) => dateToDayKey(a.date) === today);
  const coverage = totalPublished ? Math.min(1, mastered / totalPublished) : 0;

  return {
    answered,
    correct,
    incorrect,
    mastered,
    totalPublished,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    overallProgress: Math.round(coverage * 100),
    streak: effectiveStreak(
      streak
        ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastActiveDayKey: streak.lastActiveDate ? dateToDayKey(streak.lastActiveDate) : null }
        : null,
      today,
    ),
    longestStreak: streak?.longestStreak ?? 0,
    totalSeconds,
    todaySeconds: todayRow?.secondsStudied ?? 0,
    todayAnswered: todayRow?.questionsAnswered ?? 0,
    todayCorrect: todayRow?.correctAnswers ?? 0,
    readiness,
    openMistakes,
  };
}

export async function getCategoryOverview(userId: string) {
  const [categories, counts, progress] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.question.groupBy({ by: ["categoryId"], where: publishedWhere, _count: { _all: true } }),
    prisma.userProgress.findMany({ where: { userId } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const progressMap = new Map(progress.map((p) => [p.categoryId, p]));
  return categories.map((c) => {
    const total = countMap.get(c.id) ?? 0;
    const p = progressMap.get(c.id);
    return {
      ...c,
      questionCount: total,
      answered: p?.answeredCount ?? 0,
      correct: p?.correctCount ?? 0,
      mastered: p?.masteredCount ?? 0,
      progress: total ? Math.min(100, Math.round(((p?.masteredCount ?? 0) / total) * 100)) : 0,
      accuracy: p?.answeredCount ? Math.round((p.correctCount / p.answeredCount) * 100) : null,
    };
  });
}

export async function getAnalytics(userId: string) {
  const days = lastNDays(28);
  const since = dayKeyToDate(days[0]);
  const [activity, categories, exams, answersByWeek] = await Promise.all([
    prisma.dailyActivity.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
    getCategoryOverview(userId),
    prisma.examAttempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
      orderBy: { startedAt: "asc" },
      include: { examConfig: { select: { name: true } } },
    }),
    prisma.$queryRaw<{ week: Date; total: bigint; correct: bigint }[]>`
      SELECT date_trunc('week', "createdAt" AT TIME ZONE 'Europe/Vienna') AS week,
             COUNT(*)::bigint AS total,
             SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END)::bigint AS correct
      FROM "UserAnswer"
      WHERE "userId" = ${userId}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 26`,
  ]);
  const actMap = new Map(activity.map((a) => [dateToDayKey(a.date), a]));
  const daily = days.map((d) => {
    const a = actMap.get(d);
    return {
      day: d,
      minutes: Math.round((a?.secondsStudied ?? 0) / 60),
      answered: a?.questionsAnswered ?? 0,
      correct: a?.correctAnswers ?? 0,
    };
  });
  const weekly = answersByWeek.map((w) => {
    const total = Number(w.total);
    const correct = Number(w.correct);
    return {
      week: w.week.toISOString().slice(0, 10),
      total,
      correct,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    };
  });
  const weakest = categories
    .filter((c) => c.answered >= 3 && c.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 3);
  return { daily, weekly, categories, exams, weakest };
}
