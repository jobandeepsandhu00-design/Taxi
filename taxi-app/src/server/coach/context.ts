import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dateToDayKey, dayKey, dayKeyToDate, diffDays } from "@/lib/dates";
import { dailyGoalQuestions, levelFor } from "@/lib/gamification";
import { prognose, type Prognosis } from "@/lib/prognosis";
import { publishedWhere } from "@/server/questions";
import { getDashboardStats } from "@/server/stats";

export interface CoachContext {
  name: string;
  examType: string | null;
  examDate: string | null;
  daysToExam: number | null;
  dailyGoalQuestions: number;
  streak: number;
  level: string;
  xp: number;
  todayAnswered: number;
  avgTimeSec30: number | null;
  categories: { name: string; slug: string; answered30: number; accuracy30: number | null; masteredPct: number }[];
  weakestTopics: { name: string; category: string; answered30: number; accuracy30: number }[];
  mostMissed: { id: string; text: string; category: string; wrongCount: number }[];
  leitner: { box1: number; box2: number; box3: number; box4: number; box5: number; dueToday: number };
  openMistakes: number;
  prognosis: Prognosis;
  /** Lernbuch: gelesen/gesamt, bestandene Kapitel-Checks, aktuelles Kapitel, fällige „Nochmal“-Karten */
  lernbuch?: { read: number; total: number; checksPassed: number; chaptersDone: number; currentChapter: string | null; dueAgain: number; notYetRead: string[] };
}

type CatRow = { category_id: string; answered: number; correct: number; avg_time_sec: number | null };
type TopicRow = { topic_id: string; answered: number; correct: number };

/** Kompakter Lernstand für den Coach (nie der volle Verlauf). */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const today = dayKey();
  const since7 = dayKeyToDate(addDays(today, -7));
  const since14 = dayKeyToDate(addDays(today, -14));
  const [user, stats, catRows, topicRows, categories, topics, mistakes, boxes, due, last14, acc7, accPrev7] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, isGuest: true, examType: true, targetExamDate: true, dailyGoalMinutes: true, xp: true } }),
    getDashboardStats(userId),
    prisma.$queryRaw<CatRow[]>`SELECT category_id, answered, correct, avg_time_sec FROM "user_stats_category_30d" WHERE user_id = ${userId}`,
    prisma.$queryRaw<TopicRow[]>`SELECT topic_id, answered, correct FROM "user_stats_topic_30d" WHERE user_id = ${userId}`,
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, questions: { where: publishedWhere, select: { id: true } } } }),
    prisma.topic.findMany({ select: { id: true, name: true, category: { select: { name: true } } } }),
    prisma.mistakeEntry.findMany({
      where: { userId, resolved: false, question: publishedWhere },
      orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
      take: 5,
      select: { wrongCount: true, question: { select: { id: true, text: true, category: { select: { name: true } } } } },
    }),
    prisma.reviewItem.groupBy({ by: ["box"], where: { userId }, _count: { _all: true } }),
    prisma.reviewItem.count({ where: { userId, dueDate: { lte: dayKeyToDate(today) }, question: publishedWhere } }),
    prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: since14 } }, select: { questionId: true, isCorrect: true, createdAt: true } }),
    prisma.userAnswer.aggregate({ where: { userId, createdAt: { gte: since7 } }, _count: { _all: true } }),
    prisma.userAnswer.aggregate({ where: { userId, createdAt: { gte: since14, lt: since7 } }, _count: { _all: true } }),
  ]);
  const progress = await prisma.userProgress.findMany({ where: { userId }, select: { categoryId: true, masteredCount: true } });

  const correct7 = last14.filter((a) => a.createdAt >= since7 && a.isCorrect).length;
  const correctPrev = last14.filter((a) => a.createdAt < since7 && a.isCorrect).length;
  // Neu gemeistert in 14 Tagen: richtige Antworten auf Fragen, die vorher nie richtig waren (Näherung über erste richtige Antwort im Zeitraum)
  const firstCorrect = new Set(last14.filter((a) => a.isCorrect).map((a) => a.questionId));
  const masteredBefore = firstCorrect.size
    ? await prisma.userAnswer.groupBy({ by: ["questionId"], where: { userId, isCorrect: true, createdAt: { lt: since14 }, questionId: { in: [...firstCorrect] } } })
    : [];
  const newlyMastered14 = firstCorrect.size - masteredBefore.length;

  const totalAnswered30 = catRows.reduce((s, r) => s + r.answered, 0);
  const totalCorrect30 = catRows.reduce((s, r) => s + r.correct, 0);
  const avgTime = totalAnswered30 ? Math.round(catRows.reduce((s, r) => s + (r.avg_time_sec ?? 0) * r.answered, 0) / totalAnswered30) : null;
  const examDate = user.targetExamDate ? dateToDayKey(user.targetExamDate) : null;
  const box = (n: number) => boxes.find((b) => b.box === n)?._count._all ?? 0;

  const prognosis = prognose({
    today,
    mastered: stats.mastered,
    totalQuestions: stats.totalPublished,
    accuracy30: totalAnswered30 ? totalCorrect30 / totalAnswered30 : 0,
    accuracyLast7: acc7._count._all ? correct7 / acc7._count._all : null,
    accuracyPrev7: accPrev7._count._all ? correctPrev / accPrev7._count._all : null,
    newlyMastered14,
    answered14: last14.length,
    examDate,
  });

  return {
    name: user.isGuest ? "Gast" : user.name.split(" ")[0],
    examType: user.examType,
    examDate,
    daysToExam: examDate ? diffDays(today, examDate) : null,
    dailyGoalQuestions: dailyGoalQuestions(user.dailyGoalMinutes),
    streak: stats.streak,
    level: levelFor(user.xp).name,
    xp: user.xp,
    todayAnswered: stats.todayAnswered,
    avgTimeSec30: avgTime,
    categories: categories.map((c) => {
      const r = catRows.find((x) => x.category_id === c.id);
      const m = progress.find((p) => p.categoryId === c.id)?.masteredCount ?? 0;
      return {
        name: c.name,
        slug: c.slug,
        answered30: r?.answered ?? 0,
        accuracy30: r && r.answered ? Math.round((r.correct / r.answered) * 100) : null,
        masteredPct: c.questions.length ? Math.round((m / c.questions.length) * 100) : 0,
      };
    }),
    weakestTopics: topicRows
      .filter((t) => t.answered >= 3)
      .map((t) => {
        const tp = topics.find((x) => x.id === t.topic_id);
        return { name: tp?.name ?? "?", category: tp?.category.name ?? "?", answered30: t.answered, accuracy30: Math.round((t.correct / t.answered) * 100) };
      })
      .sort((a, b) => a.accuracy30 - b.accuracy30)
      .slice(0, 5),
    mostMissed: mistakes.map((m) => ({ id: m.question.id, text: m.question.text.slice(0, 120), category: m.question.category.name, wrongCount: m.wrongCount })),
    leitner: { box1: box(1), box2: box(2), box3: box(3), box4: box(4), box5: box(5), dueToday: due },
    openMistakes: stats.openMistakes,
    prognosis,
    lernbuch: await lernbuchSummary(userId),
  };
}

async function lernbuchSummary(userId: string): Promise<CoachContext["lernbuch"]> {
  try {
    const { getLernbuchOverview } = await import("@/server/lernbuch");
    const o = await getLernbuchOverview(userId);
    const chapters = o.topics.flatMap((t) => t.chapters);
    return {
      read: o.read,
      total: o.total,
      checksPassed: o.checksPassed,
      chaptersDone: o.chaptersDone,
      currentChapter: o.current?.title ?? null,
      dueAgain: o.dueAgain,
      notYetRead: chapters.filter((c) => c.state === "neu").map((c) => c.title).slice(0, 8),
    };
  } catch {
    return undefined;
  }
}

/** Kompakte JSON-Darstellung für den Prompt. */
export function contextToPrompt(c: CoachContext): string {
  return JSON.stringify(c);
}
