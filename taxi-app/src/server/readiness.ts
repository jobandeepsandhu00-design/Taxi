import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dateToDayKey, dayKey, dayKeyToDate } from "@/lib/dates";
import { computeReadinessV2, type ReadinessResult } from "@/lib/readiness";
import { publishedWhere } from "./questions";

/** Prüfungsreife frisch berechnen. */
export async function computeUserReadiness(userId: string): Promise<ReadinessResult> {
  const [categories, totals, items, recent, exams, progress] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.question.groupBy({ by: ["categoryId"], where: publishedWhere, _count: { _all: true } }),
    prisma.reviewItem.findMany({ where: { userId, question: publishedWhere }, select: { box: true, question: { select: { categoryId: true } } } }),
    prisma.userAnswer.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { isCorrect: true } }),
    prisma.examAttempt.findMany({ where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] } }, orderBy: { startedAt: "desc" }, take: 3, select: { scorePercent: true } }),
    prisma.userProgress.findMany({ where: { userId }, select: { categoryId: true, answeredCount: true, correctCount: true } }),
  ]);
  const totalMap = new Map(totals.map((t) => [t.categoryId, t._count._all]));
  const progMap = new Map(progress.map((p) => [p.categoryId, p]));
  const seenBy = new Map<string, number>();
  const masteredBy = new Map<string, number>();
  for (const it of items) {
    const c = it.question.categoryId;
    seenBy.set(c, (seenBy.get(c) ?? 0) + 1);
    if (it.box >= 4) masteredBy.set(c, (masteredBy.get(c) ?? 0) + 1);
  }
  return computeReadinessV2({
    totalQuestions: totals.reduce((s, t) => s + t._count._all, 0),
    seen: items.length,
    mastered: items.filter((i) => i.box >= 4).length,
    recentCorrect: recent.filter((r) => r.isCorrect).length,
    recentTotal: recent.length,
    examScores: exams.map((e) => e.scorePercent ?? 0),
    categories: categories.map((c) => ({
      ...c,
      total: totalMap.get(c.id) ?? 0,
      seen: seenBy.get(c.id) ?? 0,
      mastered: masteredBy.get(c.id) ?? 0,
      answered: progMap.get(c.id)?.answeredCount ?? 0,
      correct: progMap.get(c.id)?.correctCount ?? 0,
    })),
  });
}

/** Neu berechnen und als heutigen Stand speichern (nach jeder Sitzung). */
export async function refreshReadiness(userId: string): Promise<ReadinessResult> {
  const r = await computeUserReadiness(userId);
  const day = dayKeyToDate(dayKey());
  await prisma.readinessSnapshot.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, score: r.score, data: r as unknown as object },
    update: { score: r.score, data: r as unknown as object },
  });
  return r;
}

/** Gecachter Stand; neu berechnet, wenn seit dem letzten Stand geantwortet wurde. */
export async function getReadiness(userId: string): Promise<ReadinessResult> {
  const day = dayKeyToDate(dayKey());
  const [snap, last] = await Promise.all([
    prisma.readinessSnapshot.findUnique({ where: { userId_day: { userId, day } } }),
    prisma.userAnswer.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  if (snap && (!last || last.createdAt <= snap.updatedAt)) return snap.data as unknown as ReadinessResult;
  return refreshReadiness(userId);
}

export async function readinessTrend(userId: string, days = 14): Promise<{ day: string; score: number }[]> {
  const since = dayKeyToDate(addDays(dayKey(), -(days - 1)));
  const rows = await prisma.readinessSnapshot.findMany({ where: { userId, day: { gte: since } }, orderBy: { day: "asc" }, select: { day: true, score: true } });
  return rows.map((r) => ({ day: dateToDayKey(r.day), score: r.score }));
}
